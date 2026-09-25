# PR Risk Radar — Hackathon Plan

## Overview

Build a Python (FastAPI) backend service that accepts a GitHub PR (by URL/number or raw diff) and returns:
- A **risk level** (low / medium / high) with a plain-English summary
- A list of **impacted files/functions** found by grepping the repo for changed symbols
- **2–3 missing test case suggestions** for the changed code

A minimal **HTML demo page** (styled with Tailwind CSS CDN) is served at `GET /` to render the JSON output without needing a separate frontend.

No database, no auth, no local git clones. Everything fetches through the GitHub REST API.

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold

**Status:** `[ ] pending`

**Intent:**  
Set up the Python project structure with all dependencies declared, environment variable conventions established, and the FastAPI app skeleton in place so every subsequent sub-task has a consistent foundation to build on.

**Expected Outcomes:**
- `requirements.txt` lists all runtime dependencies
- `.env.example` documents required secrets
- `app/main.py` contains a runnable FastAPI app with `GET /health` returning `{"status": "ok"}`
- `GET /` serves the HTML demo page (static placeholder for now)
- Running `uvicorn app.main:app` starts without errors

**Todo List:**
1. Create `requirements.txt` with: `fastapi`, `uvicorn[standard]`, `httpx`, `python-dotenv`, `jinja2`
2. Create `.env.example` with `GITHUB_TOKEN=`, `GROQ_API_KEY=`, `GEMINI_API_KEY=` (one LLM key is enough at runtime)
3. Create `app/__init__.py` (empty)
4. Create `app/main.py` with a FastAPI app instance, `GET /health`, and a `GET /` route that serves `templates/index.html`
5. Create `templates/index.html` as a minimal placeholder (a form + empty results div)
6. Verify `uvicorn app.main:app --reload` starts and `/health` returns 200

**Relevant Context:**
- FastAPI static HTML: use `Jinja2Templates` from `fastapi.templating` or just return `HTMLResponse` with `open().read()`
- No database or auth required

---

### Sub-Task 2 — GitHub API Client

**Status:** `[ ] pending`

**Intent:**  
Encapsulate all GitHub REST API calls in one module. This is the only place that talks to GitHub, making it easy to swap or mock during testing.

**Expected Outcomes:**
- `app/github_client.py` exposes functions:
  - `get_pr_diff(owner, repo, pr_number, token) -> str` — returns the raw unified diff text
  - `get_repo_files(owner, repo, ref, token) -> list[dict]` — returns the repo's full file tree (path + download URL) via the Git Trees API (recursive)
  - `fetch_file_content(url, token) -> str` — downloads a single file's raw content
- A helper `parse_pr_url(url) -> (owner, repo, pr_number)` that accepts either a full GitHub PR URL or just `owner/repo#number`
- All HTTP calls use `httpx` with the token in the `Authorization: Bearer` header

**Todo List:**
1. Create `app/github_client.py`
2. Implement `parse_pr_url` using regex to handle both URL and shorthand formats
3. Implement `get_pr_diff` — call `GET /repos/{owner}/{repo}/pulls/{pr_number}` with `Accept: application/vnd.github.v3.diff`
4. Implement `get_repo_files` — call `GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1`, filter out blobs > 1 MB, skip binary extensions (`.png`, `.jpg`, `.gif`, `.svg`, `.ico`, `.woff`, `.ttf`, `.pdf`, `.zip`, `.tar`, `.gz`, `.exe`, `.dll`, `.so`)
5. Implement `fetch_file_content` — simple GET with token header, return decoded text; return empty string on any non-200 or decode error
6. Manually test with a public repo + PR to confirm diff and file tree return expected data

**Relevant Context:**
- GitHub diff endpoint: `Accept: application/vnd.github.v3.diff` on the pulls endpoint returns a raw unified diff
- Git Trees API: `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` — use the PR's `base.sha` as the ref so the tree reflects the base branch
- Rate limit: authenticated requests get 5 000 req/hr; file content fetching per file counts as individual requests — limit to repos with fewer than 500 text files to stay within budget

---

### Sub-Task 3 — Diff Parser + Symbol Extractor

**Status:** `[ ] pending`

**Intent:**  
Parse the raw unified diff to extract: (a) which files were changed, and (b) which named symbols (functions, classes, methods) appear in the added/removed lines — using simple regex, language-agnostic.

**Expected Outcomes:**
- `app/diff_parser.py` exposes:
  - `parse_diff(diff_text: str) -> list[ChangedFile]` where `ChangedFile` has `path: str`, `added_lines: list[str]`, `removed_lines: list[str]`
  - `extract_symbols(changed_files: list[ChangedFile]) -> list[str]` — returns deduplicated symbol names found in changed lines using a set of common declaration patterns

