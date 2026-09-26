"""
Diff parser and symbol extractor.

Public interface:
  parse_diff(diff_text)              -> list[ChangedFile]
  extract_symbols(changed_files)     -> list[str]   (deduplicated symbol names)
"""

import re
from dataclasses import dataclass, field


@dataclass
class ChangedFile:
    path: str
    added_lines: list[str] = field(default_factory=list)
    removed_lines: list[str] = field(default_factory=list)
    hunk_headers: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Diff parsing
# ---------------------------------------------------------------------------

def parse_diff(diff_text: str) -> list[ChangedFile]:
    """
    Parse a unified diff into a list of ChangedFile objects.
    Each object records which lines were added (+) and removed (-).
    """
    if not diff_text:
        return []

    results: list[ChangedFile] = []
    current: ChangedFile | None = None

    for line in diff_text.splitlines():
        # New file section
        if line.startswith("diff --git "):
            current = None
            continue

        # Determine the file path from the +++ header
        if line.startswith("+++ b/"):
            path = line[6:]  # strip "+++ b/"
            current = ChangedFile(path=path)
            results.append(current)
            continue

        # Skip lines before the first file is identified
        if current is None:
            continue

        # Hunk header context (e.g. @@ ... @@ def func_name)
        if line.startswith("@@"):
            parts = line.split("@@")
            if len(parts) >= 3 and parts[2].strip():
                current.hunk_headers.append(parts[2].strip())

        # Added lines (but not the +++ header)
        elif line.startswith("+") and not line.startswith("+++"):
            current.added_lines.append(line[1:])  # strip leading +

        # Removed lines (but not the --- header)
        elif line.startswith("-") and not line.startswith("---"):
            current.removed_lines.append(line[1:])  # strip leading -

    return results


# ---------------------------------------------------------------------------
# Symbol extraction
# ---------------------------------------------------------------------------

# Each pattern: (language_hint, compiled_regex)
# Group 1 must capture the symbol name.
_SYMBOL_PATTERNS: list[re.Pattern] = [
    # Python
    re.compile(r"^\s*def\s+([A-Za-z_]\w+)\s*\("),
    re.compile(r"^\s*class\s+([A-Za-z_]\w+)\s*[\(:]"),

    # JavaScript / TypeScript — function declarations & arrow functions
    re.compile(r"^\s*function\s+([A-Za-z_]\w+)\s*\("),
    re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_]\w+)\s*=\s*(?:async\s+)?\(?"),
    re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_]\w+)\s*\("),
    re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w+)\b"),

    # TypeScript interfaces / type aliases
    re.compile(r"^\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z_]\w+)\b"),

    # Java / C# / Go — method/function declarations
    re.compile(r"(?:public|private|protected|internal|static|override|virtual|abstract)"
               r"(?:\s+\w+)+\s+([A-Za-z_]\w+)\s*\("),
    # Go
    re.compile(r"^\s*func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?([A-Za-z_]\w+)\s*\("),

    # Ruby
    re.compile(r"^\s*def\s+([A-Za-z_]\w+)"),

    # Generic: name = function(
    re.compile(r"^\s*([A-Za-z_]\w+)\s*=\s*function\s*\("),
]

_MIN_SYMBOL_LEN = 3


def extract_symbols(changed_files: list[ChangedFile] | str) -> list[str]:
    """
    Return a deduplicated list of symbol names found in the added or removed
    lines of the changed files. Only identifier-like names of 3+ characters
    are returned to reduce noise. Accepts either ChangedFile list or raw diff string.
    """
    if isinstance(changed_files, str):
        changed_files = parse_diff(changed_files)

    seen: set[str] = set()
    results: list[str] = []

    for cf in changed_files:
        lines_to_check = cf.added_lines + cf.removed_lines + getattr(cf, "hunk_headers", [])
        for line in lines_to_check:
            for pattern in _SYMBOL_PATTERNS:
                m = pattern.search(line)
                if m:
                    name = m.group(1)
                    if len(name) >= _MIN_SYMBOL_LEN and name not in seen:
                        seen.add(name)
                        results.append(name)

    return results
