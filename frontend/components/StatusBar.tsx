"use client";

import { cn } from "@/lib/utils";
import type { AnalyzeResponse, AuthUser } from "@/lib/api";
import Image from "next/image";

interface StatusBarProps {
  analysis: AnalyzeResponse | null;
  prLabel: string;
  user: AuthUser | null;
  onLogout: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low:     "text-[#3fb950]",
  medium:  "text-[#e3b341]",
  high:    "text-[#f85149]",
  unknown: "text-[#8b949e]",
};

export function StatusBar({ analysis, prLabel, user, onLogout }: StatusBarProps) {
  const risk = analysis?.risk_level?.toLowerCase() ?? null;

  return (
    <div className="flex items-center px-3 gap-4 bg-[#1f6feb] text-white text-[11px] h-full overflow-hidden whitespace-nowrap">
      {/* Repo / PR label */}
      <div className="flex items-center gap-1.5 opacity-90">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.103.303c.066.019.176.011.299-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.717.645 7.263.095 8.006.031A8.19 8.19 0 0 1 8 0Z" />
        </svg>
        <span>PR Risk Radar</span>
      </div>

      {/* PR info */}
      {analysis && (
        <div className="flex items-center gap-1.5 opacity-90">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h.538A1.962 1.962 0 0 1 12.5 4.462v9.538a2.25 2.25 0 1 1-1.5 0V4.462a.462.462 0 0 0-.462-.462H10v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
          </svg>
          <span className="truncate max-w-[240px]">{prLabel}</span>
          <span className="opacity-60">·</span>
          <span>{analysis.changed_files.length} file(s)</span>
        </div>
      )}

      {/* Risk level — pushed right */}
      {risk && (
        <span className={cn("ml-auto font-bold", RISK_COLORS[risk] || "text-[#8b949e]")}>
          ⬤ {risk.toUpperCase()}
        </span>
      )}

      {/* User avatar */}
      {user && (
        <div className="flex items-center gap-1.5 ml-2 cursor-pointer" onClick={onLogout} title="Click to disconnect">
          <Image
            src={`https://avatars.githubusercontent.com/${user.login}?s=24`}
            alt={user.login}
            width={18}
            height={18}
            className="rounded-full"
            unoptimized
          />
          <span className="text-white opacity-90">{user.login}</span>
        </div>
      )}
    </div>
  );
}
