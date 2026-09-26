"use client";

import { useState } from "react";
import { analyzePR, ApiError, type AnalyzeResponse } from "@/lib/api";
import { GitPullRequest, X, AlertTriangle, Loader2 } from "lucide-react";
import { SiGithub } from "react-icons/si";

interface AnalyzeModalProps {
  open: boolean;
  onClose: () => void;
  onResult: (result: AnalyzeResponse, prLabel: string, rawDiff: string) => void;
}

export function AnalyzeModal({ open, onClose, onResult }: AnalyzeModalProps) {
  const [prUrl, setPrUrl] = useState("");
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRequiresAuth(false);

    if (!prUrl.trim() && !diff.trim()) {
      setError("Provide a GitHub PR URL or paste a unified diff.");
      return;
    }

    setLoading(true);
    try {
      const req: Parameters<typeof analyzePR>[0] = {};
      if (prUrl.trim()) req.pr_url = prUrl.trim();
      if (diff.trim()) req.diff = diff.trim();

      const result = await analyzePR(req);

      // Store last PR URL for OAuth retry
      if (prUrl.trim()) {
        localStorage.setItem("pr_radar_last_pr_url", prUrl.trim());
      }

      onResult(result, prUrl.trim() || "Unified Diff", diff.trim());
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.requiresAuth) {
          setRequiresAuth(true);
          setError("This repository requires GitHub authentication.");
        } else {
          setError(err.message);
        }
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleConnectGitHub() {
    if (prUrl.trim()) {
      localStorage.setItem("pr_radar_last_pr_url", prUrl.trim());
    }
    window.location.href = "/api/auth/github";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0d12] border border-white/[0.08] rounded-2xl w-full max-w-[500px] shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#090a0f]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-100">
                Analyze Pull Request
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                Inspect AST blast radius and risk score
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 flex flex-col gap-4">
            
            {/* PR URL input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Pull Request URL</span>
                <span className="text-zinc-600 font-normal">or owner/repo#123</span>
              </label>
              <input
                type="text"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/42"
                className="bg-[#07080a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-amber-400/70 transition-colors placeholder:text-zinc-600"
              />
            </div>

            {/* Raw Unified Diff */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Raw Diff</span>
                <span className="text-zinc-600 font-normal">Optional</span>
              </label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder={"diff --git a/backend/main.py b/backend/main.py\n--- a/backend/main.py\n+++ b/backend/main.py\n@@ -10,4 +10,6 @@\n..."}
                rows={5}
                className="bg-[#07080a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-amber-400/70 transition-colors resize-y placeholder:text-zinc-700 leading-relaxed"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="font-mono text-[11px]">{error}</span>
              </div>
            )}

            {/* Connect GitHub OAuth */}
            {requiresAuth && (
              <button
                type="button"
                onClick={handleConnectGitHub}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-zinc-200 transition-colors"
              >
                <SiGithub className="w-4 h-4 text-zinc-100" />
                <span>Connect GitHub Account</span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-white/[0.06] bg-[#090a0f]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Analyzing..." : "Analyze Pull Request"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
