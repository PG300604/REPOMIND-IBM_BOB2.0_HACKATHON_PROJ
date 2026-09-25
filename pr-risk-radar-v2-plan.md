# PR Risk Radar v2 — Architecture Upgrade Plan

## Overview

Upgrade from a single-file FastAPI + Jinja HTML app to a proper full-stack application:

- **Frontend**: Next.js 14 (App Router) + shadcn/ui + Tailwind — IDE-style dark UI
- **Backend**: FastAPI (kept, extended) — all analysis logic, auth, webhooks
- **Database**: SQLite via SQLAlchemy — persists analyses, OAuth sessions, GitHub App installations
- **Auth**: GitHub App (webhook auto-analysis + installation token) + GitHub OAuth (private repo UI access)
- **No personal tokens ever asked from users**

### What is preserved from v1
All core analysis logic stays exactly as-is:
- `app/diff_parser.py` — unchanged
- `app/dependency_finder.py` — unchanged
- `app/llm_client.py` — unchanged
- `app/github_client.py` — token made optional (empty = unauthenticated for public repos)

### New project structure
```
pr-risk-radar/
├── backend/                   ← renamed from app/
│   ├── main.py                ← extended: new routes added
│   ├── database.py            ← NEW: SQLite + SQLAlchemy setup
│   ├── models_db.py           ← NEW: ORM models (Analysis, Session, Installation)
│   ├── github_app.py          ← NEW: JWT signing, installation token
│   ├── oauth.py               ← NEW: OAuth code exchange, session cookie
│   ├── webhook.py             ← NEW: webhook handler + signature verification
│   ├── github_client.py       ← modified: token optional
│   ├── diff_parser.py         ← unchanged
│   ├── dependency_finder.py   ← unchanged
│   ├── llm_client.py          ← unchanged
│   └── models.py              ← unchanged (Pydantic API models)
├── frontend/                  ← NEW: Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           ← landing / redirect
│   │   └── dashboard/
│   │       └── page.tsx       ← main IDE shell
│   ├── components/
│   │   ├── Shell.tsx          ← outer layout (rail + sidebar + editor + panel)
│   │   ├── FileTree.tsx
│   │   ├── DiffViewer.tsx
│   │   ├── ReviewPanel.tsx
│   │   ├── AnalyzeModal.tsx
│   │   └── StatusBar.tsx
│   ├── lib/
│   │   └── api.ts             ← typed fetch wrappers for FastAPI
│   ├── package.json
│   ├── tailwind.config.ts
│   └── components.json        ← shadcn config
├── requirements.txt           ← + PyJWT, cryptography, itsdangerous
├── .env.example               ← + GitHub App vars
└── README.md
```

---

## Sub-Tasks

---

### Sub-Task 1 — Restructure: rename `app/` → `backend/`, update imports

**Status:** `[ ] pending`

**Intent:**
Rename the existing `app/` package to `backend/` so it doesn't conflict with Next.js's `app/` directory convention, and update all import paths.

**Expected Outcomes:**
- `backend/` contains all existing Python modules with identical content
- `uvicorn backend.main:app` starts and `/health` returns 200
- Old `app/` directory removed
- `templates/` directory removed (frontend moves to Next.js)

**Todo List:**
1. Create `backend/` directory and copy all files from `app/` into it
2. Update all `from app import ...` and `from app.xxx import ...` to `from backend import ...` / `from backend.xxx import ...` in every file
3. Update `uvicorn` launch command in README and any scripts
4. Delete old `app/` and `templates/` directories
5. Verify `uvicorn backend.main:app --reload` starts cleanly

**Relevant Context:**
- Files to update imports in: `backend/main.py`, `backend/dependency_finder.py`
- The `GET /` HTML route in `main.py` should be removed (Next.js handles UI)

---

### Sub-Task 2 — Database layer (SQLite + SQLAlchemy)

**Status:** `[ ] pending`

**Intent:**
Add a SQLite database with three tables: `analyses` (persisted PR analysis results), `oauth_sessions` (browser sessions with GitHub OAuth tokens), and `installations` (GitHub App installation records). Use SQLAlchemy Core (not ORM) for simplicity.

**Expected Outcomes:**
- `backend/database.py` initialises a SQLite file (`data/pr_radar.db`) on startup
- Three tables created automatically via `metadata.create_all()`
- Helper functions: `save_analysis`, `get_analysis`, `save_session`, `get_session`, `save_installation`, `get_installation_token`
- Database file created at `data/pr_radar.db` when backend starts