**Todo List:**
1. Create `app/diff_parser.py` with a `ChangedFile` dataclass
2. Implement `parse_diff`:
   - Split diff on `diff --git` headers
   - For each file section, capture the filename from `+++ b/<path>`
   - Classify lines starting with `+` (not `+++`) as added, `-` (not `---`) as removed
3. Implement `extract_symbols` with regex patterns covering:
   - Python: `def <name>`, `class <name>`
   - JavaScript/TypeScript: `function <name>`, `const <name> =`, `class <name>`
   - Java/C#: `(public|private|protected|static).*\s<name>\s*\(`
   - Generic: `<name>\s*=\s*function`
4. Return only names that are identifier-like (alphanumeric + underscore, 3+ chars) to reduce noise

**Relevant Context:**
- The goal is precision over recall — a few missed symbols is fine; noisy matches waste LLM tokens and produce false impact hits
- Keep each regex pattern simple and independent; no AST parsing

---

### Sub-Task 4 — Dependency Finder

**Status:** `[ ] pending`

**Intent:**  
Given the list of changed symbol names and the full repo file tree, find which other files in the repo reference those symbols — without cloning the repo locally, by fetching file content via the GitHub API.

**Expected Outcomes:**
- `app/dependency_finder.py` exposes:
  - `find_dependents(symbols: list[str], repo_files: list[dict], changed_paths: set[str], token: str) -> list[str]`
  - Returns a deduplicated, sorted list of file paths (excluding the changed files themselves) that contain at least one reference to any of the changed symbols

**Todo List:**
1. Create `app/dependency_finder.py`
2. Implement `find_dependents`:
   - For each repo file (skip files in `changed_paths`, skip files > 100 KB by checking the `size` field in the tree response), fetch content via `fetch_file_content`
   - For each fetched file, check if any symbol name appears as a whole word (`\b{symbol}\b` regex) in the content
   - Collect the file path if any symbol matches
3. Add a cap: if the repo has more than 300 fetchable text files, only scan the top 300 by path length (shorter paths = closer to root = more likely to be core files)
4. Return the matched file paths sorted alphabetically

**Relevant Context:**
- `fetch_file_content` is in `app/github_client.py` (Sub-Task 2)
- The `repo_files` list comes from `get_repo_files` and includes `path`, `size`, and `url` fields from the GitHub Trees API response
- Whole-word matching (`\b`) avoids false positives like `get_user` matching `get_user_profile`

---

### Sub-Task 5 — LLM Integration

**Status:** `[ ] pending`

**Intent:**  
Send the diff, changed symbols, and impacted file list to a free LLM API (Groq primary, Gemini fallback) to generate the risk summary and missing test suggestions.

**Expected Outcomes:**
- `app/llm_client.py` exposes:
  - `analyze(diff_snippet: str, symbols: list[str], impacted_files: list[str]) -> LLMResult`
  - `LLMResult` has `risk_level: str`, `summary: str`, `missing_tests: list[str]`
- Groq is tried first (using `llama3-8b-8192` model, free tier); if `GROQ_API_KEY` is absent or the call fails, falls back to Gemini (`gemini-1.5-flash`, free tier)
- The diff snippet sent to the LLM is capped at 4 000 characters to stay within context limits

