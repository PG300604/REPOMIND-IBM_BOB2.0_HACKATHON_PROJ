# 🛡️ PR Risk Radar v2

An autonomous full-stack AI Pull Request engineering assistant and AST Blast Radius engine — install it on your repo, and it automatically analyzes pull requests, calculates deep dependency blast radii, and provides an Obsidian-themed IDE studio.

**No personal tokens ever asked from users.** Uses GitHub App installation tokens and GitHub OAuth.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + shadcn/ui + Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| Database | SQLite via SQLAlchemy |
| Auth | GitHub App (webhooks) + GitHub OAuth (private repos) |
| AI | Groq (`llama3-8b-8192`, free) → Gemini fallback |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A **GitHub App** (for webhook auto-analysis)
- A **GitHub OAuth App** (for the "Connect GitHub" UI button)
- A **Groq API key** (free — no credit card) OR a **Gemini API key** (free)

---

## GitHub App Setup

1. Go to **github.com/Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in:
   - **GitHub App name**: `PR Risk Radar` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Webhook URL**: `https://your-domain/webhook` (use [smee.io](https://smee.io) for local dev — see below)
   - **Webhook secret**: any random string → put it in `.env` as `GITHUB_WEBHOOK_SECRET`
3. **Permissions**:
   - Repository → Pull requests: **Read & write** (to post comments)
   - Repository → Contents: **Read** (to fetch file trees)
   - Repository → Metadata: **Read**
4. **Subscribe to events**: `Pull request`, `Installation`
5. Click **Create GitHub App**
6. Note the **App ID** → `GITHUB_APP_ID` in `.env`
7. Scroll down → **Generate a private key** → download the `.pem` file
8. Copy the PEM contents, replacing newlines with `\n`, into `GITHUB_APP_PRIVATE_KEY` in `.env`

### For local webhook testing (smee.io)

```bash
npm install --global smee-client
smee --url https://smee.io/YOUR_CHANNEL --target http://localhost:8000/webhook
```

Use the smee.io URL as the webhook URL when creating the GitHub App.

---

## GitHub OAuth App Setup

1. Go to **github.com/Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `PR Risk Radar`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback`
3. Click **Register application**
4. Copy **Client ID** → `GITHUB_CLIENT_ID` in `.env`
5. Generate a **Client secret** → `GITHUB_CLIENT_SECRET` in `.env`

---

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd pr-risk-radar

# 2. Backend setup
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# 3. Environment
cp .env.example .env
# Edit .env and fill in all required values

# 4. Frontend setup
cd frontend
npm install
cd ..
```

---

## Running (two terminals)

**Terminal 1 — Backend (FastAPI):**
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend (Next.js):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** — the IDE interface loads immediately.

---

## Usage

### Browser (recommended)
1. Open **http://localhost:3000**
2. Press **`N`** or click **＋** to open the analyze modal
3. Paste a **GitHub PR URL** (public repos work instantly, private repos show "Connect GitHub")
4. Click **⚡ Analyze PR** — results appear in the diff viewer + AI review panel

### Webhook (automatic)
Install the GitHub App on any repo. Every PR open/update triggers:
1. Full analysis pipeline (diff → symbols → blast radius → LLM)
2. Analysis saved to SQLite
3. PR comment posted automatically

### curl (direct API)
```bash
# Public repo — no auth needed
curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"pr_url": "https://github.com/owner/repo/pull/42"}' | python -m json.tool

# Raw diff — no GitHub at all
curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"diff": "diff --git a/src/auth.py b/src/auth.py\n..."}' | python -m json.tool
```

---

## API Reference

### `POST /analyze`
| Field | Type | Notes |
|---|---|---|
| `pr_url` | string | Full GitHub PR URL or `owner/repo#123` |
| `repo` | string | `owner/repo` (with `pr_number`) |
| `pr_number` | int | PR number (with `repo`) |
| `diff` | string | Raw unified diff (skips GitHub fetch) |

Token resolved from: OAuth session cookie → `GITHUB_TOKEN` env → unauthenticated

### `GET /analysis/{repo}/{pr_number}`
Returns cached analysis from SQLite, or 404.

### `GET /analyses?limit=20`
Returns list of recent analyses for the history sidebar.

### `GET /auth/github` → `GET /auth/callback`
GitHub OAuth flow. Sets `session_id` cookie.

### `GET /auth/me`
Returns `{"login": "...", "authenticated": true}` or 401.

### `POST /webhook`
Receives GitHub App events. Verifies `X-Hub-Signature-256`.

---

## Project Structure

```
pr-risk-radar/
├── backend/
│   ├── main.py              # FastAPI app + all routes
│   ├── database.py          # SQLite + SQLAlchemy (analyses, sessions, installations)
│   ├── github_app.py        # GitHub App JWT + installation tokens + PR comments
│   ├── oauth.py             # GitHub OAuth flow + session cookies
│   ├── webhook.py           # Webhook handler (auto-analyze on PR events)
│   ├── github_client.py     # GitHub REST API calls (token optional)
│   ├── diff_parser.py       # Unified diff parser + regex symbol extractor
│   ├── dependency_finder.py # Repo-wide symbol reference scanner
│   └── llm_client.py        # Groq/Gemini LLM integration
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Redirects to /dashboard
│   │   └── dashboard/
│   │       └── page.tsx     # Main IDE shell
│   ├── components/
│   │   ├── Shell.tsx        # CSS grid layout
│   │   ├── FileTree.tsx     # Sidebar file tree + history
│   │   ├── DiffViewer.tsx   # Unified diff renderer
│   │   ├── ReviewPanel.tsx  # AI review right panel
│   │   ├── StatusBar.tsx    # Bottom status bar
│   │   └── AnalyzeModal.tsx # New analysis modal
│   └── lib/
│       └── api.ts           # Typed API client
├── data/
│   └── pr_radar.db          # SQLite database (auto-created)
├── requirements.txt
└── .env.example
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open "Analyze PR" modal |
| `B` | Toggle AI Review panel |
| `Esc` | Close modal |
| Double-click rail | Toggle sidebar |
