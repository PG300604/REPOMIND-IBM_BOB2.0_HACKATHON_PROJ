"""
GitHub webhook handler.

Listens for:
  - pull_request events (opened, synchronize, reopened) → run analysis + post comment
  - installation events (created, deleted) → upsert/remove installation record

Required env var:
  GITHUB_WEBHOOK_SECRET — the secret set when creating the GitHub App
"""

import hashlib
import hmac
import os

from fastapi import APIRouter, Header, HTTPException, Request

from backend import database, diff_parser, dependency_finder, github_client, llm_client
from backend.github_app import format_pr_comment, get_installation_token, post_pr_comment

router = APIRouter(tags=["webhook"])

_PR_ACTIONS = {"opened", "synchronize", "reopened"}


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------

def _verify_signature(payload_bytes: bytes, sig_header: str | None) -> None:
    """Raise HTTPException 401 if the webhook signature is invalid."""
    secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
    if not secret:
        # If no secret configured, skip verification (dev mode only)
        return

    if not sig_header or not sig_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing webhook signature")

    expected = "sha256=" + hmac.new(
        secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


# ---------------------------------------------------------------------------
# PR event handler
# ---------------------------------------------------------------------------

async def _handle_pr_event(payload: dict) -> None:
    action = payload.get("action", "")
    if action not in _PR_ACTIONS:
        return

    pr        = payload["pull_request"]
    repo_data = payload["repository"]
    owner     = repo_data["owner"]["login"]
    repo_name = repo_data["name"]
    pr_number = pr["number"]
    install_id = payload.get("installation", {}).get("id")

    print(f"[webhook] PR #{pr_number} {action} in {owner}/{repo_name}")

    # Get installation token
    if not install_id:
        print("[webhook] No installation_id in payload — skipping")
        return

    try:
        token = get_installation_token(install_id)
    except Exception as e:
        print(f"[webhook] Failed to get installation token: {e}")
        return

    # Fetch diff + repo files
    try:
        raw_diff = github_client.get_pr_diff(owner, repo_name, pr_number, token)
        base_sha = github_client.get_pr_base_sha(owner, repo_name, pr_number, token)
        repo_files = github_client.get_repo_files(owner, repo_name, base_sha, token)
    except Exception as e:
        print(f"[webhook] GitHub API error: {e}")
        return

    # Run analysis pipeline
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
            print(f"[webhook] Dependency scan failed (non-fatal): {e}")

    llm_result = llm_client.analyze(
        diff_snippet=raw_diff,
        symbols=symbols,
        impacted_files=impacted,
    )

    # Persist to DB
    repo_full = f"{owner}/{repo_name}"
    try:
        database.save_analysis(
            repo=repo_full,
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
        print(f"[webhook] DB save failed (non-fatal): {e}")

    # Post PR comment
    comment_body = format_pr_comment(
        risk_level=llm_result.risk_level,
        summary=llm_result.summary,
        changed_symbols=symbols,
        impacted_files=impacted,
        missing_tests=llm_result.missing_tests,
    )
    try:
        post_pr_comment(owner, repo_name, pr_number, comment_body, token)
        print(f"[webhook] Posted comment on PR #{pr_number}")
    except Exception as e:
        print(f"[webhook] Failed to post comment (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Installation event handler
# ---------------------------------------------------------------------------

async def _handle_installation_event(payload: dict) -> None:
    action       = payload.get("action", "")
    install      = payload.get("installation", {})
    install_id   = install.get("id")
    account      = install.get("account", {})
    login        = account.get("login", "unknown")
    account_type = account.get("type", "User")

    if action in ("created", "new_permissions_accepted"):
        database.upsert_installation(install_id, login, account_type)
        print(f"[webhook] Installation {install_id} created for {login}")
    elif action == "deleted":
        print(f"[webhook] Installation {install_id} deleted for {login}")
        # We keep the DB record but could clean up here if needed


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
):
    """Receive and dispatch GitHub App webhook events."""
    body = await request.body()
    _verify_signature(body, x_hub_signature_256)

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = x_github_event or ""

    if event == "pull_request":
        await _handle_pr_event(payload)
    elif event in ("installation", "installation_repositories"):
        await _handle_installation_event(payload)
    elif event == "ping":
        print("[webhook] Ping received — webhook configured correctly ✓")

    return {"ok": True}
