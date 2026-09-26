"use client";

import { cn } from "@/lib/utils";
import type { AnalyzeResponse, AuthUser } from "@/lib/api";
import Image from "next/image";
import { GitBranch, GitPullRequest, LogOut, CheckCircle2 } from "lucide-react";

interface StatusBarProps {
  analysis: AnalyzeResponse | null;
  prLabel: string;
  user: AuthUser | null;
  onLogout: () => void;
}

const RISK_BADGE: Record<string, { color: string; bg: string }> = {
  low: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  high: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
  unknown: { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/30" },
};

export function StatusBar({ analysis, prLabel, user, onLogout }: StatusBarProps) {
  const risk = analysis?.risk_level?.toLowerCase() ?? null;
  const badgeStyle = risk ? RISK_BADGE[risk] : null;

  return (
    <div className="flex items-center justify-between px-3 h-full bg-[#07080a] border-t border-white/[0.06] text-zinc-400 text-[11px] font-mono select-none overflow-hidden">
      
      {/* Left side: Git branch & System status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <GitBranch className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-xs">main</span>
        </div>

        <span className="text-zinc-700">|</span>

        {analysis ? (
          <div className="flex items-center gap-2 text-zinc-300">
            <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[220px] text-zinc-200">{prLabel}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{analysis.changed_files.length} changed</span>
            {analysis.impacted_files.length > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-rose-400 font-semibold">{analysis.impacted_files.length} blast radius</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500">
            <span>Ready</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-600">Press N to analyze PR</span>
          </div>
        )}
      </div>

      {/* Right side: Port telemetry, Risk badge & User info */}
      <div className="flex items-center gap-3">
        {/* Local Services */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>:8000</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>:3000</span>
          </div>
        </div>

        {risk && badgeStyle && (
          <div className={cn("px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5", badgeStyle.bg, badgeStyle.color)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{risk}</span>
          </div>
        )}

        {user ? (
          <div 
            onClick={onLogout}
            className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 rounded cursor-pointer transition-colors text-zinc-300"
            title="Click to disconnect"
          >
            <Image
              src={`https://avatars.githubusercontent.com/${user.login}?s=24`}
              alt={user.login}
              width={16}
              height={16}
              unoptimized
              className="rounded-full"
            />
            <span className="text-xs font-mono">{user.login}</span>
            <LogOut className="w-3 h-3 text-zinc-500 hover:text-rose-400" />
          </div>
        ) : (
          <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
            <span>UTF-8</span>
            <span>·</span>
            <span>LF</span>
          </div>
        )}
      </div>

    </div>
  );
}