**Todo List:**
1. Create `app/llm_client.py` with a `LLMResult` dataclass
2. Write a single prompt template that instructs the model to return **only valid JSON** matching `{"risk_level": "low|medium|high", "summary": "...", "missing_tests": ["...", "...", "..."]}`
3. Implement `_call_groq(prompt)` — POST to `https://api.groq.com/openai/v1/chat/completions` with model `llama3-8b-8192`; parse JSON from the response content
4. Implement `_call_gemini(prompt)` — POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}`; parse JSON from the text part
5. Implement `analyze`: truncate diff to 4 000 chars, build prompt, try Groq then Gemini, parse the returned JSON string into `LLMResult`; on total failure return a safe default with `risk_level: "unknown"`
6. Test manually with a sample diff to confirm the model returns valid JSON

**Relevant Context:**
- Groq free tier: no credit card, sign up at console.groq.com; `llama3-8b-8192` is fast and free
- Gemini free tier: `gemini-1.5-flash` via Google AI Studio API key (aistudio.google.com); no billing required
- Prompt must explicitly say "respond with only a JSON object, no markdown fences" to avoid parse failures

---

### Sub-Task 6 — POST /analyze Endpoint

**Status:** `[ ] pending`

**Intent:**  
Wire together all modules into a single API endpoint that accepts PR input and returns the full risk analysis as JSON.

**Expected Outcomes:**
- `POST /analyze` accepts a JSON body with either `pr_url` (string) or `pr_number` + `repo` (string in `owner/repo` format) and optionally `diff` (raw diff text)
- Returns a JSON response matching:
  ```json
  {
    "risk_level": "medium",
    "summary": "...",
    "impacted_files": ["src/auth.py"],
    "missing_tests": ["...", "...", "..."],
    "changed_files": ["src/user.py"],
    "changed_symbols": ["create_user", "UserModel"]
  }
  ```
- Returns structured error JSON (not a 500 stack trace) for bad input or API failures

**Todo List:**
1. Create `app/models.py` with Pydantic models: `AnalyzeRequest` and `AnalyzeResponse`
2. In `app/main.py`, add `POST /analyze`:
   - Parse input: if `pr_url` is provided, call `parse_pr_url`; if `diff` is provided directly, skip GitHub diff fetch
   - If no raw diff, call `get_pr_diff` and `get_repo_files`
   - Call `parse_diff` and `extract_symbols`
   - Call `find_dependents`
   - Call `llm_client.analyze`
   - Return `AnalyzeResponse`
3. Add a top-level `try/except` in the endpoint that returns `{"error": str(e)}` with status 422 or 500 as appropriate
4. Load `GITHUB_TOKEN`, `GROQ_API_KEY`, `GEMINI_API_KEY` from environment via `python-dotenv` at app startup

**Relevant Context:**
- All module imports: `github_client`, `diff_parser`, `dependency_finder`, `llm_client`
- FastAPI's `HTTPException` should be used for 4xx errors; bare `except Exception` for unexpected 5xx

---

### Sub-Task 7 — HTML Demo Page

**Status:** `[ ] pending`

**Intent:**  
Provide a browser-accessible demo page so the hackathon judges can try the API without needing Postman or curl.

**Expected Outcomes:**
- `GET /` serves a Tailwind CSS-styled HTML page with:
  - A centered card layout with a branded header ("PR Risk Radar")
  - A form with labeled inputs: "PR URL or `owner/repo#number`" (text), "GitHub Token" (password), optional "Raw Diff" (textarea)
  - A loading spinner (Tailwind `animate-spin`) shown while the request is in flight
  - Results rendered as: a colored pill badge for risk level, summary paragraph, collapsible-style impacted files list (monospace), numbered test suggestion cards
- Styled with Tailwind CSS via CDN — no build step, no npm

**Todo List:**
1. Create `templates/index.html` (replaces the Sub-Task 1 placeholder)
2. Load Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
3. Build the layout with Tailwind: `max-w-2xl mx-auto`, card with `bg-white shadow-lg rounded-2xl p-8`, dark header bar
4. Style each form field with `border rounded-lg px-3 py-2 w-full focus:ring-2` classes
5. Add a `<script>` block that on form submit: shows spinner, POSTs to `/analyze`, hides spinner, renders response
6. Risk badge classes: `bg-green-100 text-green-800` (low), `bg-yellow-100 text-yellow-800` (medium), `bg-red-100 text-red-800` (high)
7. Impacted files: render as `font-mono text-sm bg-gray-50 rounded p-2` list items
8. Test suggestions: render as numbered cards with `border-l-4 border-blue-400 pl-3` styling
9. Show API errors in a `bg-red-50 border border-red-300 text-red-700 rounded p-4` alert box
10. Confirm the full flow works end-to-end in a browser

**Relevant Context:**
- The `GET /` route in `app/main.py` (Sub-Task 1) should return `HTMLResponse(content=open("templates/index.html").read())`
- Tailwind CDN (`https://cdn.tailwindcss.com`) works without any build tooling — ideal for a hackathon
- No Jinja2 templating needed — the HTML is fully static; JavaScript handles all dynamic rendering
- Keep JavaScript to ~60 lines — no frameworks

---

### Sub-Task 8 — End-to-End Smoke Test + README

**Status:** `[ ] pending`

**Intent:**  
Validate the full pipeline works against a real public GitHub PR, document how to run the project, and make it demo-ready.

**Expected Outcomes:**
- Running the service and hitting `/analyze` with a real public PR URL returns a valid `AnalyzeResponse` with all fields populated
- `README.md` contains: project description, prerequisites, setup steps (clone, `.env`, `pip install`, `uvicorn`), example `curl` command, example response

**Todo List:**
1. Test `POST /analyze` with a known public GitHub PR (e.g., a small PR in a public Python repo) and verify all fields are non-empty
2. Fix any integration bugs found during the smoke test
3. Write `README.md` with: description, prereqs (Python 3.11+, GitHub token, Groq or Gemini key), setup instructions, example `curl` request and response
4. Add a `.gitignore` that excludes `.env`, `__pycache__`, `*.pyc`, `.venv`
5. Confirm `GET /` demo page works end-to-end in a browser with the same PR URL
