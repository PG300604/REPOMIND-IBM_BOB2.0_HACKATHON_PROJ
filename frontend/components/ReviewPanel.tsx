"use client";

import { cn } from "@/lib/utils";
import type { AnalyzeResponse } from "@/lib/api";

interface ReviewPanelProps {
  analysis: AnalyzeResponse | null;
  onClose: () => void;
}

const RISK_CONFIG = {
  low:     { label: "LOW",     bg: "bg-[#0f2d1a]",  text: "text-[#3fb950]",  border: "border-[#1a4731]",  dot: "bg-[#3fb950]"  },
  medium:  { label: "MEDIUM",  bg: "bg-[#2d1f00]",  text: "text-[#e3b341]",  border: "border-[#4a3200]",  dot: "bg-[#e3b341]"  },
  high:    { label: "HIGH",    bg: "bg-[#2d0f0f]",  text: "text-[#f85149]",  border: "border-[#5c1a1a]",  dot: "bg-[#f85149]"  },
  unknown: { label: "UNKNOWN", bg: "bg-[#1c2128]",  text: "text-[#8b949e]",  border: "border-[#30363d]",  dot: "bg-[#8b949e]"  },
} as const;

export function ReviewPanel({ analysis, onClose }: ReviewPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#161b22] border-l border-[#21262d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d] flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8b949e]">
          🤖 AI Review
        </span>
        <button
          onClick={onClose}
          className="text-[#8b949e] hover:text-[#c9d1d9] text-sm leading-none bg-none border-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {!analysis ? (
          <div className="text-xs text-[#484f58] italic">Run an analysis to see results.</div>
        ) : (
          <>
            {/* Risk badge */}
            <Section title="Risk Assessment">
              <RiskBadge level={analysis.risk_level} />
            </Section>

            {/* Summary */}
            <Section title="Summary">
              <div className="text-xs leading-relaxed text-[#c9d1d9] bg-[#0d1117] border border-[#21262d] rounded-md px-3 py-2.5">
                {analysis.summary || "—"}
              </div>
            </Section>

            {/* Symbols */}
            {analysis.changed_symbols.length > 0 && (
              <Section title="Changed Symbols">
                <div className="flex flex-wrap gap-1">
                  {analysis.changed_symbols.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[11px] bg-[#1c2a4a] border border-[#1f4080] text-[#79c0ff] rounded px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Blast radius */}
            <Section title={`Blast Radius (${analysis.impacted_files.length} files)`}>
              {analysis.impacted_files.length === 0 ? (
                <div className="text-xs text-[#484f58] italic">No dependent files detected.</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {analysis.impacted_files.map((f) => (
                    <span
                      key={f}
                      className="font-mono text-[11px] bg-[#0d1117] border border-[#21262d] text-[#8b949e] rounded px-2 py-0.5 flex items-center gap-1 hover:border-[#58a6ff] hover:text-[#58a6ff] cursor-default"
                    >
                      <span className="text-[#e3b341]">⚡</span>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            {/* Tests */}
            <Section title="Suggested Missing Tests">
              {analysis.missing_tests.length === 0 ? (
                <div className="text-xs text-[#484f58] italic">No suggestions returned.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {analysis.missing_tests.map((t, i) => (
                    <div
                      key={i}
                      className="flex gap-2 items-start bg-[#0d1117] border border-[#21262d] border-l-[3px] border-l-[#58a6ff] rounded-r-md px-3 py-2"
                    >
                      <span className="text-[#58a6ff] font-bold text-[11px] flex-shrink-0 min-w-[16px]">{i + 1}</span>
                      <span className="text-xs text-[#c9d1d9] leading-relaxed">{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">{title}</div>
      {children}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
        cfg.bg, cfg.text, cfg.border
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
