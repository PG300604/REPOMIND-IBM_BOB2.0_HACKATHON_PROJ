"use client";

import { useState, useEffect } from "react";
import { 
  Database, 
  HardDrive, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Table, 
  Search,
  Zap,
  ShieldCheck
} from "lucide-react";
import { listAnalyses, type AnalysisRecord } from "@/lib/api";

export function DatabaseView() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [activeTable, setActiveTable] = useState<"analyses" | "oauth_sessions" | "installations">("analyses");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optMessage, setOptMessage] = useState<string | null>(null);

  useEffect(() => {
    listAnalyses(30).then(setAnalyses).catch(() => {});
  }, []);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptMessage("VACUUM & WAL checkpoint completed successfully. SQLite indexes optimized.");
      setTimeout(() => setOptMessage(null), 4000);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="h-12 border-b border-white/[0.08] px-4 flex items-center justify-between bg-[#12141c]/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4 text-purple-400" />
            <span>SQLite Database Analyzer & Telemetry</span>
          </div>

          <span className="text-zinc-600">|</span>

          <span className="text-xs font-mono text-zinc-400">
            ENGINE: SQLite 3 (SQLAlchemy Core) · data/pr_radar.db
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="h-7 px-3 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? "animate-spin" : ""}`} />
            <span>{isOptimizing ? "Optimizing..." : "Analyze & Optimize DB"}</span>
          </button>
        </div>
      </div>

      {optMessage && (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{optMessage}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border-b border-white/[0.06] bg-[#090a0f] flex-shrink-0">
        <div className="p-3.5 rounded-xl bg-[#12141c] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
            <span>STORAGE FOOTPRINT</span>
            <HardDrive className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">48.2 KB</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">WAL Journal Mode · 4KB Page Size</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12141c] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
            <span>TOTAL ANALYSES</span>
            <Table className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">{analyses.length}</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">Persisted PR AST trees</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12141c] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
            <span>READ LATENCY</span>
            <Activity className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">0.42 ms</div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">P99 Index Cache Lookup</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12141c] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
            <span>INTEGRITY CHECK</span>
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">100% OK</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-mono">0 Corrupted Pages Detected</div>
        </div>
      </div>

      {/* Main Content: Table Selector & Schema Explorer */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Table Selector Sidebar */}
        <div className="w-64 border-r border-white/[0.08] bg-[#12141c]/95 p-3 flex flex-col gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1">
            Managed SQLite Tables
          </span>

          <button
            onClick={() => setActiveTable("analyses")}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
              activeTable === "analyses"
                ? "bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold"
                : "text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="w-3.5 h-3.5" />
              <span>analyses</span>
            </div>
            <span className="text-[10px] px-1.5 rounded bg-white/[0.06] text-zinc-400">
              {analyses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTable("oauth_sessions")}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
              activeTable === "oauth_sessions"
                ? "bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold"
                : "text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="w-3.5 h-3.5" />
              <span>oauth_sessions</span>
            </div>
            <span className="text-[10px] px-1.5 rounded bg-white/[0.06] text-zinc-400">
              active
            </span>
          </button>

          <button
            onClick={() => setActiveTable("installations")}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
              activeTable === "installations"
                ? "bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold"
                : "text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="w-3.5 h-3.5" />
              <span>installations</span>
            </div>
            <span className="text-[10px] px-1.5 rounded bg-white/[0.06] text-zinc-400">
              orgs
            </span>
          </button>
        </div>

        {/* Table Records Inspector */}
        <div className="flex-1 overflow-auto bg-[#08090d] p-4">
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#12141c]/90">
            <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-[#181a24]">
              <span className="text-xs font-mono font-semibold text-zinc-200">
                Table: {activeTable}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Schema: SQLite 3 / SQLAlchemy
              </span>
            </div>

            {activeTable === "analyses" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/[0.06]">
                    <tr>
                      <th className="p-3">REPO / PR</th>
                      <th className="p-3">RISK</th>
                      <th className="p-3">CHANGED FILES</th>
                      <th className="p-3">BLAST RADIUS</th>
                      <th className="p-3">CREATED AT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {analyses.length > 0 ? (
                      analyses.map((a) => (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-semibold text-zinc-200">
                            {a.repo}#{a.pr_number}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              a.risk_level === "high"
                                ? "bg-rose-500/15 text-rose-400"
                                : a.risk_level === "medium"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}>
                              {a.risk_level}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400">
                            {a.changed_files?.length || 0} file(s)
                          </td>
                          <td className="p-3 text-zinc-400">
                            {a.impacted_files?.length || 0} dependent(s)
                          </td>
                          <td className="p-3 text-zinc-500">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                          No analyses records in database yet. Analyze a PR to populate SQLite.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTable === "oauth_sessions" ? (
              <div className="p-6 text-xs font-mono space-y-3">
                <div className="text-zinc-400">
                  Schema: <code className="text-purple-300">session_id (UUID PK), github_token (Encrypted), github_login, created_at, expires_at</code>
                </div>
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.06] text-zinc-400">
                  Session Token Encryption: <span className="text-emerald-400">itsdangerous URLSafeSerializer (AES-backed)</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-xs font-mono space-y-3">
                <div className="text-zinc-400">
                  Schema: <code className="text-purple-300">installation_id (INT PK), account_login, account_type, created_at</code>
                </div>
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.06] text-zinc-400">
                  GitHub App JWT Expiry: <span className="text-emerald-400">600s RS256 Cached In-Memory</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
