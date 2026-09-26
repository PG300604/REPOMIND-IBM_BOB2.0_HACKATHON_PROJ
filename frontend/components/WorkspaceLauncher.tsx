"use client";

import { useState, useEffect } from "react";
import { 
  GitBranch, 
  ArrowRight, 
  FolderGit2, 
  Clock, 
  Trash2, 
  Loader2, 
  Search,
  ExternalLink,
  Layers,
  GitPullRequest,
  AlertCircle
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { listWorkspaces, deleteWorkspace, timeAgo, type WorkspaceSession } from "@/lib/api";

interface WorkspaceLauncherProps {
  onSelectWorkspace: (repo: string, branch?: string) => Promise<void>;
  loading: boolean;
  loadingStep: string;
}

const DEFAULT_REPO = "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ";

const QUICK_REPOS = [
  { label: "IBM BOB 2.0 Hackathon Project", repo: "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ", branch: "main" },
  { label: "FastAPI Framework", repo: "fastapi/fastapi", branch: "master" },
  { label: "Flask Web Server", repo: "pallets/flask", branch: "main" },
];

export function WorkspaceLauncher({
  onSelectWorkspace,
  loading,
  loadingStep,
}: WorkspaceLauncherProps) {
  const [repoInput, setRepoInput] = useState(DEFAULT_REPO);
  const [branchInput, setBranchInput] = useState("main");
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await listWorkspaces();
      setSessions(data);
    } catch {
      // Local fallback if unauthenticated or offline
      const stored = localStorage.getItem("repomind_past_sessions");
      if (stored) {
        try {
          setSessions(JSON.parse(stored));
        } catch {}
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = repoInput.trim();
    if (!trimmed) {
      setError("Please provide a valid GitHub repository URL or owner/repo shorthand.");
      return;
    }
    try {
      await onSelectWorkspace(trimmed, branchInput.trim() || "main");
    } catch (err: any) {
      setError(err?.message || "Failed to initialize repository workspace.");
    }
  }

  async function handleDeleteSession(repo: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteWorkspace(repo);
    } catch {}
    const updated = sessions.filter((s) => s.repo !== repo);
    setSessions(updated);
    localStorage.setItem("repomind_past_sessions", JSON.stringify(updated));
  }

  return (
    <div className="min-h-screen w-full bg-[#07080a] text-zinc-100 flex flex-col font-sans select-none overflow-y-auto">
      
      {/* ── Top Bar ── */}
      <header className="h-12 border-b border-white/[0.06] bg-[#07080a] px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
            RM
          </div>
          <span className="font-mono font-bold text-xs tracking-[0.2em] uppercase text-zinc-200">
            RepoMind Workspace Studio
          </span>
          <span className="text-[10px] font-mono text-zinc-500 border border-white/[0.08] px-2 py-0.5 rounded">
            v0.2.0
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <a
            href="https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* ── Main Launcher Canvas ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        
        {/* Intro Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs font-mono uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Interactive Codebase & PR Explorer</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-zinc-100">
            Initialize Repository Session
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Enter any public or private GitHub repository. RepoMind maps the workspace tree, syncs open pull requests, and activates automated risk intelligence.
          </p>
        </div>

        {/* Connect Repo Form Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              
              {/* Repository input */}
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>GitHub Repository URL / Shorthand</span>
                  <span className="text-zinc-600 font-normal">owner/repo</span>
                </label>
                <div className="relative flex items-center">
                  <SiGithub className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="e.g. PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#07080a] border border-white/[0.08] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-400/70 transition-colors"
                  />
                </div>
              </div>

              {/* Branch input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Branch
                </label>
                <div className="relative flex items-center">
                  <GitBranch className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    placeholder="main"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#07080a] border border-white/[0.08] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-400/70 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Pick Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Quick Select Repository
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPOS.map((item) => (
                  <button
                    key={item.repo}
                    type="button"
                    onClick={() => {
                      setRepoInput(item.repo);
                      setBranchInput(item.branch);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/30 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderGit2 className="w-3 h-3 text-amber-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>{loadingStep || "Initializing Workspace..."}</span>
                  </>
                ) : (
                  <>
                    <span>Pull Files & Open Explorer</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Past Sessions Bar / Shelf ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Past Workspace Sessions ({sessions.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Click any past session to immediately resume editing
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#0c0d12]/50 p-6 text-center text-xs font-mono text-zinc-500">
              No previous repository sessions recorded yet. Enter a repo URL above to start your first session.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map((sess) => (
                <div
                  key={sess.id || sess.repo}
                  onClick={() => onSelectWorkspace(sess.repo, sess.branch)}
                  className="rounded-xl border border-white/[0.06] bg-[#0c0d12] hover:bg-white/[0.03] hover:border-amber-400/40 p-4 transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 truncate pr-2">
                      <div className="font-mono text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors truncate">
                        {sess.repo}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-zinc-500" />
                          <span>{sess.branch || "main"}</span>
                        </span>
                        <span>·</span>
                        <span>{timeAgo(sess.last_opened_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(sess.repo, e)}
                      className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span>{sess.files_count || 0} files</span>
                      <span>·</span>
                      <span className="text-amber-400/90">{sess.open_prs_count || 0} PRs</span>
                      <span>·</span>
                      <span>{sess.open_issues_count || 0} issues</span>
                    </div>

                    <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[10px] uppercase">
                      Resume →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
