"""
GitHub OAuth module.

Handles:
  - Redirecting users to GitHub for authorization
  - Exchanging the OAuth code for a token
  - Reading/writing session cookies backed by SQLite
  - FastAPI dependency `get_current_token` for protected routes

Required env vars:
  GITHUB_CLIENT_ID      — OAuth App client ID
  GITHUB_CLIENT_SECRET  — OAuth App client secret
  SECRET_KEY            — random string used to sign session cookie values
"""

import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import RedirectResponse

from backend import database

router = APIRouter(prefix="/auth", tags=["auth"])

_GH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
_GH_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GH_API = "https://api.github.com"

# Short-lived CSRF state storage: state_value -> expiry (unix ts)
_pending_states: dict[str, float] = {}
_STATE_TTL = 300  # 5 minutes


# ---------------------------------------------------------------------------
# OAuth URL builder
# ---------------------------------------------------------------------------

def _github_oauth_url(state: str) -> str:
    client_id = os.environ.get("GITHUB_CLIENT_ID", "")
    if not client_id:
        raise RuntimeError("GITHUB_CLIENT_ID is not set")
    scopes = "repo,read:user"
    return (
        f"{_GH_AUTHORIZE_URL}"
        f"?client_id={client_id}"
        f"&scope={scopes}"
        f"&state={state}"
    )


# ---------------------------------------------------------------------------
# Token exchange
# ---------------------------------------------------------------------------

def _exchange_code(code: str) -> str:
    """Exchange an OAuth code for a GitHub access token string."""
    client_id     = os.environ.get("GITHUB_CLIENT_ID", "")
    client_secret = os.environ.get("GITHUB_CLIENT_SECRET", "")
    resp = httpx.post(
        _GH_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id":     client_id,
            "client_secret": client_secret,
            "code":          code,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise ValueError(f"GitHub OAuth error: {data['error_description']}")
    return data["access_token"]


def _get_user_login(token: str) -> str:
    resp = httpx.get(
        f"{_GH_API}/user",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json().get("login", "unknown")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/github")
def login_with_github():
    """Redirect the browser to GitHub's OAuth consent page."""
    import time
    state = secrets.token_urlsafe(16)
    _pending_states[state] = time.time() + _STATE_TTL
    return RedirectResponse(url=_github_oauth_url(state), status_code=302)


@router.get("/callback")
def oauth_callback(code: str, state: str, response: Response):
    """GitHub redirects here after the user authorizes. Sets session cookie."""
    import time
    # Validate state (CSRF protection)
    expiry = _pending_states.pop(state, None)
    if expiry is None or time.time() > expiry:
        return Response(content="Invalid or expired OAuth state.", status_code=400)

    try:
        token = _exchange_code(code)
        login = _get_user_login(token)
    except Exception as e:
        return Response(content=f"OAuth failed: {e}", status_code=500)

    session_id = str(uuid.uuid4())
    database.save_oauth_session(session_id, token, login)

    redirect = RedirectResponse(url="/?connected=1", status_code=302)
    redirect.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )
    return redirect


@router.get("/me")
def get_me(session_id: Optional[str] = Cookie(default=None)):
    """Return the authenticated GitHub user, or 401."""
    if not session_id:
        return Response(status_code=401)
    session = database.get_oauth_session(session_id)
    if not session:
        return Response(status_code=401)
    return {"login": session["github_login"], "authenticated": True}


@router.get("/logout")
def logout(response: Response, session_id: Optional[str] = Cookie(default=None)):
    """Clear the session cookie and delete the DB record."""
    if session_id:
        database.delete_oauth_session(session_id)
    resp = RedirectResponse(url="/", status_code=302)
    resp.delete_cookie("session_id")
    return resp


# ---------------------------------------------------------------------------
# FastAPI dependency — use in protected routes
# ---------------------------------------------------------------------------

def get_current_token(session_id: Optional[str] = Cookie(default=None)) -> Optional[str]:
    """
    FastAPI dependency. Returns the GitHub token from the session cookie,
    or None if unauthenticated.
    """
    if not session_id:
        return None
    session = database.get_oauth_session(session_id)
    if not session:
        return None
    return session["github_token"]