**Todo List:**
1. Add `sqlalchemy` to `requirements.txt`
2. Create `backend/database.py`:
   - Define `analyses` table: `id` (UUID), `repo`, `pr_number`, `risk_level`, `summary`, `impacted_files` (JSON text), `missing_tests` (JSON text), `changed_files` (JSON text), `changed_symbols` (JSON text), `created_at`
   - Define `oauth_sessions` table: `session_id` (UUID), `github_token` (encrypted), `github_login`, `created_at`, `expires_at`
   - Define `installations` table: `installation_id` (int PK), `account_login`, `account_type`, `created_at`
   - `init_db()` function called at app startup
3. Add CRUD helpers: `save_analysis()`, `get_analysis(repo, pr_number)`, `upsert_installation()`, `save_oauth_session()`, `get_oauth_session(session_id)`
4. Verify tables are created on `uvicorn` startup

**Relevant Context:**
- SQLite path: `Path(__file__).parent.parent / "data" / "pr_radar.db"` — create `data/` dir if missing
- Use `json.dumps`/`json.loads` for list fields (SQLite has no array type)
- Token encryption: use `itsdangerous.URLSafeSerializer` with `SECRET_KEY` env var

---

### Sub-Task 3 — GitHub App module (`github_app.py`)

**Status:** `[ ] pending`

**Intent:**
Encapsulate all GitHub App authentication logic: generating a JWT from the App's private key, exchanging it for a short-lived installation token, and posting PR review comments.

**Expected Outcomes:**
- `backend/github_app.py` exposes:
  - `get_installation_token(installation_id) -> str` — returns a 1-hour installation access token
  - `post_pr_comment(owner, repo, pr_number, body, token) -> None` — posts a markdown comment to the PR
- JWT is signed with RS256 using `GITHUB_APP_PRIVATE_KEY` env var (PEM string)
- Tokens are cached in memory for their lifetime minus 60 seconds

**Todo List:**
1. Add `PyJWT` and `cryptography` to `requirements.txt`
2. Create `backend/github_app.py`
3. Implement `_make_jwt()` — signs a JWT with `iss=GITHUB_APP_ID`, `iat=now-60`, `exp=now+540`, algorithm RS256
4. Implement `get_installation_token(installation_id)` — POST to `/app/installations/{id}/access_tokens` with JWT; cache result with expiry
5. Implement `post_pr_comment(owner, repo, pr_number, body, token)` — POST to `/repos/{owner}/{repo}/issues/{pr_number}/comments`
6. Add `format_pr_comment(analysis: AnalyzeResponse) -> str` — renders a clean markdown comment with risk badge, summary, blast radius table, and test suggestions

**Relevant Context:**
- `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` (full PEM, newlines as `\n`) must be in `.env`
- GitHub App docs: `POST /app/installations/{installation_id}/access_tokens` requires `Authorization: Bearer <JWT>`
- The formatted comment should use GitHub markdown: emoji badges, collapsible `<details>` for long file lists

---

### Sub-Task 4 — OAuth module (`oauth.py`)

**Status:** `[ ] pending`

**Intent:**
Implement the GitHub OAuth flow so users can connect their GitHub account to access private repos — without ever typing a token. Session stored in a cookie backed by SQLite.

**Expected Outcomes:**
- `GET /auth/github` redirects to GitHub's OAuth authorization URL
- `GET /auth/callback?code=...` exchanges the code for a token, saves the session, sets a `session_id` cookie, redirects to `/`
- `GET /auth/me` returns the current user's login (or 401)
- `GET /auth/logout` clears the cookie and deletes the session
- A `get_current_token(request) -> str | None` dependency that reads the session cookie and returns the GitHub token

**Todo List:**
1. Add `itsdangerous` to `requirements.txt`
2. Create `backend/oauth.py`
3. Implement `github_oauth_url()` — builds the GitHub OAuth URL with `GITHUB_CLIENT_ID`, scopes `repo,read:user`, and a random `state` param stored in a short-lived dict
4. Implement `exchange_code(code, state)` — validates state, POSTs to `https://github.com/login/oauth/access_token`, returns token string
5. Implement `get_user_login(token)` — GET `/user` to retrieve the GitHub username
6. Wire routes into `backend/main.py`: `GET /auth/github`, `GET /auth/callback`, `GET /auth/me`, `GET /auth/logout`
7. Implement `get_current_token(request)` FastAPI dependency — reads `session_id` cookie → lookup in `oauth_sessions` table → return token or None

