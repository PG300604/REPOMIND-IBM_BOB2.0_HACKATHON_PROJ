"use client";

import { cn } from "@/lib/utils";

interface FileTreeProps {
  changedFiles: string[];
  impactedFiles: string[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
  history: Array<{
    id: string;
    repo: string;
    pr_number: number;
    risk_level: string;
    created_at: string;
  }>;
  onHistoryClick: (repo: string, prNumber: number) => void;
}

function groupByFolder(paths: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const path of paths) {
    const parts = path.split("/");
    const folder = parts.length > 1 ? parts[0] : "(root)";
    (groups[folder] = groups[folder] || []).push(path);
  }
  return groups;
}

const RISK_DOT: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
  unknown: "bg-gray-500",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function FileTree({
  changedFiles,
  impactedFiles,
  activeFile,
  onFileClick,
  history,
  onHistoryClick,
}: FileTreeProps) {
  const changedGroups = groupByFolder(changedFiles);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-y-auto flex-1 pb-2">
        {/* Changed files */}
        {changedFiles.length === 0 && history.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-[#484f58] leading-loose">
            No PR loaded.
          </div>
        )}

        {changedFiles.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
              Changed Files
            </div>
            {Object.entries(changedGroups).map(([folder, files]) => (
              <div key={folder}>
                <div className="flex items-center gap-1.5 px-3 py-0.5 text-xs text-[#c9d1d9] cursor-default select-none hover:bg-[#1f2937]">
                  <span className="text-[9px] text-[#8b949e]">▶</span>
                  <span>📁 {folder}</span>
                </div>
                {files.map((path) => {
                  const name = path.split("/").pop()!;
                  return (
                    <div
                      key={path}
                      onClick={() => onFileClick(path)}
                      className={cn(
                        "flex items-center gap-1.5 pl-7 pr-3 py-0.5 text-xs cursor-pointer",
                        "text-[#e3b341] hover:bg-[#1f2937]",
                        activeFile === path && "bg-[#1f6feb22] !text-[#58a6ff]"
                      )}
                    >
                      <span>📄 {name}</span>
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e3b341] flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* Blast radius */}
        {impactedFiles.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
              Blast Radius
            </div>
            {impactedFiles.map((path) => {
              const name = path.split("/").pop()!;
              return (
                <div
                  key={path}
                  title={path}
                  className="flex items-center gap-1.5 pl-4 pr-3 py-0.5 text-xs text-[#e3b341] hover:bg-[#1f2937] cursor-default overflow-hidden"
                >
                  <span>⚡</span>
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
              Recent
            </div>
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => onHistoryClick(item.repo, item.pr_number)}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#1f2937] group"
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    RISK_DOT[item.risk_level] || "bg-gray-500"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#c9d1d9] truncate">
                    {item.repo.split("/")[1] || item.repo}
                  </div>
                  <div className="text-[10px] text-[#8b949e]">
                    #{item.pr_number} · {timeAgo(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
