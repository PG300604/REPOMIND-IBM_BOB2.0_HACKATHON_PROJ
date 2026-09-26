"""
GitHub API client — all network calls to GitHub live here.

Public interface:
  parse_pr_url(ref)                          -> (owner, repo, pr_number)
  get_pr_diff(owner, repo, pr_number, token) -> str   (raw unified diff)
  get_repo_files(owner, repo, ref, token)    -> list[dict]  (tree items)
  fetch_file_content(url, token)             -> str   (decoded file text)
"""

import os
import re
import time
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

# Extensions treated as binary — skipped during dependency scanning
_BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz",
    ".exe", ".dll", ".so", ".dylib", ".class",
    ".pyc", ".pyo",
}

_GH_API = "https://api.github.com"


def _get_git_credential_token() -> str:
    """Retrieve active authenticated GitHub token from local Git Credential Manager if available."""
    import subprocess
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True,
            text=True,
            timeout=5,
        )
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


def _get_token(token: str = "") -> str:
    """Resolve token priority: explicit arg -> GITHUB_TOKEN env -> Git Credential Manager."""
    if token:
        return token
    t = os.getenv("GITHUB_TOKEN", "")
    if t:
        return t
    return _get_git_credential_token()


def _auth_headers(token: str = "") -> dict:
    """Build GitHub API headers. Automatically falls back to env or credential manager token."""
    headers = {"X-GitHub-Api-Version": "2022-11-28"}
    t = _get_token(token)
    if t:
        headers["Authorization"] = f"Bearer {t}"
    return headers


# ---------------------------------------------------------------------------
# URL / reference parsing
# ---------------------------------------------------------------------------

def parse_pr_url(ref: str) -> tuple[str, str, int]:
    """
    Accept any of:
      https://github.com/owner/repo/pull/123
      github.com/owner/repo/pull/123
      owner/repo#123
      owner/repo 123   (space-separated)
    Returns (owner, repo, pr_number).
    Raises ValueError if the format is not recognised.
    """
    ref = ref.strip()

    # Full URL: https://github.com/owner/repo/pull/123
    m = re.match(r"(?:https?://)?github\.com/([^/]+)/([^/]+)/pull/(\d+)", ref)
    if m:
        return m.group(1), m.group(2), int(m.group(3))

    # Shorthand: owner/repo#123
    m = re.match(r"([^/\s]+)/([^#\s]+)#(\d+)$", ref)
    if m:
        return m.group(1), m.group(2), int(m.group(3))

    # Shorthand with space: owner/repo 123
    m = re.match(r"([^/\s]+)/([^/\s]+)\s+(\d+)$", ref)
    if m:
        return m.group(1), m.group(2), int(m.group(3))

    raise ValueError(
        f"Cannot parse PR reference: {ref!r}. "
        "Expected a GitHub PR URL or 'owner/repo#123'."
    )


# ---------------------------------------------------------------------------
# Diff fetching
# ---------------------------------------------------------------------------

def get_pr_diff(owner: str, repo: str, pr_number: int, token: str = "") -> str:
    """Return the raw unified diff for a pull request."""
    url = f"{_GH_API}/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = {
        **_auth_headers(token),
        "Accept": "application/vnd.github.v3.diff",
    }
    resp = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    return resp.text


# ---------------------------------------------------------------------------
# Repo file tree
# ---------------------------------------------------------------------------

def get_repo_files(owner: str, repo: str, ref: str, token: str = "") -> list[dict]:
    """
    Return the recursive file tree of the repo at the given ref (SHA or branch).
    Each item is a dict with at least: path, size, url (blob download URL).
    Binary files (by extension) are filtered out.
    """
    url = f"{_GH_API}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
    resp = httpx.get(url, headers=_auth_headers(token), timeout=30)
    resp.raise_for_status()
    data = resp.json()

    files = []
    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path: str = item.get("path", "")
        ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""
        if ext in _BINARY_EXTS:
            continue
        files.append({
            "path": path,
            "size": item.get("size", 0),
            "url": item.get("url", ""),   # Git blob API URL (base64 content)
        })

    return files


# ---------------------------------------------------------------------------
# File content
# ---------------------------------------------------------------------------

def fetch_file_content(blob_url: str, token: str) -> str:
    """
    Download and decode a single file's text content via the Git Blob API URL
    (as returned by get_repo_files).  Returns empty string on any error.
    """
    import base64

    try:
        resp = httpx.get(blob_url, headers=_auth_headers(token), timeout=20)
        if resp.status_code != 200:
            return ""
        data = resp.json()
        content_b64 = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding != "base64":
            return ""
        # GitHub pads with newlines inside the base64 string
        return base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Convenience: fetch the base SHA of a PR (used to root get_repo_files)
