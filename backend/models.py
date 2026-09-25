"""
Pydantic request/response models for the /analyze endpoint.
"""

from typing import Optional
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    # Provide either pr_url OR (repo + pr_number)
    pr_url: Optional[str] = None
    repo: Optional[str] = None        # "owner/repo"
    pr_number: Optional[int] = None

    # Optional: caller may supply a raw diff directly (skips GitHub diff fetch)
    diff: Optional[str] = None

    # GitHub token — can also come from server env; request field takes precedence
    github_token: Optional[str] = None


class AnalyzeResponse(BaseModel):
    risk_level: str                   # low | medium | high | unknown
    summary: str
    impacted_files: list[str]
    missing_tests: list[str]
    changed_files: list[str]
    changed_symbols: list[str]
