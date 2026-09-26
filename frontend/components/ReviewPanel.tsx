"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AnalyzeResponse, RepoAuditResult, RepoAuditFinding } from "@/lib/api";
import { scanFullRepository } from "@/lib/api";
import { 
  X, 
  Shield, 
  Activity, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Search, 
  Sparkles, 
  GitPullRequest, 
  Check, 
  Loader2, 
  Bug, 
  Layout, 
  ArrowRight 
} from "lucide-react";

interface ReviewPanelProps {
  analysis: AnalyzeResponse | null;
  onClose: () => void;
  repo?: string;
  branch?: string;
  onApplyFix?: (finding: RepoAuditFinding) => void;
  onCreatePrForFinding?: (finding: RepoAuditFinding) => void;
  defaultTab?: "pr" | "audit";
}

const RISK_CONFIG = {
  low: { 
    label: "LOW RISK", 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-400", 
    border: "border-emerald-500/30", 
    dot: "bg-emerald-400" 
  },
  medium: { 
    label: "MEDIUM RISK", 
    bg: "bg-amber-500/10", 
    text: "text-amber-400", 
    border: "border-amber-500/30", 
    dot: "bg-amber-400" 
  },
  high: { 
    label: "HIGH RISK", 
    bg: "bg-rose-500/10", 
    text: "text-rose-400", 
    border: "border-rose-500/30", 
    dot: "bg-rose-400" 
  },
  unknown: { 
    label: "UNKNOWN", 
    bg: "bg-zinc-500/10", 
    text: "text-zinc-400", 
    border: "border-zinc-500/30", 
    dot: "bg-zinc-400" 
  },
} as const;

