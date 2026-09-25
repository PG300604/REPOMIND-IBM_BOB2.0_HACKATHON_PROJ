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
) -> str:
    """Render a clean GitHub-flavoured markdown PR comment."""
    risk = risk_level.lower()
    emoji = _RISK_EMOJI.get(risk, "⚪")
    label = _RISK_LABEL.get(risk, "UNKNOWN")

    lines = [
        f"## {emoji} PR Risk Radar — **{label}**",
        "",
        "> _Automated analysis by [PR Risk Radar](https://github.com) · AI-powered_",
        "",
        "### 📋 Summary",
        "",
        summary or "_No summary available._",
        "",
    ]

    if changed_symbols:
        syms = " ".join(f"`{s}`" for s in changed_symbols[:20])
        lines += ["### 🔤 Changed Symbols", "", syms, ""]

    if impacted_files:
        lines += ["### 💥 Blast Radius"]
        if len(impacted_files) <= 10:
            for f in impacted_files:
                lines.append(f"- `{f}`")
        else:
            lines += [
                "<details>",
                f"<summary>{len(impacted_files)} files affected (click to expand)</summary>",
                "",
            ]
            for f in impacted_files:
                lines.append(f"- `{f}`")
            lines.append("</details>")
        lines.append("")
    else:
        lines += ["### 💥 Blast Radius", "", "_No dependent files detected._", ""]

    if missing_tests:
        lines += ["### 🧪 Suggested Missing Tests", ""]
        for i, test in enumerate(missing_tests, 1):
            lines.append(f"{i}. {test}")
        lines.append("")

    lines += [
        "---",
        "_Generated by PR Risk Radar · [View full analysis](#)_",
    ]

    return "\n".join(lines)
