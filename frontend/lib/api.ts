/**
 * Typed API client for the FastAPI backend.
 * All calls go through Next.js rewrites (proxied from /api/* → localhost:8000/*)
 */

const BASE = "/api"

// ── Types ──────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  pr_url?: string
  repo?: string
  pr_number?: number
  diff?: string
}

export interface AnalyzeResponse {
  risk_level: "low" | "medium" | "high" | "unknown"
  risk_score?: number
  summary: string
  impacted_files: string[]
  missing_tests: string[]
  changed_files: string[]
  changed_symbols: string[]
  suggestions?: string[]
  raw_diff?: string
}

export interface AnalysisRecord extends AnalyzeResponse {
  id: string
  repo: string
  pr_number: number
  raw_diff?: string
  created_at: string
}

export interface AuthUser {
  login: string
  authenticated: boolean
}

// ── Error handling ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public requiresAuth: boolean = false
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>

  let detail: unknown
  try {
    const rawText = await res.text()
    try {
      detail = JSON.parse(rawText)
    } catch {
      detail = rawText
    }
  } catch {
    detail = "Failed to parse server response"
  }

  const requiresAuth =
    res.status === 401 &&
    typeof detail === "object" &&
    detail !== null &&
    (detail as Record<string, unknown>).requires_auth === true

  const message =
    typeof detail === "object" && detail !== null
      ? ((detail as Record<string, unknown>).message as string) ??
        ((detail as Record<string, unknown>).detail as string) ??
        res.statusText
      : String(detail) || res.statusText

  throw new ApiError(res.status, message, requiresAuth)
}

// ── Analysis ───────────────────────────────────────────────────────────────

export async function analyzePR(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(req),
  })
  return handleResponse<AnalyzeResponse>(res)
}

export async function getAnalysis(
  repo: string,
  prNumber: number
): Promise<AnalysisRecord | null> {
  const res = await fetch(`${BASE}/analysis/${encodeURIComponent(repo)}/${prNumber}`, {
    credentials: "include",
  })
  if (res.status === 404) return null
  return handleResponse<AnalysisRecord>(res)
}

export async function listAnalyses(limit = 20): Promise<AnalysisRecord[]> {
  const res = await fetch(`${BASE}/analyses?limit=${limit}`, {
    credentials: "include",
  })
  return handleResponse<AnalysisRecord[]>(res)
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/auth/me`, { credentials: "include" })
  if (res.status === 401) return null
  return handleResponse<AuthUser>(res)
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { credentials: "include" })
}

// ── Utilities ──────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Workspace & Sessions ───────────────────────────────────────────────────

export interface PullRequestItem {
  number: number
  title: string
  user: string
  state: string
  created_at: string
  head_branch?: string
  base_branch?: string
  html_url?: string
}

export interface IssueItem {
  number: number
  title: string
  user: string
  state: string
  comments: number
  created_at: string
  labels: string[]
  html_url: string
}

export interface WorkspaceSession {
  id: string
  repo: string
  branch: string
  files_count: number
  open_prs_count: number
  open_issues_count: number
  last_opened_at: string
}

export interface RepoWorkspaceData {
  repo: string
  branch: string
  branches: string[]
  meta: {
    name: string
    full_name: string
    description: string
    default_branch: string
    stars: number
    forks: number
  }
  files: string[]
  pull_requests: PullRequestItem[]
  issues: IssueItem[]
  session: WorkspaceSession
}

export interface AutonomousReviewResult {
  repo: string
  pr_number: number
  risk_level: string
  comment_markdown: string
  dashboard_deep_link: string
  posted: boolean
  error?: string | null
}


export async function getRepoWorkspace(repo: string, branch = "main"): Promise<RepoWorkspaceData> {
  const res = await fetch(`${BASE}/repo/workspace?repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`, {
    credentials: "include",
  })
  return handleResponse<RepoWorkspaceData>(res)
}

export async function listWorkspaces(): Promise<WorkspaceSession[]> {
  const res = await fetch(`${BASE}/workspaces`, { credentials: "include" })
  return handleResponse<WorkspaceSession[]>(res)
}

export async function deleteWorkspace(repo: string): Promise<void> {
  await fetch(`${BASE}/workspaces/${encodeURIComponent(repo)}`, {
    method: "DELETE",
    credentials: "include",
  })
}

export async function simulatePrReview(
  repo: string,
  prNumber: number,
  diff = "",
  postToGithub = false
): Promise<AutonomousReviewResult> {
  const res = await fetch(`${BASE}/github-app/simulate-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      repo,
      pr_number: prNumber,
      diff,
      post_to_github: postToGithub,
    }),
  })
  return handleResponse<AutonomousReviewResult>(res)
}

