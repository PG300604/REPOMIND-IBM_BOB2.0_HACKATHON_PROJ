"use client";

import { useState } from "react";
import { analyzePR, ApiError, type AnalyzeResponse } from "@/lib/api";

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
      setError("Provide a PR URL or paste a raw diff.");
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

      onResult(result, prUrl.trim() || "Raw Diff", diff.trim());
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.requiresAuth) {
          setRequiresAuth(true);
          setError("This repository requires authentication.");
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
    // Store current PR URL before redirecting
    if (prUrl.trim()) {
      localStorage.setItem("pr_radar_last_pr_url", prUrl.trim());
    }
    window.location.href = "/api/auth/github";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-[480px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h3 className="text-sm font-semibold text-[#c9d1d9]">🛡️ Analyze Pull Request</h3>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#c9d1d9] text-lg leading-none bg-none border-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-5 flex flex-col gap-3.5">
            {/* PR URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8b949e]">
                PR URL{" "}
                <span className="text-[#484f58] font-normal">or</span>{" "}
                <code className="bg-[#0d1117] px-1 py-0.5 rounded text-[11px]">owner/repo#123</code>
              </label>
              <input
                type="text"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/42"
                className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#c9d1d9] outline-none focus:border-[#58a6ff] transition-colors placeholder:text-[#484f58]"
              />
            </div>

            {/* Raw diff */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8b949e]">
                Raw Diff{" "}
                <span className="text-[#484f58] font-normal">(optional — paste unified diff directly)</span>
              </label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder={"diff --git a/src/auth.py b/src/auth.py\n--- a/src/auth.py\n+++ b/src/auth.py\n..."}
                rows={5}
                className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#c9d1d9] font-mono outline-none focus:border-[#58a6ff] transition-colors resize-y placeholder:text-[#484f58]"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#2d0f0f] border border-[#5c1a1a] rounded-md px-3 py-2 text-xs text-[#f85149]">
                ⚠ {error}
              </div>
            )}

            {/* Connect GitHub CTA */}
            {requiresAuth && (
              <button
                type="button"
                onClick={handleConnectGitHub}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-md border border-[#30363d] text-xs text-[#c9d1d9] hover:border-[#8b949e] hover:bg-[#21262d] transition-colors"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                Connect GitHub Account
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[#21262d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-[#30363d] text-xs text-[#8b949e] hover:border-[#8b949e] hover:text-[#c9d1d9] transition-colors bg-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#238636] border border-[#2ea043] text-xs font-semibold text-white hover:bg-[#2ea043] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading && (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? "Analyzing…" : "⚡ Analyze PR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
