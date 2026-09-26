"""
RepoMind — FastAPI backend v0.2.0

Routes:
  GET    /health
  POST   /analyze
  GET    /analysis/{repo}/{pr_number}
  GET    /analyses
  GET    /repo/workspace
  GET    /workspaces
  DELETE /workspaces/{repo:path}
  GET    /repo/file-content
  POST   /repo/file-content
  POST   /repo/full-scan
  POST   /ai/generate-code
  POST   /repo/create-pr
  POST   /github-app/simulate-review
  Sub-routers:
    /auth/*    (OAuth authentication)
    /webhook   (GitHub webhook event intake)
"""

import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from backend import database, diff_parser, dependency_finder, github_client, llm_client, github_app
from backend.models import AnalyzeRequest, AnalyzeResponse
from backend.oauth import get_current_token, router as auth_router
from backend.webhook import router as webhook_router

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="RepoMind Backend", version="0.2.0")

_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if _env_origins:
    _origins.extend([o.strip() for o in _env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    print("[startup] RepoMind Database initialised OK")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0", "engine": "RepoMind AST"}


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
      2. github_token field in request body (direct API use)
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


# ---------------------------------------------------------------------------
# Workspace Endpoints
# ---------------------------------------------------------------------------

@app.get("/repo/workspace")
def get_repo_workspace(
    repo: str,
    branch: str = "main",
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Fetch repository metadata, file tree, open PRs, and issues.
    Saves or refreshes the active workspace session in SQLite.
    """
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    parts = repo.strip().split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail="repo must be in 'owner/repo' format")
    owner, repo_name = parts

    try:
        info = github_client.get_repo_info(owner, repo_name, token=token)
        default_branch = info.get("default_branch", branch)
        target_branch = branch if branch != "main" else default_branch

        # Fetch files from GitHub
        files_data = github_client.get_repo_files(owner, repo_name, target_branch, token=token)
        files = [f["path"] for f in files_data]

        # Fetch PRs and issues
        prs = github_client.get_repo_pull_requests(owner, repo_name, token=token)
        issues = github_client.get_repo_issues(owner, repo_name, token=token)

        # Upsert into database
        session = database.upsert_workspace(
            repo=repo,
            branch=target_branch,
            files_count=len(files),
            open_prs_count=len(prs),
            open_issues_count=len(issues),
        )

        return {
            "repo": repo,
            "info": info,
            "files": files,
            "pull_requests": prs,
            "issues": issues,
            "session": session,
        }
    except Exception as e:
        print(f"[workspace] Remote fetch fallback for {repo}: {e}")
        # Local workspace fallback
        local_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        local_files = []
        try:
            for root, dirs, filenames in os.walk(local_root):
                # Skip heavy directories
                dirs[:] = [d for d in dirs if d not in [".git", "node_modules", ".next", ".venv", "__pycache__"]]
                for fn in filenames:
                    rel = os.path.relpath(os.path.join(root, fn), local_root).replace("\\", "/")
                    local_files.append(rel)
        except Exception:
            pass

        session = database.upsert_workspace(
            repo=repo,
            branch=branch,
            files_count=len(local_files),
            open_prs_count=0,
            open_issues_count=0,
        )

        return {
            "repo": repo,
            "info": {
                "name": repo_name,
                "full_name": repo,
                "description": "RepoMind Intelligent Workspace",
                "default_branch": branch,
                "stars": 0,
                "forks": 0,
            },
            "files": local_files or ["backend/main.py", "frontend/lib/api.ts", "README.md"],
            "pull_requests": [],
            "issues": [],
            "session": session,
        }


@app.get("/workspaces")
def list_workspaces():
    """List recent workspace sessions."""
    return database.list_workspaces()


@app.delete("/workspaces/{repo:path}")
def delete_workspace(repo: str):
    """Remove a workspace session."""
    deleted = database.delete_workspace(repo)
    return {"deleted": deleted, "repo": repo}


@app.get("/repo/pulls")
def get_repo_pulls(
    repo: str,
    state: str = "all",
    session_token: Optional[str] = Depends(get_current_token),
):
    """Fetch active and recent pull requests for a repository."""
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    parts = repo.strip().split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail="repo must be in 'owner/repo' format")
    owner, repo_name = parts
    return github_client.get_repo_pull_requests(owner, repo_name, state=state, token=token)


# ---------------------------------------------------------------------------
# File Content (Reading & Saving)
# ---------------------------------------------------------------------------

@app.get("/repo/file-content")
def get_file_content(
    repo: str,
    path: str,
    branch: str = "main",
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Retrieve file content.
    Prioritizes local workspace disk for speed and offline edits,
    falling back to GitHub raw content API.
    """
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    local_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    local_path = os.path.normpath(os.path.join(local_root, path))

    # Security check: prevent directory traversal
    if not local_path.startswith(local_root):
        raise HTTPException(status_code=403, detail="Forbidden file path")

    if os.path.isfile(local_path):
        try:
            with open(local_path, "r", encoding="utf-8", errors="replace") as fh:
                content = fh.read()
            return {
                "repo": repo,
                "path": path,
                "branch": branch,
                "content": content,
                "source": "local",
                "size": len(content),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Fallback to GitHub raw content
    parts = repo.strip().split("/")
    if len(parts) == 2:
        owner, repo_name = parts
        url = f"https://raw.githubusercontent.com/{owner}/{repo_name}/{branch}/{path}"
        try:
            resp = httpx.get(url, headers=github_client._auth_headers(token), timeout=15)
            if resp.status_code == 200:
                return {
                    "repo": repo,
                    "path": path,
                    "branch": branch,
                    "content": resp.text,
                    "source": "github_raw",
                    "size": len(resp.text),
                }
        except Exception:
            pass

    raise HTTPException(status_code=404, detail=f"File not found: {path}")


class SaveFilePayload(BaseModel):
    repo: str
    path: str
    content: str
    branch: str = "main"


@app.post("/repo/file-content")
def save_file_content(payload: SaveFilePayload):
    """Save updated content to local disk."""
    local_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    local_path = os.path.normpath(os.path.join(local_root, payload.path))

    if not local_path.startswith(local_root):
        raise HTTPException(status_code=403, detail="Forbidden file path")

    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "w", encoding="utf-8") as fh:
        fh.write(payload.content)

    return {
        "saved": True,
        "path": payload.path,
        "source": "local",
        "size": len(payload.content),
    }


# ---------------------------------------------------------------------------
# Full Repository Audit & Security Vulnerability Scan
# ---------------------------------------------------------------------------

class FullScanPayload(BaseModel):
    repo: str
    branch: str = "main"


@app.post("/repo/full-scan")
def run_full_scan(
    payload: FullScanPayload,
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Run an end-to-end repository scan detecting security vulnerabilities,
    UI/UX issues, and bugs with synthesized patch branches.
    """
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    result = llm_client.scan_full_repository(
        repo_name=payload.repo,
        branch=payload.branch,
        token=token,
    )
    return result


# ---------------------------------------------------------------------------
# AI Code Generation & Fix Engine
# ---------------------------------------------------------------------------

class GenerateCodePayload(BaseModel):
    file_path: str
    instruction: str
    current_content: Optional[str] = None


@app.post("/ai/generate-code")
def generate_code_endpoint(payload: GenerateCodePayload):
    """
    Synthesize code modifications or fixes based on natural language instructions.
    Returns revised content and unified diff.
    """
    content = payload.current_content or ""
    if not content:
        local_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        local_path = os.path.normpath(os.path.join(local_root, payload.file_path))
        if os.path.isfile(local_path):
            try:
                with open(local_path, "r", encoding="utf-8", errors="replace") as fh:
                    content = fh.read()
            except Exception:
                pass

    result = llm_client.generate_code_fix(
        file_path=payload.file_path,
        current_content=content,
        instruction=payload.instruction,
    )
    return result


# ---------------------------------------------------------------------------
# Pull Request Creation on GitHub
# ---------------------------------------------------------------------------

class CreatePrPayload(BaseModel):
    repo: str
    title: str
    body: str
    branch: str
    base_branch: str = "main"
    files: list[dict] = []


@app.post("/repo/create-pr")
def create_pr_endpoint(
    payload: CreatePrPayload,
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Branch, commit files, push to origin, and open a Pull Request on GitHub.
    Returns the live GitHub PR URL.
    """
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    parts = payload.repo.strip().split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail="repo must be in 'owner/repo' format")
    owner, repo_name = parts

    result = github_client.create_pull_request_on_github(
        owner=owner,
        repo=repo_name,
        title=payload.title,
        body=payload.body,
        head_branch=payload.branch,
        base_branch=payload.base_branch,
        files=payload.files,
        token=token,
    )
    return result


# ---------------------------------------------------------------------------
# GitHub App Autonomous Review Simulation
# ---------------------------------------------------------------------------

class SimulateReviewPayload(BaseModel):
    repo: str
    pr_number: int
    diff: str = ""
    post_to_github: bool = False


@app.post("/github-app/simulate-review")
def simulate_review_endpoint(
    payload: SimulateReviewPayload,
    session_token: Optional[str] = Depends(get_current_token),
):
    """
    Simulate an autonomous GitHub App pull request review comment with
    AST blast radius analysis and risk classification.
    """
    token = session_token or os.getenv("GITHUB_TOKEN", "")
    parts = payload.repo.strip().split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=422, detail="repo must be in 'owner/repo' format")
    owner, repo_name = parts

    raw_diff = payload.diff
    if not raw_diff:
        try:
            raw_diff = github_client.get_pr_diff(owner, repo_name, payload.pr_number, token=token)
        except Exception:
            raw_diff = ""

    changed_files = diff_parser.parse_diff(raw_diff) if raw_diff else []
    symbols = diff_parser.extract_symbols(changed_files)
    analysis = llm_client.analyze(diff_snippet=raw_diff, symbols=symbols, impacted_files=[])

    comment_markdown = github_app.format_pr_comment(
        risk_level=analysis.risk_level,
        summary=analysis.summary,
        changed_symbols=symbols,
        impacted_files=[],
        missing_tests=analysis.missing_tests,
        repo=payload.repo,
        pr_number=payload.pr_number,
    )

    posted = False
    error_msg = None
    if payload.post_to_github and token:
        try:
            github_app.post_pr_comment(owner, repo_name, payload.pr_number, comment_markdown, token)
            posted = True
        except Exception as e:
            error_msg = str(e)

    return {
        "repo": payload.repo,
        "pr_number": payload.pr_number,
        "risk_level": analysis.risk_level,
        "comment_markdown": comment_markdown,
        "dashboard_deep_link": f"/dashboard?repo={payload.repo}&pr={payload.pr_number}",
        "posted": posted,
        "error": error_msg,
    }
