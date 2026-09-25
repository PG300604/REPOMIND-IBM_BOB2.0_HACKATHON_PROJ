"""
LLM client — sends the diff + context to a free LLM and returns a structured
risk analysis.

Provider priority:
  1. Groq  (llama3-8b-8192)   — needs GROQ_API_KEY
  2. Gemini (gemini-1.5-flash) — needs GEMINI_API_KEY

Public interface:
  analyze(diff_snippet, symbols, impacted_files) -> LLMResult
"""

import json
import os
import re
from dataclasses import dataclass, field

import httpx

_DIFF_MAX_CHARS = 4_000

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_GROQ_MODEL = "llama3-8b-8192"

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)


@dataclass
class LLMResult:
    risk_level: str          # "low" | "medium" | "high" | "unknown"
    summary: str
    missing_tests: list[str] = field(default_factory=list)


_FALLBACK = LLMResult(
    risk_level="unknown",
    summary="LLM analysis unavailable — check your API keys.",
    missing_tests=[],
)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(diff_snippet: str, symbols: list[str], impacted_files: list[str]) -> str:
    symbols_str = ", ".join(symbols) if symbols else "none detected"
    impacted_str = "\n".join(f"  - {f}" for f in impacted_files) if impacted_files else "  none"

    return f"""You are a senior software engineer performing a code review risk assessment.

Given the following pull request diff, identify:
1. The overall risk level (low / medium / high)
2. A concise 2-3 sentence summary of what could break
3. Exactly 3 specific, actionable missing test cases for the changed code

Changed symbols: {symbols_str}

Files that reference the changed symbols (potential blast radius):
{impacted_str}

Diff (first {_DIFF_MAX_CHARS} chars):
```
{diff_snippet}
```

Respond with ONLY a valid JSON object — no markdown fences, no explanation, no extra text.
The JSON must match exactly this structure:
{{
  "risk_level": "low" | "medium" | "high",
  "summary": "<2-3 sentence explanation of what could break>",
  "missing_tests": [
    "<specific test case 1>",
    "<specific test case 2>",
    "<specific test case 3>"
  ]
}}"""


# ---------------------------------------------------------------------------
# Provider calls
# ---------------------------------------------------------------------------

def _parse_llm_json(raw: str) -> LLMResult:
    """Extract and parse the JSON object from the LLM response text."""
    # Strip any accidental markdown fences
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    return LLMResult(
        risk_level=str(data.get("risk_level", "unknown")).lower(),
        summary=str(data.get("summary", "")),
        missing_tests=[str(t) for t in data.get("missing_tests", [])],
    )


def _call_groq(prompt: str) -> LLMResult:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise ValueError("GROQ_API_KEY not set")

    payload = {
        "model": _GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    resp = httpx.post(
        _GROQ_URL,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return _parse_llm_json(content)


def _call_gemini(prompt: str) -> LLMResult:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY not set")

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    resp = httpx.post(
        f"{_GEMINI_URL}?key={key}",
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return _parse_llm_json(text)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def analyze(
    diff_snippet: str,
    symbols: list[str],
    impacted_files: list[str],
) -> LLMResult:
    """
    Send the diff context to the configured LLM and return a structured result.
    Tries Groq first, then Gemini. Returns a safe fallback if both fail.
    """
    truncated = diff_snippet[:_DIFF_MAX_CHARS]
    prompt = _build_prompt(truncated, symbols, impacted_files)

    for provider_fn, name in [(_call_groq, "Groq"), (_call_gemini, "Gemini")]:
        try:
            result = provider_fn(prompt)
            # Normalise risk_level to one of the three valid values
            if result.risk_level not in ("low", "medium", "high"):
                result.risk_level = "unknown"
            return result
        except Exception as exc:
            print(f"[llm_client] {name} failed: {exc}")

    return _FALLBACK