# ---------------------------------------------------------------------------

def get_pr_base_sha(owner: str, repo: str, pr_number: int, token: str = "") -> str:
    """Return the base branch commit SHA for the given PR."""
    url = f"{_GH_API}/repos/{owner}/{repo}/pulls/{pr_number}"
    resp = httpx.get(url, headers=_auth_headers(token), timeout=30)
    resp.raise_for_status()
    return resp.json()["base"]["sha"]


# ---------------------------------------------------------------------------
# Repository Info, Pull Requests & Issues
# ---------------------------------------------------------------------------

def get_repo_info(owner: str, repo: str, token: str = "") -> dict:
    """Return basic metadata for a repository."""
    url = f"{_GH_API}/repos/{owner}/{repo}"
    resp = httpx.get(url, headers=_auth_headers(token), timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return {
        "name": data.get("name", repo),
        "full_name": data.get("full_name", f"{owner}/{repo}"),
        "description": data.get("description") or "",
        "default_branch": data.get("default_branch", "main"),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "open_issues_count": data.get("open_issues_count", 0),
    }


def get_repo_pull_requests(owner: str, repo: str, state: str = "open", token: str = "") -> list[dict]:
    """Fetch recent pull requests for a repository."""
    url = f"{_GH_API}/repos/{owner}/{repo}/pulls?state={state}&per_page=15"
    try:
        resp = httpx.get(url, headers=_auth_headers(token), timeout=20)
        if resp.status_code != 200:
            return []
        data = resp.json()
        prs = []
        for item in data:
            prs.append({
                "number": item.get("number"),
                "title": item.get("title", ""),
                "user": item.get("user", {}).get("login", "unknown"),
                "state": item.get("state", "open"),
                "created_at": item.get("created_at", ""),
                "head_branch": item.get("head", {}).get("ref", ""),
                "base_branch": item.get("base", {}).get("ref", ""),
                "html_url": item.get("html_url", f"https://github.com/{owner}/{repo}/pull/{item.get('number')}"),
            })
        return prs
    except Exception as e:
        print(f"[github_client] Failed to fetch PRs: {e}")
        return []


def get_repo_issues(owner: str, repo: str, state: str = "open", token: str = "") -> list[dict]:
    """Fetch open issues (excluding pull requests) for a repository."""
    url = f"{_GH_API}/repos/{owner}/{repo}/issues?state={state}&per_page=15"
    try:
        resp = httpx.get(url, headers=_auth_headers(token), timeout=20)
        if resp.status_code != 200:
            return []
        data = resp.json()
        issues = []
        for item in data:
            if "pull_request" in item:
                continue
            issues.append({
                "number": item.get("number"),
                "title": item.get("title", ""),
                "user": item.get("user", {}).get("login", "unknown"),
                "state": item.get("state", "open"),
                "comments": item.get("comments", 0),
                "created_at": item.get("created_at", ""),
                "labels": [l.get("name", "") for l in item.get("labels", []) if isinstance(l, dict)],
                "html_url": item.get("html_url", f"https://github.com/{owner}/{repo}/issues/{item.get('number')}"),
            })
        return issues
    except Exception as e:
        print(f"[github_client] Failed to fetch issues: {e}")
        return []


def get_repo_branches(owner: str, repo: str, token: str = "") -> list[str]:
    """Fetch branches list for a repository."""
    url = f"{_GH_API}/repos/{owner}/{repo}/branches?per_page=20"
    try:
        resp = httpx.get(url, headers=_auth_headers(token), timeout=20)
        if resp.status_code != 200:
            return ["main"]
        data = resp.json()
        return [b.get("name") for b in data if isinstance(b, dict) and b.get("name")]
    except Exception:
        return ["main"]


def _try_push_local_git(
    owner: str,
    repo: str,
    head_branch: str,
    base_branch: str,
    files: list[dict],
    title: str,
    body: str,
) -> bool:
    """
    If running inside a local git repository matching owner/repo,
    branch, write files, commit, and push to origin using local git credentials.
    """
    import subprocess
    import os
    try:
        local_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

        # Check if remote origin matches
        remote_url = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            text=True,
            stderr=subprocess.DEVNULL,
            cwd=local_root,
        ).strip()
        if f"{owner}/{repo}".lower() not in remote_url.lower() and repo.lower() not in remote_url.lower():
            return False

        # Get current branch to restore later
        orig_branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
            cwd=local_root,
        ).strip()

        # Checkout or create head_branch
        subprocess.run(
            ["git", "checkout", "-B", head_branch],
            check=True,
            capture_output=True,
            cwd=local_root,
        )

        # Write files to disk on the feature branch
        for f in files:
            p = f.get("path")
            c = f.get("content")
            if p and c is not None:
                full_path = os.path.join(local_root, p)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as fp:
                    fp.write(c)

        # Stage files
        for f in files:
            p = f.get("path")
            if p:
                subprocess.run(
                    ["git", "add", p],
                    check=True,
                    capture_output=True,
                    cwd=local_root,
                )

        # Commit
        subprocess.run(
            ["git", "commit", "-m", f"{title}\n\n{body}"],
            capture_output=True,
            cwd=local_root,
        )

        # Push to origin
        push_res = subprocess.run(
            ["git", "push", "-u", "origin", head_branch, "--force"],
            capture_output=True,
            text=True,
            cwd=local_root,
        )

        # Switch back to original branch
        subprocess.run(
            ["git", "checkout", orig_branch],
            capture_output=True,
            cwd=local_root,
        )

        if push_res.returncode == 0:
            print(f"[git] Pushed branch {head_branch} to origin successfully via local git!")
            return True
        else:
            print(f"[git] Push failed: {push_res.stderr}")
            return False
    except Exception as e:
        print(f"[git] Local git push notice: {e}")
        return False


