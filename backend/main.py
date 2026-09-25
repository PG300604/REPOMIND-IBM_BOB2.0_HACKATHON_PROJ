"""
PR Risk Radar — FastAPI backend v0.2.0

Routes:
  GET  /health
  POST /analyze
  GET  /analysis/{repo}/{pr_number}
  GET  /analyses
  GET  /auth/github
  GET  /auth/callback
  GET  /auth/me
  GET  /auth/logout
  POST /webhook
"""

import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from backend import database, diff_parser, dependency_finder, github_client, llm_client
from backend.models import AnalyzeRequest, AnalyzeResponse
from backend.oauth import get_current_token, router as auth_router
from backend.webhook import router as webhook_router

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="PR Risk Radar", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(auth_router)
app.include_router(webhook_router)

# Initialise DB tables on startup
@app.on_event("startup")
def startup():
    database.init_db()
    print("[startup] Database initialised OK")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


# ---------------------------------------------------------------------------
# Analysis endpoint
# ---------------------------------------------------------------------------

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    request: AnalyzeRequest,
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Analyze a GitHub PR for risk, blast radius, and missing tests.

    Token priority:
      1. OAuth session cookie (set by /auth/callback)
      2. github_token field in request body  (legacy / direct API use)
      3. GITHUB_TOKEN env var
      4. Unauthenticated (public repos only)
    """
    token = session_token or request.github_token or os.getenv("GITHUB_TOKEN", "")

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

    raw_diff = request.diff or ""
    repo_files: list[dict] = []

    if not raw_diff:
        try:
            raw_diff = github_client.get_pr_diff(owner, repo_name, pr_number, token)
            base_sha = github_client.get_pr_base_sha(owner, repo_name, pr_number, token)
            repo_files = github_client.get_repo_files(owner, repo_name, base_sha, token)
        except Exception as e:
            err = str(e)
            if "401" in err or "404" in err:
                raise HTTPException(
                    status_code=401,
                    detail={"requires_auth": True, "message": "Authentication required. Connect your GitHub account."},
                )
            raise HTTPException(status_code=502, detail=f"GitHub API error: {e}")

    changed_files = diff_parser.parse_diff(raw_diff)
    symbols = diff_parser.extract_symbols(changed_files)
    changed_paths = {cf.path for cf in changed_files}

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
            print(f"[analyze] dependency scan failed: {e}")

    llm_result = llm_client.analyze(
        diff_snippet=raw_diff,
        symbols=symbols,
        impacted_files=impacted,
    )

    # Persist to DB when we have a real repo+PR
    if owner and repo_name and pr_number:
        try:
            database.save_analysis(
                repo=f"{owner}/{repo_name}",
                pr_number=pr_number,
                risk_level=llm_result.risk_level,
                summary=llm_result.summary,
                impacted_files=impacted,
                missing_tests=llm_result.missing_tests,
                changed_files=sorted(changed_paths),
                changed_symbols=symbols,
                raw_diff=raw_diff,
            )
        except Exception as e:
            print(f"[analyze] DB save failed (non-fatal): {e}")

    return AnalyzeResponse(
        risk_level=llm_result.risk_level,
        summary=llm_result.summary,
        impacted_files=impacted,
        missing_tests=llm_result.missing_tests,
        changed_files=sorted(changed_paths),
        changed_symbols=symbols,
    )


# ---------------------------------------------------------------------------
# Cached analysis retrieval
# ---------------------------------------------------------------------------

@app.get("/analysis/{repo}/{pr_number}")
def get_cached_analysis(repo: str, pr_number: int):
    """Return the most recent cached analysis for a repo+PR, or 404."""
    result = database.get_analysis(repo, pr_number)
    if not result:
        raise HTTPException(status_code=404, detail="No analysis found for this PR.")
    return result


@app.get("/analyses")
def list_recent_analyses(limit: int = 20):
    """Return the most recent analyses (for the history sidebar)."""
    return database.list_analyses(limit=min(limit, 50))