export interface RepoFileContent {
  repo: string
  path: string
  branch: string
  content: string
  source: string
  size: number
  saved?: boolean
}

export async function getRepoFileContent(
  repo: string,
  path: string,
  branch = "main"
): Promise<RepoFileContent> {
  const res = await fetch(
    `${BASE}/repo/file-content?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`,
    { credentials: "include" }
  )
  return handleResponse<RepoFileContent>(res)
}

export async function saveRepoFileContent(
  repo: string,
  path: string,
  content: string,
  branch = "main"
): Promise<{ saved: boolean; path: string; source: string; size: number }> {
  const res = await fetch(`${BASE}/repo/file-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ repo, path, content, branch }),
  })
  return handleResponse<{ saved: boolean; path: string; source: string; size: number }>(res)
}

// ── Full Repo Audit & Security Vulnerability Scan ─────────────────────────

export interface RepoAuditFinding {
  id: string
  category: "security" | "ui" | "bug"
  severity: "critical" | "high" | "medium" | "low"
  title: string
  file: string
  description: string
  recommendation: string
  suggested_patch?: string
  proposed_pr_title: string
  proposed_pr_branch: string
}

export interface RepoAuditResult {
  repo: string
  scanned_files_count: number
  summary: string
  security_score: number
  findings: RepoAuditFinding[]
}

export async function scanFullRepository(repo: string, branch = "main"): Promise<RepoAuditResult> {
  const res = await fetch(`${BASE}/repo/full-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ repo, branch }),
  })
  return handleResponse<RepoAuditResult>(res)
}

// ── AI Code Generation & Fix Engine ───────────────────────────────────────

export interface AiCodeFixResult {
  file_path: string
  explanation: string
  revised_content: string
  diff: string
}

export async function generateAiCode(
  filePath: string,
  instruction: string,
  currentContent?: string
): Promise<AiCodeFixResult> {
  const res = await fetch(`${BASE}/ai/generate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      file_path: filePath,
      instruction,
      current_content: currentContent,
    }),
  })
  return handleResponse<AiCodeFixResult>(res)
}

// ── Pull Request Creation on GitHub ───────────────────────────────────────

export interface CreatePrPayload {
  repo: string
  title: string
  body: string
  branch: string
  base_branch?: string
  files: Array<{ path: string; content: string }>
}

export interface CreatePrResult {
  created: boolean
  pr_url: string
  pr_number?: number | null
  branch: string
  mode: string
  message: string
}

export async function createPullRequest(data: CreatePrPayload): Promise<CreatePrResult> {
  const owner = data.repo.includes("/") ? data.repo.split("/")[0] : "";
  const branchTarget = owner ? `${owner}:${data.branch}` : data.branch;
  const fallbackUrl = `https://github.com/${data.repo}/compare/${data.base_branch || "main"}...${branchTarget}?expand=1&quick_pull=1&title=${encodeURIComponent(data.title)}&body=${encodeURIComponent(data.body)}`;

  try {
    const res = await fetch(`${BASE}/repo/create-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
    return await handleResponse<CreatePrResult>(res)
  } catch (err: any) {
    console.warn("createPullRequest network fallback:", err)
    return {
      created: false,
      pr_url: fallbackUrl,
      pr_number: null,
      branch: data.branch,
      mode: "client_fallback",
      message: "Branch prepared. Click below to review and submit your Pull Request on GitHub.",
    }
  }
}


