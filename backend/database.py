"""
Database layer — SQLite via SQLAlchemy Core.

Tables:
  analyses       — persisted PR analysis results
  oauth_sessions — browser sessions backed by GitHub OAuth tokens
  installations  — GitHub App installation records

Call init_db() at app startup.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    MetaData, Table, create_engine, select, insert, update, delete,
)

# ---------------------------------------------------------------------------
# Engine setup
# ---------------------------------------------------------------------------

_DB_DIR = Path(__file__).parent.parent / "data"
_DB_DIR.mkdir(exist_ok=True)
_DB_PATH = _DB_DIR / "pr_radar.db"

engine = create_engine(f"sqlite:///{_DB_PATH}", connect_args={"check_same_thread": False})
metadata = MetaData()

# ---------------------------------------------------------------------------
# Table definitions
# ---------------------------------------------------------------------------

analyses = Table(
    "analyses", metadata,
    Column("id",              String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
    Column("repo",            String(255), nullable=False),
    Column("pr_number",       Integer, nullable=False),
    Column("risk_level",      String(20)),
    Column("summary",         Text),
    Column("impacted_files",  Text),   # JSON array
    Column("missing_tests",   Text),   # JSON array
    Column("changed_files",   Text),   # JSON array
    Column("changed_symbols", Text),   # JSON array
    Column("raw_diff",        Text),
    Column("created_at",      DateTime, default=lambda: datetime.now(timezone.utc)),
)

oauth_sessions = Table(
    "oauth_sessions", metadata,
    Column("session_id",    String(36), primary_key=True),
    Column("github_token",  Text, nullable=False),   # stored as-is; encrypt in prod
    Column("github_login",  String(255)),
    Column("created_at",    DateTime, default=lambda: datetime.now(timezone.utc)),
    Column("expires_at",    DateTime),
)

installations = Table(
    "installations", metadata,
    Column("installation_id", Integer, primary_key=True),
    Column("account_login",   String(255)),
    Column("account_type",    String(50)),    # "User" or "Organization"
    Column("created_at",      DateTime, default=lambda: datetime.now(timezone.utc)),
)


def init_db() -> None:
    """Create all tables if they don't exist. Safe to call multiple times."""
    metadata.create_all(engine)


# ---------------------------------------------------------------------------
# Analysis CRUD
# ---------------------------------------------------------------------------

def save_analysis(
    repo: str,
    pr_number: int,
    risk_level: str,
    summary: str,
    impacted_files: list[str],
    missing_tests: list[str],
    changed_files: list[str],
    changed_symbols: list[str],
    raw_diff: str = "",
) -> str:
    """Insert a new analysis record. Returns the new UUID."""
    row_id = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(insert(analyses).values(
            id=row_id,
            repo=repo,
            pr_number=pr_number,
            risk_level=risk_level,
            summary=summary,
            impacted_files=json.dumps(impacted_files),
            missing_tests=json.dumps(missing_tests),
            changed_files=json.dumps(changed_files),
            changed_symbols=json.dumps(changed_symbols),
            raw_diff=raw_diff,
            created_at=datetime.now(timezone.utc),
        ))
    return row_id


def get_analysis(repo: str, pr_number: int) -> dict | None:
    """Return the most recent analysis for a repo+PR, or None."""
    with engine.connect() as conn:
        row = conn.execute(
            select(analyses)
            .where(analyses.c.repo == repo)
            .where(analyses.c.pr_number == pr_number)
            .order_by(analyses.c.created_at.desc())
            .limit(1)
        ).mappings().first()

    if row is None:
        return None
    return _deserialize_analysis(dict(row))


def list_analyses(limit: int = 20) -> list[dict]:
    """Return the most recent analyses ordered newest-first."""
    with engine.connect() as conn:
        rows = conn.execute(
            select(analyses).order_by(analyses.c.created_at.desc()).limit(limit)
        ).mappings().all()
    return [_deserialize_analysis(dict(r)) for r in rows]


def _deserialize_analysis(row: dict) -> dict:
    for key in ("impacted_files", "missing_tests", "changed_files", "changed_symbols"):
        if isinstance(row.get(key), str):
            try:
                row[key] = json.loads(row[key])
            except (json.JSONDecodeError, TypeError):
                row[key] = []
    if isinstance(row.get("created_at"), datetime):
        row["created_at"] = row["created_at"].isoformat()
    return row


# ---------------------------------------------------------------------------
# OAuth session CRUD
# ---------------------------------------------------------------------------

def save_oauth_session(session_id: str, github_token: str, github_login: str) -> None:
    from datetime import timedelta
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    with engine.begin() as conn:
        # Delete old session if re-using same id (shouldn't happen, but safe)
        conn.execute(delete(oauth_sessions).where(oauth_sessions.c.session_id == session_id))
        conn.execute(insert(oauth_sessions).values(
            session_id=session_id,
            github_token=github_token,
            github_login=github_login,
            created_at=datetime.now(timezone.utc),
            expires_at=expires,
        ))


def get_oauth_session(session_id: str) -> dict | None:
    with engine.connect() as conn:
        row = conn.execute(
            select(oauth_sessions).where(oauth_sessions.c.session_id == session_id)
        ).mappings().first()
    if row is None:
        return None
    row = dict(row)
    # Expire check
    if row.get("expires_at") and datetime.now(timezone.utc) > row["expires_at"].replace(tzinfo=timezone.utc):
        delete_oauth_session(session_id)
        return None
    return row


def delete_oauth_session(session_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(delete(oauth_sessions).where(oauth_sessions.c.session_id == session_id))


# ---------------------------------------------------------------------------
# Installation CRUD
# ---------------------------------------------------------------------------

def upsert_installation(installation_id: int, account_login: str, account_type: str) -> None:
    with engine.begin() as conn:
        existing = conn.execute(
            select(installations).where(installations.c.installation_id == installation_id)
        ).first()
        if existing:
            conn.execute(
                update(installations)
                .where(installations.c.installation_id == installation_id)
                .values(account_login=account_login, account_type=account_type)
            )
        else:
            conn.execute(insert(installations).values(
                installation_id=installation_id,
                account_login=account_login,
                account_type=account_type,
                created_at=datetime.now(timezone.utc),
            ))


def get_installation(installation_id: int) -> dict | None:
    with engine.connect() as conn:
        row = conn.execute(
            select(installations).where(installations.c.installation_id == installation_id)
        ).mappings().first()
    return dict(row) if row else None
