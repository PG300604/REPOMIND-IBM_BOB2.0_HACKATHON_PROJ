"""
Dependency finder — scans the repo file tree to identify files that
reference any of the changed symbols.

Public interface:
  find_dependents(symbols, repo_files, changed_paths, token) -> list[str]
"""

import re

from app.github_client import fetch_file_content

# Files larger than this (bytes) are skipped to avoid downloading huge files
_MAX_FILE_SIZE = 100_000  # 100 KB

# If the repo has more text files than this, only scan the closest-to-root ones
_MAX_FILES_TO_SCAN = 300


def find_dependents(
    symbols: list[str],
    repo_files: list[dict],
    changed_paths: set[str],
    token: str,
) -> list[str]:
    """
    Return a sorted list of file paths (excluding changed files themselves)
    that contain a whole-word reference to at least one changed symbol.

    repo_files: list of dicts with keys 'path', 'size', 'url'
                (as returned by github_client.get_repo_files)
    """
    if not symbols:
        return []

    # Build whole-word regex patterns for each symbol
    patterns = [re.compile(rf"\b{re.escape(sym)}\b") for sym in symbols]

    # Filter candidates: not in changed set, not too large
    candidates = [
        f for f in repo_files
        if f["path"] not in changed_paths and f.get("size", 0) <= _MAX_FILE_SIZE
    ]

    # Cap: prefer shorter paths (closer to repo root = more likely to be core)
    if len(candidates) > _MAX_FILES_TO_SCAN:
        candidates = sorted(candidates, key=lambda f: len(f["path"]))[:_MAX_FILES_TO_SCAN]

    matched: list[str] = []

    for file_info in candidates:
        content = fetch_file_content(file_info["url"], token)
        if not content:
            continue
        for pattern in patterns:
            if pattern.search(content):
                matched.append(file_info["path"])
                break  # one match is enough — don't double-count this file

    return sorted(matched)