**Relevant Context:**
- Required env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SECRET_KEY` (random string for cookie signing)
- OAuth app vs GitHub App: these are two separate GitHub registrations; both needed
- State parameter must be validated to prevent CSRF — store in a 5-minute TTL in-memory dict

---

### Sub-Task 5 — Webhook handler (`webhook.py`)

**Status:** `[ ] pending`

**Intent:**
Receive GitHub webhook events when a PR is opened or updated, automatically run the full analysis pipeline using an installation token (no user interaction), post the result as a PR comment, and persist the analysis to SQLite.

**Expected Outcomes:**
- `POST /webhook` accepts `pull_request` events with actions `opened`, `synchronize`, `reopened`
- Webhook signature (`X-Hub-Signature-256`) is verified using `GITHUB_WEBHOOK_SECRET`
- On valid event: fetch diff using installation token → run full analysis → post PR comment → save to DB
- Installation records are created/updated on `installation` events

**Todo List:**
1. Create `backend/webhook.py`
2. Implement `verify_signature(payload_bytes, sig_header, secret)` — HMAC-SHA256 comparison using `hmac.compare_digest`
3. Implement `handle_pr_event(payload)` async function:
   - Extract `owner`, `repo`, `pr_number`, `installation_id` from payload
   - Call `github_app.get_installation_token(installation_id)`
   - Call `github_client.get_pr_diff(...)` and `get_repo_files(...)`
   - Run `diff_parser` → `dependency_finder` → `llm_client.analyze`
   - Call `database.save_analysis(...)`
   - Call `github_app.post_pr_comment(...)` with formatted markdown
4. Implement `handle_installation_event(payload)` — upsert installation record in DB
5. Wire `POST /webhook` into `backend/main.py` — parse body as JSON, verify sig, dispatch to handler based on event type header

**Relevant Context:**
- `X-GitHub-Event` header determines event type (`pull_request` vs `installation`)
- Must read raw bytes for signature verification BEFORE parsing as JSON — use `await request.body()`
- Webhook secret is set when creating the GitHub App; stored as `GITHUB_WEBHOOK_SECRET`

---

### Sub-Task 6 — Update `/analyze` endpoint + `github_client.py`

**Status:** `[ ] pending`

**Intent:**
Make the `/analyze` endpoint token-source-aware: try unauthenticated for public repos, use OAuth session token if present, and persist every analysis result to SQLite. Remove the `github_token` field from the request body entirely.

**Expected Outcomes:**
- `POST /analyze` no longer accepts `github_token` in the request body
- Token resolution order: (1) OAuth session cookie, (2) unauthenticated (public repos only)
- If the GitHub API returns 401/404 and no OAuth token exists, return `{"requires_auth": true}` with HTTP 401
- Every successful analysis is saved to `analyses` table
- `GET /analysis/{repo}/{pr_number}` returns cached result from DB if it exists (skip re-analysis)
- `github_client.py` functions accept `token: str = ""` — empty string means unauthenticated

**Todo List:**
1. Update `backend/github_client.py`: make `token` parameter default to `""` in all functions; unauthenticated calls omit the `Authorization` header entirely
2. Update `backend/models.py`: remove `github_token` from `AnalyzeRequest`; add `requires_auth: bool = False` to `AnalyzeResponse`
3. Update `POST /analyze` in `backend/main.py`:
   - Inject `get_current_token` dependency to read OAuth session
   - Try GitHub API; on 401/404 with no token, return 401 + `{"requires_auth": true}`
   - After successful analysis, call `database.save_analysis(...)`
4. Add `GET /analysis/{repo:path}/{pr_number}` route — returns cached DB result or 404
5. Add `GET /analyses` route — returns list of recent analyses (for sidebar history)

**Relevant Context:**
- `get_current_token` is the FastAPI dependency from `backend/oauth.py`
- `requires_auth: true` is the signal the frontend uses to show the "Connect GitHub" button

---

### Sub-Task 7 — Next.js frontend scaffold

**Status:** `[ ] pending`

**Intent:**
Scaffold the Next.js 14 App Router project with shadcn/ui, Tailwind dark theme, and the basic page structure. No real components yet — just the scaffold that compiles and runs.

**Expected Outcomes:**
- `frontend/` directory contains a working Next.js 14 app
- `npm run dev` starts on port 3000 without errors
- shadcn/ui initialised with `slate` base color, dark mode class strategy
- Tailwind configured with dark mode
- `frontend/lib/api.ts` contains typed fetch wrappers for all FastAPI endpoints
- Proxy configured: Next.js API calls to `/api/*` forward to `http://localhost:8000`

**Todo List:**
1. Run `npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"` (skip ESLint prompt)
2. Run `npx shadcn@latest init` inside `frontend/` — choose: style `default`, base color `slate`, CSS variables `yes`
3. Install shadcn components: `npx shadcn@latest add badge button card dialog separator scroll-area tooltip`
4. Configure `next.config.ts` with rewrites: `{ source: '/api/:path*', destination: 'http://localhost:8000/:path*' }`
5. Set `darkMode: 'class'` in `tailwind.config.ts`; add `className="dark"` to `<html>` in `layout.tsx`
6. Create `frontend/lib/api.ts` with typed functions: `analyzePR()`, `getAnalysis()`, `listAnalyses()`, `getMe()`, `logout()`
7. Verify `npm run dev` starts and `localhost:3000` loads

**Relevant Context:**
- Next.js rewrite proxy avoids CORS issues between port 3000 and 8000
- shadcn `slate` palette + dark mode matches the existing IDE dark theme (`#0d1117`-style)
- `lib/api.ts` should use `fetch` with `credentials: 'include'` so session cookies are forwarded

---

### Sub-Task 8 — IDE Shell components (Next.js)

**Status:** `[ ] pending`

**Intent:**
Rebuild the IDE-style interface in React/shadcn — the same visual design as the current HTML page but now as proper components with state management, routing, and real-time updates.

**Expected Outcomes:**
- `dashboard/page.tsx` renders the full IDE shell that fills the viewport
- `Shell.tsx` — CSS grid layout (rail | sidebar | editor | panel), same zones as current HTML
- `FileTree.tsx` — renders changed files and blast-radius files grouped by folder; clicking a file activates its tab
- `DiffViewer.tsx` — renders unified diff with green/red line highlighting and line numbers
- `ReviewPanel.tsx` — collapsible right panel with risk badge (shadcn `Badge`), summary, symbol chips, test suggestion cards
- `StatusBar.tsx` — bottom bar showing repo, PR info, risk level
- `AnalyzeModal.tsx` — shadcn `Dialog`: PR URL input, "Connect GitHub" button (shown only when `requires_auth: true`), no token field

**Todo List:**
1. Create `frontend/components/Shell.tsx` — CSS grid layout matching the current design, accepts children for each zone
2. Create `frontend/components/FileTree.tsx` — takes `changedFiles[]` and `impactedFiles[]`, groups by folder, renders tree nodes; uses shadcn `ScrollArea`
3. Create `frontend/components/DiffViewer.tsx` — takes raw diff string + active file path, parses and renders line-by-line with CSS classes for added/removed/context
4. Create `frontend/components/ReviewPanel.tsx` — takes `AnalyzeResponse`, renders risk `Badge`, summary card, symbol chips, test cards; uses shadcn `ScrollArea` and `Separator`
5. Create `frontend/components/StatusBar.tsx` — fixed bottom bar, shows PR label and risk level dot
6. Create `frontend/components/AnalyzeModal.tsx` — shadcn `Dialog` with PR URL `Input`; shows `Button` "Connect GitHub" if `requiresAuth` state is true; submits to `analyzePR()` from `lib/api.ts`
7. Wire everything into `frontend/app/dashboard/page.tsx` with `useState` for: `activeTab`, `analysis`, `panelOpen`, `tabs[]`
8. Add keyboard shortcuts via `useEffect`: `N` = open modal, `B` = toggle panel, `Escape` = close modal

**Relevant Context:**
- shadcn `Badge` variant props: `default`, `secondary`, `destructive`, `outline` — map risk levels to these
- `DiffViewer` logic can be ported directly from `parseDiffSection()` in the current `index.html`
- Keep `DiffViewer` as a pure presentational component (no fetch) — diff string is passed as a prop

---

### Sub-Task 9 — Auth UI: OAuth connect flow

**Status:** `[ ] pending`

**Intent:**
Add the "Connect GitHub" flow to the frontend — a button that appears only when a private repo analysis returns `requires_auth: true`, redirects to GitHub OAuth, and on return updates the UI to show the user's avatar and login.

**Expected Outcomes:**
- When `POST /analyze` returns `{ requires_auth: true }`, a "Connect GitHub" button appears in the modal
- Clicking it opens `GET /api/auth/github` in the same window (server redirects to GitHub)
- After OAuth callback, user is redirected back to `/?connected=1`; the app auto-retries the last analysis
- A user avatar + login appears in the status bar when authenticated
- A "Disconnect" button in the rail calls `GET /api/auth/logout` and clears the session

**Todo List:**
1. Add `getMe()` call in `dashboard/page.tsx` `useEffect` on mount — sets `user` state if session cookie exists
2. In `AnalyzeModal.tsx`: if `requiresAuth` state is true, show a shadcn `Button` variant `outline` with GitHub icon and text "Connect GitHub" that navigates to `/api/auth/github`
3. On `dashboard/page.tsx` mount: check `?connected=1` query param — if present, re-run the last PR URL stored in `localStorage`
4. Store last-attempted PR URL in `localStorage` before redirecting to OAuth
5. Add user avatar display in `StatusBar.tsx` — small circular avatar using `next/image` if `user` state is set
6. Add disconnect button in the rail (bottom icon) — calls `logout()` from `lib/api.ts` then clears `user` state

**Relevant Context:**
- `GET /api/auth/github` is proxied to FastAPI which returns an HTTP 302 redirect — browser follows it automatically
- `localStorage` key: `pr_radar_last_pr_url`
- Use `next/image` with `unoptimized` for GitHub avatar URLs (external domain)

---

### Sub-Task 10 — Analysis history sidebar

**Status:** `[ ] pending`

**Intent:**
Show a list of previously analyzed PRs in the left sidebar so users can revisit past results without re-running the analysis.

**Expected Outcomes:**
- Sidebar shows "Recent Analyses" section listing the last 20 analyses from the DB
- Clicking a past analysis loads it from `GET /api/analysis/{repo}/{pr_number}` — no re-analysis
- Each list item shows: repo name, PR number, risk badge color, time-ago label
- New analyses appear at the top of the list in real time

**Todo List:**
1. In `FileTree.tsx` (or a new `HistoryList.tsx`), add a "Recent" section that fetches `GET /api/analyses` on mount
2. Render each item as a clickable row with a colored left border matching risk level
3. On click: call `getAnalysis(repo, prNumber)` → load result into `analysis` state → rebuild tabs and panel
4. After every new `analyzePR()` call, prepend the result to the history list
5. Add `GET /analyses` route to FastAPI (Sub-Task 6 step 5) returning last 20 records ordered by `created_at DESC`

**Relevant Context:**
- `GET /api/analyses` is already planned in Sub-Task 6
- Time-ago labels: use a small utility `timeAgo(isoString)` — no external library needed

---

### Sub-Task 11 — `.env.example` update + README v2

**Status:** `[ ] pending`

**Intent:**
Document all new environment variables, update setup instructions for the two-process dev setup (FastAPI + Next.js), and add the GitHub App creation walkthrough.

**Expected Outcomes:**
- `.env.example` includes all 10 required/optional vars with inline comments
- `README.md` has a "GitHub App Setup" section with exact steps: what to fill in at `github.com/settings/apps/new`, what URLs to use, what permissions to request
- Dev setup section covers running both `uvicorn` and `npm run dev` concurrently

**Todo List:**
1. Update `.env.example` to add: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SECRET_KEY`
2. Update `README.md`:
   - Add "GitHub App Setup" section: name, homepage URL, webhook URL (`https://your-domain/webhook`), permissions (`Pull requests: Read`, `Contents: Read`, `Issues: Write`), events (`Pull request`, `Installation`)
   - Add "OAuth App Setup" section: callback URL (`http://localhost:3000/api/auth/callback`... via proxy)
   - Add "Dev Setup" section: two terminal commands, ports 8000 and 3000
3. Add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `.env.example` for the frontend

**Relevant Context:**
- GitHub App and OAuth App are separate registrations on GitHub — both under `github.com/settings`
- Webhook URL for local dev: use `smee.io` or `ngrok` (document both options)