export function ReviewPanel({
  analysis,
  onClose,
  repo = "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ",
  branch = "main",
  onApplyFix,
  onCreatePrForFinding,
  defaultTab,
}: ReviewPanelProps) {
  const [panelTab, setPanelTab] = useState<"pr" | "audit">(defaultTab || "pr");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<RepoAuditResult | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "security" | "bug" | "ui">("all");

  useEffect(() => {
    if (defaultTab) {
      setPanelTab(defaultTab);
      if (defaultTab === "audit" && !auditResult && !isAuditing) {
        handleRunFullScan();
      }
    }
  }, [defaultTab]);

  const handleRunFullScan = async () => {
    setIsAuditing(true);
    setPanelTab("audit");
    try {
      const res = await scanFullRepository(repo, branch);
      setAuditResult(res);
    } catch (e) {
      console.error("Full scan failed:", e);
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredFindings = auditResult?.findings.filter((f) => {
    if (auditFilter === "all") return true;
    return f.category === auditFilter;
  }) || [];

  return (
    <div className="flex flex-col h-full bg-[#090a0f] text-zinc-200 select-none font-sans overflow-hidden">
      
      {/* ── Top Dual Mode Navigation ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#07080a] flex-shrink-0">
        <div className="flex items-center bg-[#11131a] rounded p-0.5 border border-white/[0.08]">
          <button
            onClick={() => setPanelTab("pr")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              panelTab === "pr"
                ? "bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>PR Review</span>
          </button>

          <button
            onClick={() => {
              setPanelTab("audit");
              if (!auditResult && !isAuditing) {
                handleRunFullScan();
              }
            }}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
              panelTab === "audit"
                ? "bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Full Repo Audit</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          title="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
        
        {panelTab === "audit" ? (
          /* ── FULL REPOSITORY AUDIT VIEW ── */
          <div className="flex flex-col gap-4">
            
            {/* Header / Trigger */}
            <div className="p-3.5 rounded-xl bg-[#0c0d14] border border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Repository Quality & Security Audit</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                  Scans security vulnerabilities, UI fixes & bug fixes
                </div>
              </div>

              <button
                onClick={handleRunFullScan}
                disabled={isAuditing}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/30 disabled:opacity-60"
              >
                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isAuditing ? "Scanning..." : "Rescan Repo"}</span>
              </button>
            </div>

            {isAuditing && (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                <div className="text-xs font-mono text-zinc-300 font-semibold">Running Multi-Model Repository Scan...</div>
                <div className="text-[11px] font-mono text-zinc-500 mt-1">Analyzing authentication endpoints, AST dependencies, UI schemas</div>
              </div>
            )}

            {auditResult && !isAuditing && (
              <>
                {/* Score & Summary Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#12141f] to-[#0c0d14] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Health Index</span>
                    <span className="text-lg font-mono font-bold text-amber-400">{auditResult.security_score}/100</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {auditResult.summary}
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(["all", "security", "bug", "ui"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAuditFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase font-semibold transition-colors border ${
                        auditFilter === cat
                          ? "bg-white/[0.1] text-zinc-100 border-white/[0.2]"
                          : "bg-white/[0.02] text-zinc-400 hover:text-zinc-200 border-white/[0.04]"
                      }`}
                    >
                      {cat === "all" ? `All (${auditResult.findings.length})` : cat}
                    </button>
                  ))}
                </div>

                {/* Findings List */}
                <div className="flex flex-col gap-3">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-3.5 rounded-xl bg-[#0c0d12] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {finding.category === "security" && <Shield className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                          {finding.category === "bug" && <Bug className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          {finding.category === "ui" && <Layout className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                          <span className="text-xs font-semibold text-zinc-200 leading-snug">{finding.title}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${
                          finding.severity === "critical" || finding.severity === "high"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : finding.severity === "medium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        }`}>
                          {finding.severity}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                        <FileCode className="w-3 h-3 text-zinc-400" />
                        <span className="truncate">{finding.file}</span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        {finding.description}
                      </p>

                      {finding.suggested_patch && (
                        <div className="p-2 rounded bg-black/40 border border-white/[0.04] text-[11px] font-mono text-emerald-300 overflow-x-auto">
                          <code>{finding.suggested_patch}</code>
                        </div>
                      )}

                      {/* Action Buttons for this Finding */}
                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                        <button
                          onClick={() => onApplyFix?.(finding)}
                          className="h-6 px-2.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold transition-colors flex items-center gap-1 border border-indigo-500/30 cursor-pointer"
                          title="Open file and let AI synthesize the fix"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>AI Write Fix</span>
                        </button>

                        <button
                          onClick={() => onCreatePrForFinding?.(finding)}
                          className="h-6 px-2.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold transition-colors flex items-center gap-1 border border-emerald-500/30 cursor-pointer ml-auto"
                          title="Create branch and pull request for this finding"
                        >
                          <GitPullRequest className="w-3 h-3 text-emerald-400" />
                          <span>Create PR</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        ) : (
          /* ── SINGLE PR REVIEW VIEW ── */
          !analysis ? (
            <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 font-mono text-xs gap-3">
              <Activity className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
              <p className="text-zinc-400 font-medium">No pull request analyzed yet.</p>
              <p className="text-[11px] text-zinc-600 max-w-xs">
                In the Explorer sidebar under Pull Requests, click the <strong>Analyze PR</strong> button on any pull request to inspect its AST blast radius and security risk.
              </p>
              <button
                onClick={() => setPanelTab("audit")}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-amber-400/30 text-xs font-mono transition-colors"
              >
                Or run a Full Repo Audit →
              </button>
            </div>
          ) : (
            <>
              {/* Risk badge */}
              <Section title="Risk Severity Level">
                <RiskBadge level={analysis.risk_level} />
              </Section>

              {/* Summary */}
              <Section title="Synthesis Summary">
                <div className="text-xs leading-relaxed text-zinc-300 bg-[#0c0d12] border border-white/[0.06] rounded-xl p-3.5 font-sans">
                  {analysis.summary || "No summary available."}
                </div>
              </Section>

              {/* Changed Symbols */}
              {analysis.changed_symbols.length > 0 && (
                <Section title={`Modified Symbols (${analysis.changed_symbols.length})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.changed_symbols.map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[11px] bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 rounded-md px-2 py-0.5"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Blast radius */}
              <Section title={`Downstream Blast Radius (${analysis.impacted_files.length} files)`}>
                {analysis.impacted_files.length === 0 ? (
                  <div className="text-xs text-zinc-500 font-mono italic">No dependent files detected.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {analysis.impacted_files.map((f) => (
                      <div
                        key={f}
                        className="font-mono text-[11px] bg-[#0c0d12] border border-white/[0.06] text-zinc-400 rounded-lg px-2.5 py-1.5 flex items-center justify-between hover:border-amber-500/40 hover:text-zinc-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <FileCode className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                        <span className="text-[10px] text-rose-400/80 uppercase font-bold flex-shrink-0 pl-2">impacted</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* AI Code Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <Section title={`AI Code Suggestions (${analysis.suggestions.length})`}>
                  <div className="flex flex-col gap-2">
                    {analysis.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="flex gap-2.5 items-start bg-[#0c0d12] border border-white/[0.06] border-l-2 border-l-indigo-400 rounded-r-lg p-3 text-xs text-zinc-300 leading-relaxed font-sans hover:border-indigo-400/40 transition-colors"
                      >
                        <span className="font-mono text-indigo-400 font-bold text-xs flex-shrink-0 min-w-[16px]">
                          0{i + 1}
                        </span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Suggested missing tests */}
              <Section title="Suggested Missing Tests">
                {analysis.missing_tests.length === 0 ? (
                  <div className="text-xs text-zinc-500 font-mono italic">No test recommendations required.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {analysis.missing_tests.map((test, i) => (
                      <div
                        key={i}
                        className="flex gap-2.5 items-start bg-[#0c0d12] border border-white/[0.06] border-l-2 border-l-amber-400 rounded-r-lg p-3"
                      >
                        <span className="font-mono text-amber-400 font-bold text-xs flex-shrink-0 min-w-[16px]">
                          0{i + 1}
                        </span>
                        <span className="text-xs text-zinc-300 leading-relaxed font-sans">{test}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )
        )}
      </div>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border",
        cfg.bg, cfg.text, cfg.border
      )}
    >
      <span className={cn("w-2 h-2 rounded-full animate-pulse", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