def create_pull_request_on_github(
    owner: str,
    repo: str,
    title: str,
    body: str,
    head_branch: str,
    base_branch: str = "main",
    files: list[dict] = None,
    token: str = "",
) -> dict:
    """
    Create a new branch, commit file changes, and open a Pull Request.
    1. If running locally, uses authenticated local Git to commit and push branch.
    2. Then uses GitHub REST API with GITHUB_TOKEN to immediately open the Pull Request.
    3. If PR already exists, returns the existing PR.
    4. Fallback generates a properly namespaced GitHub compare URL.
    """
    files = files or []
    import base64
    import urllib.parse

    token = token or os.getenv("GITHUB_TOKEN", "")

    # Sanitize branch name
    clean_branch = re.sub(r"[^a-zA-Z0-9_\-\./]", "-", head_branch).strip("-")
    if not clean_branch:
        clean_branch = f"patch-{int(time.time())}"

    # Best-practice GitHub compare URL with explicit namespace and expand=1
    compare_url = (
        f"https://github.com/{owner}/{repo}/compare/{base_branch}...{owner}:{clean_branch}"
        f"?expand=1&quick_pull=1&title={urllib.parse.quote(title)}&body={urllib.parse.quote(body)}"
    )

    # 1. Try pushing via local git if this workspace matches owner/repo
    local_pushed = _try_push_local_git(
        owner=owner,
        repo=repo,
        head_branch=clean_branch,
        base_branch=base_branch,
        files=files,
        title=title,
        body=body,
    )

    # 2. If local git push failed or wasn't applicable, try pushing via GitHub API
    if not local_pushed and token:
        try:
            # Get base branch SHA
            ref_resp = httpx.get(
                f"{_GH_API}/repos/{owner}/{repo}/git/ref/heads/{base_branch}",
                headers=_auth_headers(token),
                timeout=20,
            )
            base_sha = None
            if ref_resp.status_code == 200:
                base_sha = ref_resp.json()["object"]["sha"]
            else:
                repo_info = httpx.get(f"{_GH_API}/repos/{owner}/{repo}", headers=_auth_headers(token), timeout=15)
                if repo_info.status_code == 200:
                    base_branch = repo_info.json().get("default_branch", "main")
                    ref_resp2 = httpx.get(
                        f"{_GH_API}/repos/{owner}/{repo}/git/ref/heads/{base_branch}",
                        headers=_auth_headers(token),
                        timeout=15,
                    )
                    if ref_resp2.status_code == 200:
                        base_sha = ref_resp2.json()["object"]["sha"]

            if base_sha:
                # Create branch if doesn't exist
                httpx.post(
                    f"{_GH_API}/repos/{owner}/{repo}/git/refs",
                    headers=_auth_headers(token),
                    json={"ref": f"refs/heads/{clean_branch}", "sha": base_sha},
                    timeout=20,
                )

                # Commit files
                for f in files:
                    f_path = f.get("path", "")
                    f_content = f.get("content", "")
                    if not f_path:
                        continue

                    existing_sha = None
                    exist_resp = httpx.get(
                        f"{_GH_API}/repos/{owner}/{repo}/contents/{f_path}?ref={clean_branch}",
                        headers=_auth_headers(token),
                        timeout=15,
                    )
                    if exist_resp.status_code == 200:
                        existing_sha = exist_resp.json().get("sha")

                    commit_payload = {
                        "message": f"fix: {title}",
                        "content": base64.b64encode(f_content.encode("utf-8")).decode("ascii"),
                        "branch": clean_branch,
                    }
                    if existing_sha:
                        commit_payload["sha"] = existing_sha

                    httpx.put(
                        f"{_GH_API}/repos/{owner}/{repo}/contents/{f_path}",
                        headers=_auth_headers(token),
                        json=commit_payload,
                        timeout=20,
                    )
                local_pushed = True
        except Exception as e:
            print(f"[github_client] Direct API commit notice: {e}")

    # 3. If branch was pushed (via local git or API), attempt direct PR creation via API
    if (local_pushed or True) and token:
        try:
            # Check if PR already exists for this branch
            check_url = f"{_GH_API}/repos/{owner}/{repo}/pulls?head={owner}:{clean_branch}&state=all"
            check_resp = httpx.get(check_url, headers=_auth_headers(token), timeout=15)
            if check_resp.status_code == 200 and check_resp.json():
                pr_data = check_resp.json()[0]
                return {
                    "created": True,
                    "pr_url": pr_data.get("html_url"),
                    "pr_number": pr_data.get("number"),
                    "branch": clean_branch,
                    "mode": "api_existing",
                    "message": f"Pull Request #{pr_data.get('number')} already exists for '{clean_branch}' on GitHub."
                }

            # Create new PR
            pr_resp = httpx.post(
                f"{_GH_API}/repos/{owner}/{repo}/pulls",
                headers=_auth_headers(token),
                json={
                    "title": title,
                    "body": body,
                    "head": clean_branch,
                    "base": base_branch,
                },
                timeout=20,
            )
            if pr_resp.status_code in (200, 201):
                pr_data = pr_resp.json()
                return {
                    "created": True,
                    "pr_url": pr_data.get("html_url"),
                    "pr_number": pr_data.get("number"),
                    "branch": clean_branch,
                    "mode": "api",
                    "message": f"Pull Request #{pr_data.get('number')} created successfully on GitHub!"
                }
            elif pr_resp.status_code == 422:
                # PR might exist or branch was just pushed; re-check PR list
                check_resp = httpx.get(
                    f"{_GH_API}/repos/{owner}/{repo}/pulls?head={owner}:{clean_branch}&state=all",
                    headers=_auth_headers(token),
                    timeout=15,
                )
                if check_resp.status_code == 200 and check_resp.json():
                    pr_data = check_resp.json()[0]
                    return {
                        "created": True,
                        "pr_url": pr_data.get("html_url"),
                        "pr_number": pr_data.get("number"),
                        "branch": clean_branch,
                        "mode": "api_existing",
                        "message": f"Pull Request #{pr_data.get('number')} is live on GitHub."
                    }

                # Check if error was due to 0 commit diff between branches
                try:
                    err_json = pr_resp.json()
                    err_msgs = [e.get("message", "") for e in err_json.get("errors", []) if isinstance(e, dict)]
                    err_text = " ".join(err_msgs).lower()
                    if "no commits between" in err_text or "identical" in err_text:
                        return {
                            "created": False,
                            "pr_url": "",
                            "pr_number": None,
                            "branch": clean_branch,
                            "mode": "no_changes",
                            "message": f"No code changes detected between '{base_branch}' and '{clean_branch}'. Edit files or generate an AI fix first so GitHub has commits to review."
                        }
                except Exception:
                    pass
        except Exception as e:
            print(f"[github_client] Direct API PR creation exception: {e}")

    # 4. If local git pushed successfully, return compare URL as fallback
    if local_pushed:
        return {
            "created": True,
            "pr_url": compare_url,
            "pr_number": None,
            "branch": clean_branch,
            "mode": "local_git",
            "message": f"Branch '{clean_branch}' pushed to GitHub! Opening comparison to complete Pull Request."
        }

    # 5. Fallback to GitHub Web Editor if cannot push
    first_file = files[0].get("path", "") if files else ""
    if first_file:
        web_edit_url = f"https://github.com/{owner}/{repo}/edit/{base_branch}/{first_file}"
    else:
        web_edit_url = f"https://github.com/{owner}/{repo}/tree/{base_branch}"

    return {
        "created": False,
        "pr_url": web_edit_url,
        "pr_number": None,
        "branch": clean_branch,
        "mode": "web_editor",
        "message": "Authentication required to push branch directly. Opening GitHub web editor to create PR."
    }


