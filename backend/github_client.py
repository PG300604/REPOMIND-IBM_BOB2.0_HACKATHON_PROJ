"""
GitHub API client — all network calls to GitHub live here.

Public interface:
  parse_pr_url(ref)                          -> (owner, repo, pr_number)
  get_pr_diff(owner, repo, pr_number, token) -> str   (raw unified diff)
  get_repo_files(owner, repo, ref, token)    -> list[dict]  (tree items)
  fetch_file_content(url, token)             -> str   (decoded file text)
"""

import re
from typing import Optional

import httpx

# Extensions treated as binary — skipped during dependency scanning
_BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz",
    ".exe", ".dll", ".so", ".dylib", ".class",
    ".pyc", ".pyo",
}

_GH_API = "https://api.github.com"


def _auth_headers(token: str = "") -> dict:
    """Build GitHub API headers. Omits Authorization if token is empty (public repos)."""
    headers = {"X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
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
