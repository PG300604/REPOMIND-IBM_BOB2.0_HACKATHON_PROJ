<div align="center">

# RepoMind

### Autonomous AI Code Review & AST Blast Radius Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

**An enterprise-grade, full-stack AI Pull Request engineering assistant that analyzes pull requests, calculates deep AST dependency blast radii, generates AI-powered code fixes, and creates PRs directly on GitHub — all from a VS Code-inspired Obsidian-themed IDE studio.**

[Live Demo](https://repomind-ibm-bob-2-0-hackathon-proj.vercel.app) · [Report Bug](https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/issues) · [Request Feature](https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/issues)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [IDE Studio Views](#ide-studio-views)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Environment Variables](#environment-variables)
- [Keep-Alive Cron](#keep-alive-cron)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

RepoMind is an **AI-powered autonomous code review platform** built for the **IBM BOB 2.0 Hackathon**. It provides:

1. **PR Analysis Engine** — Parses unified diffs, extracts changed symbols, and runs LLM-based risk classification.
2. **AST Blast Radius Calculator** — Scans the entire repository file tree to identify downstream consumers of every changed function, class, or variable.
3. **Full Repository Security Scanner** — AI-driven audit that detects security vulnerabilities, UI bugs, and code quality issues across every file.
4. **AI Code Fix Generator** — One-click AI-generated code patches with inline diff preview.
5. **Automated PR Creation** — Commits fixes to feature branches and opens Pull Requests directly on GitHub via the REST API.
6. **Live GitHub PR Sync** — Sidebar shows real-time pull requests synced from the GitHub API, with open/closed status badges.
7. **VS Code-Inspired IDE** — Full Obsidian Dark-themed workspace with file tree, tabbed code editor, split views, and command palette.

---

## Key Features

| Feature | Description |
|---|---|
| **PR Risk Analysis** | Classifies PRs as low/medium/high risk using Groq or Gemini LLMs |
| **AST Blast Radius** | Identifies every file in the repo that references changed symbols |
| **Full Repo Security Scan** | AI-powered vulnerability scanner across all repository files |
| **AI Code Generation** | Natural language instructions → AI-generated code patches |
| **GitHub PR Creation** | Create branches, commit files, and open PRs via GitHub API |
| **Live PR Sync** | Real-time pull request list from GitHub with state badges |
| **GitHub Webhook Support** | Auto-analyze PRs on open/update via GitHub App webhooks |
| **OAuth Authentication** | Secure GitHub OAuth flow with HTTP-only session cookies |
| **SQLite Telemetry** | Persistent storage for analyses, sessions, and workspace state |
| **Obsidian Dark Theme** | Premium VS Code-inspired UI with amber accent system |

---

## System Architecture

### High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend (Next.js 16 / Vercel)"]
        LP["Landing Page"]
        WL["Workspace Launcher"]
        IDE["IDE Studio"]
        FT["File Tree + PR Sidebar"]
        DV["Code Editor / DiffViewer"]
        RP["AI Review Panel"]
        AM["Analyze Modal"]
    end

    subgraph Server["Backend (FastAPI / Render)"]
        API["REST API Gateway"]
        GC["GitHub Client"]
        DP["Diff Parser"]
        DF["Dependency Finder"]
        LLM["LLM Client (Groq/Gemini)"]
        OA["OAuth Module"]
        WH["Webhook Handler"]
        GA["GitHub App (JWT)"]
        DB["SQLite Database"]
    end

    subgraph External["External Services"]
        GH["GitHub REST API"]
        GROQ["Groq API"]
        GEM["Gemini API"]
    end

    LP --> WL --> IDE
    IDE --> FT & DV & RP
    AM --> API

    FT -->|"PR Sync"| API
    DV -->|"File Read/Save/AI Fix/PR Create"| API
    RP -->|"Full Scan"| API

    API --> GC --> GH
    API --> DP
    API --> DF
    API --> LLM --> GROQ & GEM
    API --> OA --> GH
    API --> DB
    WH --> GA --> GH

    style Client fill:#1a1b26,stroke:#f59e0b,color:#e4e4e7
    style Server fill:#0f1117,stroke:#10b981,color:#e4e4e7
    style External fill:#0c0d12,stroke:#6366f1,color:#e4e4e7
```

### PR Analysis Pipeline

```mermaid
flowchart LR
    A["PR URL / Raw Diff"] --> B["GitHub Client\n(Fetch Diff)"]
    B --> C["Diff Parser\n(Extract Symbols)"]
    C --> D["Dependency Finder\n(Blast Radius Scan)"]
    D --> E["LLM Client\n(Risk Analysis)"]
    E --> F["Response\n(Risk + Suggestions)"]
    F --> G["SQLite\n(Persist Analysis)"]

    style A fill:#1e1e2e,stroke:#f59e0b,color:#e4e4e7
    style B fill:#1e1e2e,stroke:#10b981,color:#e4e4e7
    style C fill:#1e1e2e,stroke:#6366f1,color:#e4e4e7
    style D fill:#1e1e2e,stroke:#ef4444,color:#e4e4e7
    style E fill:#1e1e2e,stroke:#8b5cf6,color:#e4e4e7
    style F fill:#1e1e2e,stroke:#10b981,color:#e4e4e7
    style G fill:#1e1e2e,stroke:#f59e0b,color:#e4e4e7
```

### Pull Request Creation Flow

```mermaid
sequenceDiagram
    participant U as User (IDE)
    participant FE as Frontend
    participant BE as Backend
    participant GH as GitHub API

    U->>FE: Click "Create PR"
    FE->>BE: POST /repo/create-pr
    BE->>GH: GET /repos/{owner}/{repo}/git/ref/heads/{base}
    GH-->>BE: base_sha
    BE->>GH: POST /repos/{owner}/{repo}/git/refs (create branch)
    GH-->>BE: branch created
    BE->>GH: PUT /repos/{owner}/{repo}/contents/{path} (commit file)
    GH-->>BE: commit created
    BE->>GH: POST /repos/{owner}/{repo}/pulls (open PR)
    GH-->>BE: PR #{number} created
    BE-->>FE: { created: true, pr_url, pr_number }
    FE->>U: Show success + open PR in new tab
```

### Database Schema

```mermaid
erDiagram
    analyses {
        int id PK
        string repo
        int pr_number
        string risk_level
        text summary
        text raw_diff
        text changed_files
        text impacted_files
        text suggestions
        text missing_tests
        datetime created_at
    }

    oauth_sessions {
        string session_id PK
        string github_token
        string github_login
        datetime created_at
        datetime expires_at
    }

    installations {
        int installation_id PK
        string account_login
        datetime installed_at
    }

    workspaces {
        string repo PK
        string branch
        int files_count
        int open_prs_count
        int open_issues_count
        datetime last_accessed
    }

    analyses ||--o{ oauth_sessions : "authenticated_by"
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js (App Router, Turbopack) | 16.3.6 |
| **UI Framework** | React | 19.2.8 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS + Obsidian Dark Theme | 4.x |
| **UI Components** | shadcn/ui + Radix Primitives + Lucide Icons | Latest |
| **Backend** | FastAPI | 0.115+ |
| **Language** | Python | 3.12+ |
| **Database** | SQLite via SQLAlchemy | Core |
| **AI (Primary)** | Groq (llama-3.3-70b-versatile) | Free Tier |
| **AI (Fallback)** | Google Gemini (gemini-2.0-flash) | Free Tier |
| **Auth** | GitHub OAuth + GitHub App JWT (RS256) | — |
| **Hosting (Backend)** | Render | Free Tier |
| **Hosting (Frontend)** | Vercel | Free Tier |
| **CI/CD** | GitHub Actions (Keep-Alive Cron) | — |

---

## Project Structure

```
RepoMind/
├── backend/                          # FastAPI Backend
│   ├── __init__.py
│   ├── main.py                       # FastAPI app, all REST routes, CORS
│   ├── github_client.py              # GitHub REST API (PRs, files, branches, commits)
│   ├── diff_parser.py                # Unified diff parser + regex symbol extractor
│   ├── dependency_finder.py          # AST blast radius — repo-wide symbol scanner
│   ├── llm_client.py                 # Groq/Gemini LLM integration (risk analysis)
│   ├── database.py                   # SQLite + SQLAlchemy (analyses, sessions, workspaces)
│   ├── github_app.py                 # GitHub App JWT auth + PR comment posting
│   ├── oauth.py                      # GitHub OAuth flow + session cookies
│   ├── webhook.py                    # GitHub webhook handler (auto-analyze on PR events)
│   └── models.py                     # Pydantic models
│
├── frontend/                         # Next.js 16 Frontend
│   ├── app/
│   │   ├── layout.tsx                # Root layout with global styles
│   │   ├── page.tsx                  # Landing page (animated hero + tech stack)
│   │   └── dashboard/
│   │       └── page.tsx              # Main IDE shell (VS Code layout)
│   ├── components/
│   │   ├── Shell.tsx                 # CSS grid layout engine (rail + sidebar + main + panel)
│   │   ├── FileTree.tsx              # Sidebar: file tree, PRs, issues, history
│   │   ├── DiffViewer.tsx            # Code editor with syntax highlighting, AI fix, PR creation
│   │   ├── ReviewPanel.tsx           # AI review panel + full repo security scanner
│   │   ├── AnalyzeModal.tsx          # PR analysis dialog (URL or raw diff input)
│   │   ├── WorkspaceLauncher.tsx     # Repository selector / workspace launcher
│   │   ├── StatusBar.tsx             # Bottom status bar (risk badge, auth status)
│   │   ├── MoltenMetal.tsx           # WebGL animated background (landing page)
│   │   ├── LogoLoop.tsx              # Scrolling tech stack logo ticker
│   │   ├── SpecularButton.tsx        # Custom animated CTA button
│   │   └── views/
│   │       ├── ArchitectureGraphView.tsx   # Interactive node graph visualization
│   │       ├── GitBlastView.tsx            # Git blast radius / staging consequence
│   │       ├── DatabaseView.tsx            # SQLite telemetry & performance dashboard
│   │       ├── CatalogView.tsx             # AI-generated API documentation & schemas
│   │       ├── WebhookSyncView.tsx         # GitHub webhook synchronization panel
│   │       └── ToolsConfigView.tsx         # Tools, models & configuration studio
│   ├── lib/
│   │   ├── api.ts                    # Fully typed API client (all endpoints)
│   │   └── utils.ts                  # Utility functions (cn, classnames)
│   ├── next.config.ts                # Next.js config (API rewrites to backend)
│   ├── vercel.json                   # Vercel deployment config
│   ├── package.json                  # Node.js dependencies
│   └── tsconfig.json                 # TypeScript configuration
│
├── scripts/
│   └── keep_alive_ping.py            # Standalone keep-alive daemon for Render
│
├── .github/
│   └── workflows/
│       └── keep_alive.yml            # GitHub Actions cron (10min Render ping)
│
├── data/
│   └── pr_radar.db                   # SQLite database (auto-created)
│
├── render.yaml                       # Render blueprint (1-click deploy)
├── requirements.txt                  # Python dependencies
├── LICENSE                           # MIT License
└── README.md                         # This file
```

---

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** (with npm)
- A **Groq API key** ([free — no credit card](https://console.groq.com)) or a **Gemini API key** ([free](https://aistudio.google.com))
- A **GitHub personal access token** (for repo access and PR creation)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ.git
cd REPOMIND-IBM_BOB2.0_HACKATHON_PROJ

# 2. Backend setup
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

# 3. Environment variables
cp .env.example .env
# Edit .env — fill in GITHUB_TOKEN, GROQ_API_KEY, etc.

# 4. Frontend setup
cd frontend
npm install
cd ..
```

### Running Locally

Open **two terminals**:

**Terminal 1 — Backend (FastAPI on port 8000):**
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend (Next.js on port 3000):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** — the IDE loads immediately.

---

## Deployment

### Backend → Render

1. Push code to GitHub.
2. Go to [render.com/new](https://dashboard.render.com/new) → **Blueprint** → select repo.
3. Render auto-detects `render.yaml` and deploys.
4. Add environment variables in Render dashboard:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope |
| `GROQ_API_KEY` | Groq API key for LLM |
| `GEMINI_API_KEY` | Gemini API key (fallback) |
| `SECRET_KEY` | Random string for session signing |
| `CORS_ALLOWED_ORIGINS` | Frontend URL (e.g. `https://your-app.vercel.app`) |

### Frontend → Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import the GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Add environment variable:

| Variable | Value |
|---|---|
| `BACKEND_URL` | Your Render backend URL (no trailing slash) |

4. Click **Deploy**.

---

## API Reference

### Core Analysis

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check (returns `{"status": "ok"}`) |
| `POST` | `/analyze` | Analyze a PR by URL, repo+number, or raw diff |
| `GET` | `/analysis/{repo}/{pr_number}` | Retrieve cached analysis from SQLite |
| `GET` | `/analyses?limit=20` | List recent analyses for history sidebar |

### Repository Workspace

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/repo/workspace` | Fetch repo metadata, file tree, PRs, issues |
| `GET` | `/workspaces` | List recent workspace sessions |
| `DELETE` | `/workspaces/{repo}` | Delete a workspace session |
| `GET` | `/repo/pulls` | Fetch real pull requests from GitHub |

### File Operations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/repo/file-content` | Read file content from GitHub or local disk |
| `POST` | `/repo/file-content` | Save file content to local disk |

### AI & Code Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/repo/full-scan` | Full repository security & quality audit |
| `POST` | `/ai/generate-code` | AI code generation from natural language |
| `POST` | `/repo/create-pr` | Create branch, commit files, open PR on GitHub |

### GitHub Integration

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/github-app/simulate-review` | Simulate autonomous PR review comment |
| `GET` | `/auth/github` | Initiate GitHub OAuth flow |
| `GET` | `/auth/callback` | OAuth callback (sets session cookie) |
| `GET` | `/auth/me` | Get authenticated user info |
| `GET` | `/auth/logout` | Clear session and logout |
| `POST` | `/webhook` | Receive GitHub App webhook events |

---

## IDE Studio Views

The dashboard provides **7 specialized views** accessible from the left activity rail:

| View | Icon | Description |
|---|---|---|
| **Code Editor** | `FileCode` | Tabbed code editor with syntax highlighting, line numbers, AI code fix, and PR creation modal |
| **API Catalog** | `BookOpen` | AI-generated API documentation with endpoint schemas and changelog |
| **Database** | `Database` | SQLite telemetry dashboard with table browser and performance metrics |
| **Git Blast Radius** | `GitBranch` | Visual blast radius showing all files impacted by symbol changes |
| **Architecture Graph** | `Network` | Interactive node graph of the codebase architecture |
| **Webhook Sync** | `Cloud` | GitHub webhook event monitor and PR review simulator |
| **Tools & Config** | `Wrench` | Model configuration, keyboard shortcuts, and studio guide |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `N` | Open "Analyze PR" modal |
| `B` | Toggle AI Review panel |
| `Ctrl+S` | Save current file in editor |
| `Ctrl+K` | Open command palette / analyze modal |
| `Esc` | Close active modal |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
GITHUB_TOKEN=ghp_your_personal_access_token
GROQ_API_KEY=gsk_your_groq_api_key
SECRET_KEY=any-random-secret-string

# Optional (fallback AI provider)
GEMINI_API_KEY=your_gemini_api_key

# Optional (GitHub OAuth — only needed for multi-user login)
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret

# Optional (GitHub App — only needed for webhook auto-analysis)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----

# Optional (CORS — defaults to localhost:3000)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## Keep-Alive Cron

Render's free tier spins down web services after **15 minutes of inactivity**. A GitHub Actions workflow pings the `/health` endpoint every **10 minutes** to keep the backend permanently awake:

**`.github/workflows/keep_alive.yml`** runs on schedule `*/10 * * * *`.

### Setup:
1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
2. Add secret: `RENDER_BACKEND_URL` = your Render service URL.
3. The cron auto-activates on push to `main`.

A standalone Python script is also available:
```bash
python scripts/keep_alive_ping.py https://your-render-url.onrender.com 10
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

**Built with precision for the IBM BOB 2.0 Hackathon 2026**

Made by [PG300604](https://github.com/PG300604)

</div>
