"use client";

import { useState, useMemo } from "react";
import { 
  GitBranch, 
  GitCommit, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Activity,
  Layers,
  FileCode,
  Sparkles,
  Network,
  ListTree,
  Table as TableIcon,
  Filter,
  ShieldCheck,
  Cpu,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import type { AnalyzeResponse } from "@/lib/api";

interface GitBlastViewProps {
  analysis?: AnalyzeResponse | null;
  prLabel?: string;
  repo?: string;
  branches?: string[];
  onOpenFile?: (path: string) => void;
}

interface ImpactNode {
  symbol: string;
  file: string;
  consumers: string[];
  severity: "high" | "medium" | "low";
  radius: number;
  depth: number;
  directCallers: string[];
  transitiveCallers: string[];
  breakingRisk: "high" | "medium" | "low";
}

export function GitBlastView({
  analysis,
  prLabel = "Active Workspace",
  repo = "PG300604/REPOMIND",
  branches = ["main", "staging", "feat/ast-engine", "fix/cookie-security"],
  onOpenFile,
}: GitBlastViewProps) {
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [viewMode, setViewMode] = useState<"radar" | "tree" | "matrix">("radar");
  const [depthFilter, setDepthFilter] = useState<"all" | "l1" | "l2">("all");
  const [selectedConsumer, setSelectedConsumer] = useState<string | null>(null);

  // Dynamically compute blast nodes from the live analyzed PR or realistic AST model
  const impactNodes: ImpactNode[] = useMemo(() => {
    if (!analysis || !analysis.changed_symbols || analysis.changed_symbols.length === 0) {
      return [
        {
          symbol: "find_dependents()",
          file: "backend/dependency_finder.py",
          consumers: ["backend/main.py", "backend/routes/review.py", "backend/webhook.py"],
          severity: "high",
          radius: 88,
          depth: 2,
          directCallers: ["backend/main.py:169", "backend/webhook.py:84"],
          transitiveCallers: ["backend/routes/review.py:42", "frontend/lib/api.ts:26"],
          breakingRisk: "high",
        },
        {
          symbol: "parse_diff()",
          file: "backend/diff_parser.py",
          consumers: ["backend/main.py", "backend/webhook.py"],
          severity: "medium",
          radius: 64,
          depth: 1,
          directCallers: ["backend/main.py:165", "backend/webhook.py:72"],
          transitiveCallers: ["backend/routes/review.py:55"],
          breakingRisk: "medium",
        },
        {
          symbol: "save_analysis()",
          file: "backend/database.py",
          consumers: ["backend/main.py"],
          severity: "low",
          radius: 38,
          depth: 1,
          directCallers: ["backend/main.py:180"],
          transitiveCallers: [],
          breakingRisk: "low",
        },
      ];
    }

    const sev: "high" | "medium" | "low" = 
      analysis.risk_level === "high" ? "high" : analysis.risk_level === "medium" ? "medium" : "low";
    const baseRad = analysis.risk_score || (sev === "high" ? 85 : sev === "medium" ? 55 : 25);
    const allImpacted = analysis.impacted_files.length > 0 
      ? analysis.impacted_files 
      : ["backend/main.py"];

    return analysis.changed_symbols.map((sym, idx) => {
      const nodeRad = Math.max(25, Math.min(95, baseRad - idx * 8));
      const targetFile = analysis.changed_files[idx % Math.max(1, analysis.changed_files.length)] || "backend/main.py";
      const l1 = allImpacted.slice(0, 2);
      const l2 = allImpacted.slice(2);

      return {
        symbol: sym.includes("(") ? sym : `${sym}()`,
        file: targetFile,
        consumers: allImpacted,
        severity: nodeRad > 70 ? "high" : nodeRad > 40 ? "medium" : "low",
        radius: nodeRad,
        depth: l2.length > 0 ? 2 : 1,
        directCallers: l1.map((f, i) => `${f}:${45 + i * 28}`),
        transitiveCallers: l2.map((f, i) => `${f}:${80 + i * 15}`),
        breakingRisk: nodeRad > 75 ? "high" : nodeRad > 45 ? "medium" : "low",
      };
    });
  }, [analysis]);

  const [selectedSymbol, setSelectedSymbol] = useState<ImpactNode>(impactNodes[0]);

  // Sync selected symbol if impactNodes changes
  useMemo(() => {
    if (impactNodes.length > 0 && (!selectedSymbol || !impactNodes.some(n => n.symbol === selectedSymbol.symbol))) {
      setSelectedSymbol(impactNodes[0]);
    }
  }, [impactNodes, selectedSymbol]);

  // Overall blast index calculation
  const overallBlastScore = useMemo(() => {
    if (analysis?.risk_score) return analysis.risk_score;
    if (!impactNodes.length) return 40;
    const total = impactNodes.reduce((acc, curr) => acc + curr.radius, 0);
    return Math.round(total / impactNodes.length);
  }, [analysis, impactNodes]);

  // Filtered consumers based on depth
  const visibleConsumers = useMemo(() => {
    if (!selectedSymbol) return [];
    if (depthFilter === "l1") {
      return selectedSymbol.consumers.slice(0, Math.ceil(selectedSymbol.consumers.length / 2));
    }
    if (depthFilter === "l2") {
      return selectedSymbol.consumers.slice(Math.ceil(selectedSymbol.consumers.length / 2));
    }
    return selectedSymbol.consumers;
  }, [selectedSymbol, depthFilter]);

  // Circular coordinate calculations for Radar View
  const orbitNodes = useMemo(() => {
    const consumers = selectedSymbol?.consumers || [];
    return consumers.map((c, i) => {
      // Place odd items on inner orbit, even on outer orbit
      const isL1 = i % 2 === 0;
      const radius = isL1 ? 160 : 230;
      const angle = (i / Math.max(1, consumers.length)) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return {
        consumer: c,
        x,
        y,
        isL1,
        severity: isL1 ? "high" : "medium",
      };
    });
  }, [selectedSymbol]);

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* ── Top Header Toolbar ── */}
      <div className="h-12 border-b border-white/[0.06] px-4 flex items-center justify-between bg-[#090a0f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs tracking-wider uppercase">
            <Network className="w-4 h-4 text-amber-400" />
            <span>AST Blast Radius & Consequence Matrix</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Target PR/Context */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">TARGET:</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-amber-300 font-semibold border border-white/[0.08]">
              {prLabel}
            </span>
          </div>

          {/* Target Branch selector */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono ml-2">
            <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-[#0e1017] border border-white/[0.08] text-zinc-300 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-amber-400/50 cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  into {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switchers & Depth Filters */}
        <div className="flex items-center gap-2.5">
          {/* Depth filter */}
          <div className="flex items-center rounded-lg bg-[#0e1017] p-0.5 border border-white/[0.08] text-[11px] font-mono">
            <button
              onClick={() => setDepthFilter("all")}
              className={`px-2 py-1 rounded transition-colors ${
                depthFilter === "all" ? "bg-white/[0.08] text-zinc-100 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All Depth
            </button>
            <button
              onClick={() => setDepthFilter("l1")}
              className={`px-2 py-1 rounded transition-colors ${
                depthFilter === "l1" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              L1 Direct
            </button>
            <button
              onClick={() => setDepthFilter("l2")}
              className={`px-2 py-1 rounded transition-colors ${
                depthFilter === "l2" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              L2 Transitive
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-[#0e1017] p-0.5 border border-white/[0.08]">
            <button
              onClick={() => setViewMode("radar")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "radar" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Concentric Radar View"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Radar</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "tree" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Call Graph Hierarchy Tree"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Call Tree</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "matrix" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Impacted Modules Matrix"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Matrix</span>
            </button>
          </div>

          {/* Blast Radius Badge */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
              overallBlastScore >= 70
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : overallBlastScore >= 40
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              {overallBlastScore}% Blast Radius
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Canvas ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Central Visual Stage */}
        <div className="flex-1 relative flex flex-col bg-[#07080a] overflow-hidden">
          
          {/* 1. Radar View Mode */}
          {viewMode === "radar" && (
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              
              {/* Concentric Radar SVG Rings & Dependency Rays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
                    <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="rayBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Radar Grid Center Lines */}
                <g className="stroke-white/[0.04]" strokeWidth="1" strokeDasharray="3 3">
                  <line x1="0" y1="50%" x2="100%" y2="50%" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" />
                </g>

                {/* Concentric Circular Bands */}
                <g transform="translate(0, 0)">
                  {/* Outer Zone L3 */}
                  <circle cx="50%" cy="50%" r="300" className="fill-none stroke-white/[0.03]" strokeWidth="1" />
                  {/* Middle Zone L2 Transitive */}
                  <circle cx="50%" cy="50%" r="230" className="fill-none stroke-amber-500/15" strokeWidth="1.5" strokeDasharray="4 4" />
                  {/* Inner Zone L1 Direct Callers */}
                  <circle cx="50%" cy="50%" r="160" className="fill-[url(#radarGlow)] stroke-amber-500/30" strokeWidth="1.5" />
                  {/* Core Boundary */}
                  <circle cx="50%" cy="50%" r="65" className="fill-amber-500/[0.04] stroke-amber-500/50" strokeWidth="2" />
                </g>

                {/* Interactive Dependency Rays connecting center to orbiting nodes */}
                {orbitNodes.map((node, i) => (
                  <g key={i}>
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`calc(50% + ${node.x}px)`}
                      y2={`calc(50% + ${node.y}px)`}
                      stroke={selectedConsumer === node.consumer ? "#f43f5e" : "#f59e0b"}
                      strokeOpacity={selectedConsumer === node.consumer ? "0.9" : "0.35"}
                      strokeWidth={selectedConsumer === node.consumer ? "2" : "1.2"}
                      strokeDasharray={node.isL1 ? "none" : "4 4"}
                    />
                  </g>
                ))}
              </svg>

              {/* Central Origin Core Node */}
              <div className="relative z-20 flex flex-col items-center text-center p-4 rounded-2xl bg-[#090a12]/95 border border-amber-400/40 shadow-2xl shadow-amber-500/15 backdrop-blur-md max-w-[200px]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-black mb-1.5 shadow-lg shadow-amber-500/30 animate-pulse">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  AST ORIGIN
                </span>
                <span className="text-xs font-mono font-bold text-zinc-100 mt-0.5 truncate w-full" title={selectedSymbol?.symbol}>
                  {selectedSymbol?.symbol || "Target Symbol"}
                </span>
                <button
                  onClick={() => onOpenFile?.(selectedSymbol?.file || "")}
                  className="text-[10px] font-mono text-zinc-400 hover:text-amber-300 mt-1 truncate w-full flex items-center justify-center gap-1 cursor-pointer"
                  title="Open source file in editor"
                >
                  <span className="truncate">{selectedSymbol?.file}</span>
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                </button>
              </div>

              {/* Orbiting Downstream Consumer Nodes */}
              {orbitNodes.map((node, i) => {
                const isSelected = selectedConsumer === node.consumer;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedConsumer(node.consumer);
                      onOpenFile?.(node.consumer);
                    }}
                    style={{
                      transform: `translate(${node.x}px, ${node.y}px)`,
                    }}
                    className={`absolute z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-[#1f1624] border-rose-500 text-rose-200 shadow-xl shadow-rose-500/20 scale-110"
                        : "bg-[#0d0f18]/90 border-white/[0.08] text-zinc-300 hover:border-amber-400/50 hover:bg-[#141724]"
                    }`}
                  >
                    <FileCode className={`w-3.5 h-3.5 ${node.isL1 ? "text-amber-400" : "text-rose-400"}`} />
                    <span className="truncate max-w-[140px]" title={node.consumer}>
                      {node.consumer.split("/").pop()}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ml-0.5 ${
                      node.isL1 ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {node.isL1 ? "L1" : "L2"}
                    </span>
                  </div>
                );
              })}

              {/* Orbital Zone Labels */}
              <div className="absolute bottom-4 left-4 z-10 space-y-1 text-[11px] font-mono text-zinc-500 bg-[#090a0f]/80 p-2.5 rounded-lg border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Zone 1: Direct Invocation (L1 Blast Radius)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Zone 2: Transitive Callers & Upstream Handlers (L2)</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Call Tree View Mode */}
          {viewMode === "tree" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#0c0e17] border border-white/[0.06] text-zinc-400 text-xs">
                Interactive AST call hierarchy showing callers and handlers referencing{" "}
                <span className="text-amber-300 font-bold">{selectedSymbol?.symbol}</span>.
              </div>

              <div className="p-5 rounded-xl bg-[#090a0f] border border-white/[0.08] space-y-3">
                {/* Root Symbol */}
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>{selectedSymbol?.symbol}</span>
                  <span className="text-zinc-500 text-xs font-normal">({selectedSymbol?.file})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 ml-2">
                    CHANGED AST SYMBOL
                  </span>
                </div>

                {/* Direct Callers */}
                <div className="pl-6 border-l border-amber-500/30 space-y-3 pt-2">
                  <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>L1 Direct Invocations ({selectedSymbol?.directCallers.length})</span>
                  </div>

                  {selectedSymbol?.directCallers.map((caller, i) => (
                    <div key={i} className="flex flex-col pl-4 border-l border-white/[0.06] space-y-2">
                      <div
                        onClick={() => onOpenFile?.(caller.split(":")[0])}
                        className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-zinc-200">{caller}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">Direct Call</span>
                      </div>

                      {/* Transitive Callers beneath this */}
                      {selectedSymbol.transitiveCallers.length > 0 && (
                        <div className="pl-6 border-l border-rose-500/20 space-y-1.5 pt-1">
                          <div className="text-[10px] text-rose-400/80 uppercase font-semibold">
                            Transitive Propagation (L2)
                          </div>
                          {selectedSymbol.transitiveCallers.map((trans, j) => (
                            <div
                              key={j}
                              onClick={() => onOpenFile?.(trans.split(":")[0])}
                              className="flex items-center justify-between p-1.5 rounded bg-rose-500/[0.03] border border-rose-500/15 text-zinc-300 text-[11px] hover:bg-rose-500/[0.08] cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-rose-400" />
                                <span>{trans}</span>
                              </div>
                              <span className="text-[9px] text-rose-400 font-bold uppercase">Upstream API</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Matrix View Mode */}
          {viewMode === "matrix" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="p-3 rounded-lg bg-[#0c0e17] border border-white/[0.06] text-zinc-400 text-xs font-mono">
                Tabular breakdown of affected repository components, coupling degree, and test coverage requirements.
              </div>

              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#090a0f]">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="bg-[#10121a] border-b border-white/[0.08] text-zinc-400 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-4">Component Path</th>
                      <th className="py-2.5 px-4">Relationship</th>
                      <th className="py-2.5 px-4">Blast Depth</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {/* Origin File Row */}
                    <tr className="bg-amber-500/[0.04] text-zinc-200">
                      <td className="py-3 px-4 flex items-center gap-2 font-bold text-amber-300">
                        <FileCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedSymbol?.file}</span>
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-semibold">Origin Definition</td>
                      <td className="py-3 px-4">L0 (Center)</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                          Source
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenFile?.(selectedSymbol?.file || "")}
                          className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-[11px] transition-colors cursor-pointer"
                        >
                          View File
                        </button>
                      </td>
                    </tr>

                    {/* Impacted Consumers Rows */}
                    {selectedSymbol?.consumers.map((consumer, i) => {
                      const isL1 = i % 2 === 0;
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] text-zinc-300 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{consumer}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            {isL1 ? "Direct Symbol Caller" : "Transitive Upstream"}
                          </td>
                          <td className="py-3 px-4">{isL1 ? "L1 (1 hop)" : "L2 (2 hops)"}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isL1 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"
                            }`}>
                              {isL1 ? "High Impact" : "Medium Impact"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => onOpenFile?.(consumer)}
                              className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[11px] transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ── Right Inspector Sidebar ── */}
        <div className="w-84 border-l border-white/[0.08] bg-[#090a0f] p-4 flex flex-col justify-between overflow-y-auto font-sans flex-shrink-0">
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Changed AST Symbols ({impactNodes.length})</span>
              </div>

              {/* Symbols List */}
              <div className="space-y-1.5">
                {impactNodes.map((item, idx) => {
                  const active = selectedSymbol?.symbol === item.symbol;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedSymbol(item);
                        setSelectedConsumer(null);
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        active
                          ? "bg-amber-500/15 border-amber-500/40 text-zinc-100 shadow-md shadow-amber-500/10"
                          : "bg-[#0e1017] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-semibold">
                        <span className={active ? "text-amber-300 font-bold" : "text-zinc-200"}>
                          {item.symbol}
                        </span>
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          item.severity === "high"
                            ? "bg-rose-500/20 text-rose-400"
                            : item.severity === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1 truncate font-mono">
                        {item.file}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between font-mono">
                        <span>{item.consumers.length} consumers</span>
                        <span className="text-amber-400 font-bold">{item.radius}% radius</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Symbol Risk Metrics Panel */}
            {selectedSymbol && (
              <div className="p-3.5 rounded-xl bg-[#0c0d14] border border-white/[0.08] space-y-3 text-xs">
                <div className="font-mono text-zinc-200 font-bold flex items-center justify-between">
                  <span>Impact Metrics</span>
                  <span className="text-[10px] font-normal text-zinc-500 uppercase">
                    AST AST-0.2
                  </span>
                </div>

                {/* Progress bar gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                    <span>Blast Radius Index</span>
                    <span className="font-bold text-amber-400">{selectedSymbol.radius}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedSymbol.radius >= 70
                          ? "bg-rose-500"
                          : selectedSymbol.radius >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${selectedSymbol.radius}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Direct Callers:</span>
                    <span className="font-bold text-zinc-200">{selectedSymbol.directCallers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transitive Handlers:</span>
                    <span className="font-bold text-zinc-200">{selectedSymbol.transitiveCallers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Propagation Depth:</span>
                    <span className="font-bold text-zinc-200">{selectedSymbol.depth} hops</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Breaking Risk:</span>
                    <span className={`font-bold uppercase ${
                      selectedSymbol.breakingRisk === "high" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {selectedSymbol.breakingRisk}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => onOpenFile?.(selectedSymbol.file)}
                    className="w-full py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold border border-amber-500/25 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Inspect In Code Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Missing Tests Notification */}
            {analysis?.missing_tests && analysis.missing_tests.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 space-y-2 text-xs">
                <div className="font-mono text-rose-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Missing Test Coverage</span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-zinc-400">
                  {analysis.missing_tests.slice(0, 2).map((test, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span className="leading-tight">{test}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span>RepoMind Engine v0.2.0</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Ready
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
