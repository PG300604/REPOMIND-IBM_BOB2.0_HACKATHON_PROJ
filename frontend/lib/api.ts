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
  summary: string
  impacted_files: string[]
  missing_tests: string[]
  changed_files: string[]
  changed_symbols: string[]
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
  try { detail = await res.json() } catch { detail = await res.text() }

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
