"""
GitHub App authentication module.

Handles:
  - JWT generation (RS256, signed with the App's private key)
  - Short-lived installation access tokens (cached until near-expiry)
  - Posting PR review comments
  - Formatting the markdown comment body

Required env vars:
  GITHUB_APP_ID          — numeric App ID (shown on the App settings page)
  GITHUB_APP_PRIVATE_KEY — full PEM string (newlines as literal \\n in .env)
"""

import os
import time
import hmac
from datetime import datetime, timezone
from typing import Optional

import httpx
import jwt  # PyJWT

_GH_API = "https://api.github.com"

# In-memory cache: installation_id -> {"token": str, "expires_at": float (unix ts)}
_token_cache: dict[int, dict] = {}


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def _make_jwt() -> str:
    """Create a 9-minute GitHub App JWT signed with the private key."""
    app_id = os.environ.get("GITHUB_APP_ID", "")
    raw_key = os.environ.get("GITHUB_APP_PRIVATE_KEY", "")
    if not app_id or not raw_key:
        raise RuntimeError("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set")

    # .env stores the PEM with literal \n — convert to real newlines
    private_key = raw_key.replace("\\n", "\n")

    now = int(time.time())
    payload = {
        "iat": now - 60,   # issued 60s ago (clock skew tolerance)
        "exp": now + 540,  # valid for 9 minutes
        "iss": str(app_id),
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


# ---------------------------------------------------------------------------
# Installation token
# ---------------------------------------------------------------------------

def get_installation_token(installation_id: int) -> str:
    """
    Return a short-lived installation access token for the given installation.
    Cached in memory; refreshed 60 seconds before expiry.
    """
    cached = _token_cache.get(installation_id)
    if cached and cached["expires_at"] > time.time() + 60:
        return cached["token"]

    jwt_token = _make_jwt()
    url = f"{_GH_API}/app/installations/{installation_id}/access_tokens"
    resp = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    token = data["token"]
    # expires_at is ISO8601, e.g. "2024-01-01T12:00:00Z"
    try:
        expires_dt = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        expires_unix = expires_dt.timestamp()
    except Exception:
        expires_unix = time.time() + 3500  # fallback ~1 hour

    _token_cache[installation_id] = {"token": token, "expires_at": expires_unix}
    return token


def get_installation_token_for_repo(owner: str, repo: str) -> Optional[str]:
    """
    Look up the GitHub App installation for owner/repo and return a short-lived
    installation access token. When comments are posted with this token, GitHub
    attributes them to 'RepoMind[bot]' with the App's verified avatar, NOT a personal account.
    """
    app_id = os.environ.get("GITHUB_APP_ID")
    raw_key = os.environ.get("GITHUB_APP_PRIVATE_KEY")
    if not app_id or not raw_key:
        return None

    try:
        jwt_token = _make_jwt()
        url = f"{_GH_API}/repos/{owner}/{repo}/installation"
        resp = httpx.get(
            url,
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            install_id = resp.json().get("id")
            if install_id:
                return get_installation_token(install_id)
    except Exception as e:
        print(f"[github_app] Failed to resolve installation token for {owner}/{repo}: {e}")
    return None


# ---------------------------------------------------------------------------
# Post PR comment
# ---------------------------------------------------------------------------

def post_pr_comment(owner: str, repo: str, pr_number: int, body: str, token: str) -> None:
    """Post a markdown comment on a pull request."""
    url = f"{_GH_API}/repos/{owner}/{repo}/issues/{pr_number}/comments"
    resp = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json={"body": body},
        timeout=15,
    )
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Comment formatter
# ---------------------------------------------------------------------------

_RISK_EMOJI = {"low": "🟢", "medium": "🟡", "high": "🔴", "unknown": "⚪"}
_RISK_LABEL = {"low": "LOW", "medium": "MEDIUM", "high": "HIGH", "unknown": "UNKNOWN"}


def format_pr_comment(
    risk_level: str,
    summary: str,
    changed_symbols: list[str],
    impacted_files: list[str],
    missing_tests: list[str],
    repo: str = "",
    pr_number: int = 0,
    base_url: str = "",
) -> str:
    """
    Render an autonomous RepoMind GitHub PR code review comment with
    RepoMind bot branding, AST blast radius analysis, actionable AI code fix prompts,
    and direct 1-click deep links into RepoMind Studio.
    """
    from urllib.parse import quote

    if not base_url:
        base_url = os.getenv("APP_BASE_URL", "http://localhost:3000")
    base_url = base_url.rstrip("/")

    risk = risk_level.lower()
    label = _RISK_LABEL.get(risk, "UNKNOWN")
    emoji = _RISK_EMOJI.get(risk, "⚪")

    dashboard_url = f"{base_url}/dashboard"
    if repo and pr_number:
        dashboard_url = f"{base_url}/dashboard?repo={repo}&pr={pr_number}"

    # Pre-craft actionable AI code fix prompts for developer convenience
    sym_sample = ", ".join(changed_symbols[:4]) if changed_symbols else "modified AST symbols"
    prompt_fix1 = f"Refactor modified symbols ({sym_sample}) to introduce strict schema validation, input boundary checks, and prevent downstream regressions in {repo}."
    prompt_fix2 = f"Synthesize regression test suite for PR #{pr_number} covering: {'; '.join(missing_tests[:3]) if missing_tests else 'edge cases and null safety'}."
    prompt_fix3 = f"Run RepoMind Dual-Tier AI Guardian to perform surgical search-and-replace on touched files, ensuring zero truncated placeholders and 100% syntactically verified code."

    link_fix1 = f"{dashboard_url}&action=fix&prompt={quote(prompt_fix1)}"
    link_fix2 = f"{dashboard_url}&action=fix&prompt={quote(prompt_fix2)}"
    link_fix3 = f"{dashboard_url}&action=fix&prompt={quote(prompt_fix3)}"

    lines = [
        "<!-- repomind-autonomous-review -->",
        "| <img src=\"https://raw.githubusercontent.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/main/frontend/public/icon.png\" width=\"42\" height=\"42\" alt=\"RepoMind\" /> | ### **RepoMind** Autonomous Code Reviewer `v0.2.0` |",
        "| :--- | :--- |",
        f"| **Risk Assessment**: {emoji} **`{label} RISK`** | 🚀 **[Open Interactive Diff & Risk Radar in RepoMind Studio ➔]({dashboard_url})** |",
        "",
        "---",
        "",
        "### 📋 Summary & Walkthrough",
        "",
        summary or "_No automated summary generated._",
        "",
        "### 🔍 Code Review & Architectural Impact",
        f"- **Risk Classification**: `{label}` based on symbol mutability and downstream dependencies.",
        f"- **Modified Symbols**: `{len(changed_symbols)}` abstract syntax tree symbols identified.",
        f"- **Blast Radius**: `{len(impacted_files)}` downstream consumer files directly impacted.",
        "",
    ]

    if changed_symbols:
        syms = " ".join(f"`{s}`" for s in changed_symbols[:25])
        lines += [
            "### 🧬 Changed AST Symbols",
            "",
            syms,
            "",
        ]

    lines += ["### 💥 Downstream Blast Radius"]
    if impacted_files:
        if len(impacted_files) <= 10:
            for f in impacted_files:
                lines.append(f"- ⚠️ `{f}` (requires regression verification)")
        else:
            lines += [
                "<details>",
                f"<summary><strong>{len(impacted_files)} dependent files affected (click to expand)</strong></summary>",
                "",
            ]
            for f in impacted_files:
                lines.append(f"- ⚠️ `{f}`")
            lines.append("</details>")
        lines.append("")
    else:
        lines += ["_No dependent files detected in the project tree._", ""]

    if missing_tests:
        lines += [
            "### 🧪 Recommended Missing Test Cases",
            "_RepoMind AI synthesized the following test scenarios to prevent blind merges:_",
            "",
        ]
        for i, test in enumerate(missing_tests, 1):
            lines.append(f"{i}. **{test}**")
        lines.append("")

    # AI Code Fix Prompts Section
    lines += [
        "### ⚡ Actionable AI Code Fix Prompts",
        "> **Run these prompts directly in RepoMind Studio to apply verified AST patches without breaking dependents:**",
        "",
        f"- 🔧 **Fix 1: Safe AST Refactor & Input Boundary Guard**",
        f"  ```text",
        f"  Prompt: \"{prompt_fix1}\"",
        f"  ```",
        f"  👉 **[Apply Fix 1 Automatically in RepoMind Studio ➔]({link_fix1})**",
        "",
        f"- 🧪 **Fix 2: Synthesize Missing Unit & Regression Tests**",
        f"  ```text",
        f"  Prompt: \"{prompt_fix2}\"",
        f"  ```",
        f"  👉 **[Generate & Commit Tests in RepoMind Studio ➔]({link_fix2})**",
        "",
        f"- 🛡️ **Fix 3: Anti-Truncation Code Integrity Patch**",
        f"  ```text",
        f"  Prompt: \"{prompt_fix3}\"",
        f"  ```",
        f"  👉 **[Run Surgical Fix in RepoMind Studio ➔]({link_fix3})**",
        "",
        "---",
        f"👉 **[Launch Full Studio Workspace ({repo or 'RepoMind'})]({dashboard_url})** · _Powered by RepoMind Risk Intelligence Engine_",
    ]

    return "\n".join(lines)
