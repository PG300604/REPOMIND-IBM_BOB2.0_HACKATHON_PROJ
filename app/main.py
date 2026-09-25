import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse

load_dotenv()

from app import github_client, diff_parser, dependency_finder, llm_client
from app.models import AnalyzeRequest, AnalyzeResponse

app = FastAPI(title="PR Risk Radar", version="0.1.0")

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "index.html"


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Demo UI
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def index():
    return TEMPLATE_PATH.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Main analysis endpoint
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    # --- Resolve GitHub token ---
    token = request.github_token or os.getenv("GITHUB_TOKEN", "")

    # --- Resolve owner/repo/pr_number ---
    owner: str | None = None
    repo_name: str | None = None
    pr_number: int | None = None

    if request.pr_url:
        try:
            owner, repo_name, pr_number = github_client.parse_pr_url(request.pr_url)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    elif request.repo and request.pr_number:
        parts = request.repo.strip().split("/")
        if len(parts) != 2:
            raise HTTPException(status_code=422, detail="repo must be in 'owner/repo' format")
        owner, repo_name = parts
        pr_number = request.pr_number
    elif not request.diff:
        raise HTTPException(
            status_code=422,
            detail="Provide 'pr_url', or 'repo'+'pr_number', or a raw 'diff'.",
        )

    # --- Fetch diff (unless caller supplied it directly) ---
    raw_diff = request.diff or ""
    repo_files: list[dict] = []

    if not raw_diff:
        if not token:
            raise HTTPException(
                status_code=422,
                detail="A GitHub token is required when fetching a PR by URL/number.",
            )
        try:
            raw_diff = github_client.get_pr_diff(owner, repo_name, pr_number, token)
            base_sha = github_client.get_pr_base_sha(owner, repo_name, pr_number, token)
            repo_files = github_client.get_repo_files(owner, repo_name, base_sha, token)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"GitHub API error: {e}")

    # --- Parse diff ---
    changed_files = diff_parser.parse_diff(raw_diff)
    symbols = diff_parser.extract_symbols(changed_files)
    changed_paths = {cf.path for cf in changed_files}

    # --- Find dependents (only if we have repo files) ---
    impacted: list[str] = []
    if repo_files and symbols:
        try:
            impacted = dependency_finder.find_dependents(
                symbols=symbols,
                repo_files=repo_files,
                changed_paths=changed_paths,
                token=token,
            )
        except Exception as e:
            # Non-fatal: degraded mode, just omit impacted files
            print(f"[analyze] dependency scan failed: {e}")

    # --- LLM analysis ---
    llm_result = llm_client.analyze(
        diff_snippet=raw_diff,
        symbols=symbols,
        impacted_files=impacted,
    )

    return AnalyzeResponse(
        risk_level=llm_result.risk_level,
        summary=llm_result.summary,
        impacted_files=impacted,
        missing_tests=llm_result.missing_tests,
        changed_files=sorted(changed_paths),
        changed_symbols=symbols,
    )
