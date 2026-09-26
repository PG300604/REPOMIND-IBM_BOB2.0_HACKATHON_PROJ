"use client";

import { useState } from "react";
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Cpu, 
  Database, 
  GitBranch, 
  ArrowRight,
  ExternalLink,
  Shield,
  CheckCircle2
} from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  layer: "frontend" | "gateway" | "engine" | "ai" | "database";
  files: string[];
  desc: string;
  x: number;
  y: number;
  connections: string[];
}

const DEFAULT_NODES: NodeData[] = [
  // UI Layer
  {
    id: "ui_shell",
    label: "IDE Studio Shell & Diff",
    layer: "frontend",
    files: ["frontend/app/dashboard/page.tsx", "frontend/components/Shell.tsx", "frontend/components/DiffViewer.tsx"],
    desc: "Next.js 16 reactive IDE shell with unified diff viewer, file tree explorer, and multi-view rail.",
    x: 80,
    y: 120,
    connections: ["api_gateway", "auth_session"]
  },
  {
    id: "ui_landing",
    label: "Interactive Landing Canvas",
    layer: "frontend",
    files: ["frontend/app/page.tsx"],
    desc: "Scroll-driven 60-frame scrubbing canvas rendering 3D neural fiber visuals with milestone narratives.",
    x: 80,
    y: 280,
    connections: ["ui_shell"]
  },
  // Gateway & Auth Layer
  {
    id: "api_gateway",
    label: "FastAPI REST Gateway",
    layer: "gateway",
    files: ["backend/main.py"],
    desc: "Central HTTP router dispatching analysis requests, token verification, and health monitoring.",
    x: 320,
    y: 120,
    connections: ["diff_engine", "dep_finder", "db_layer"]
  },
  {
    id: "auth_session",
    label: "OAuth & GitHub App JWT",
    layer: "gateway",
    files: ["backend/oauth.py", "backend/github_app.py", "backend/webhook.py"],
    desc: "Zero-token GitHub App installation token generation, HMAC webhook verification, and OAuth cookies.",
    x: 320,
    y: 280,
    connections: ["db_layer", "diff_engine"]
  },
  // Core Analysis Engine
  {
    id: "diff_engine",
    label: "Unified Diff Parser",
    layer: "engine",
    files: ["backend/diff_parser.py"],
    desc: "Parses unified Git diffs into structured file modifications, line additions, deletions, and AST symbol signatures.",
    x: 580,
    y: 80,
    connections: ["dep_finder", "ai_reasoner"]
  },
  {
    id: "dep_finder",
    label: "AST Blast Radius Scanner",
    layer: "engine",
    files: ["backend/dependency_finder.py"],
    desc: "Recursively scans repository files via abstract syntax tree matching to map downstream consumers.",
    x: 580,
    y: 220,
    connections: ["ai_reasoner"]
  },
  // AI & Reasoning Layer
  {
    id: "ai_reasoner",
    label: "Multi-Model Risk Engine",
    layer: "ai",
    files: ["backend/llm_client.py"],
    desc: "Multi-LLM pipeline running IBM watsonx.ai Granite 3.0, Groq LLaMA-3, and Gemini fallback for risk scoring.",
    x: 820,
    y: 150,
    connections: ["db_layer", "pr_commenter"]
  },
  {
    id: "pr_commenter",
    label: "GitHub PR Comment Dispatcher",
    layer: "ai",
    files: ["backend/github_app.py"],
    desc: "Auto-posts rich markdown risk summary, blast radius tables, and missing test cases directly to the GitHub PR.",
    x: 820,
    y: 280,
    connections: []
  },
  // Database Layer
  {
    id: "db_layer",
    label: "SQLite Persistence Engine",
    layer: "database",
    files: ["backend/database.py", "data/pr_radar.db"],
    desc: "SQLAlchemy Core storage managing historical analyses, cached diff trees, and GitHub installation keys.",
    x: 580,
    y: 360,
    connections: []
  },
];

const LAYER_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  frontend: { border: "border-indigo-500/40", bg: "bg-indigo-950/20", text: "text-indigo-300" },
  gateway: { border: "border-sky-500/40", bg: "bg-sky-950/20", text: "text-sky-300" },
  engine: { border: "border-amber-500/40", bg: "bg-amber-950/20", text: "text-amber-300" },
  ai: { border: "border-emerald-500/40", bg: "bg-emerald-950/20", text: "text-emerald-300" },
  database: { border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-300" },
};

export function ArchitectureGraphView() {
  const [repoUrl, setRepoUrl] = useState("PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ");
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(DEFAULT_NODES[0]);
  const [zoom, setZoom] = useState(1);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-white/[0.08] px-4 flex items-center justify-between bg-[#12141c]/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
            <Network className="w-4 h-4 text-indigo-400" />
            <span>Repository Architecture Graph</span>
          </div>

          <span className="text-zinc-600">|</span>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="owner/repo or repository URL"
                className="w-72 sm:w-96 h-7 bg-[#181a24] border border-white/[0.08] rounded-md px-2.5 text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="h-7 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isScanning ? "Synthesizing Graph..." : "Generate Graph"}</span>
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas + Detail Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Visual Graph Canvas */}
        <div className="flex-1 relative overflow-auto bg-[#090a0f] p-8 scrollbar-thin">
          <div 
            className="relative min-w-[1050px] min-h-[520px] transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* SVG Connecting Curves */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {DEFAULT_NODES.flatMap((fromNode) =>
                fromNode.connections.map((targetId) => {
                  const toNode = DEFAULT_NODES.find((n) => n.id === targetId);
                  if (!toNode) return null;
                  
                  const startX = fromNode.x + 180;
                  const startY = fromNode.y + 35;
                  const endX = toNode.x;
                  const endY = toNode.y + 35;
                  const midX = (startX + endX) / 2;

                  return (
                    <g key={`${fromNode.id}->${toNode.id}`}>
                      <path
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="url(#edgeGrad)"
                        strokeWidth="1.6"
                        strokeDasharray={fromNode.layer === "ai" ? "4 3" : "none"}
                      />
                      <circle cx={endX} cy={endY} r="3" fill="#f59e0b" />
                    </g>
                  );
                })
              )}
            </svg>

            {/* Architecture Node Cards */}
            {DEFAULT_NODES.map((node) => {
              const style = LAYER_COLORS[node.layer];
              const isSelected = selectedNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute w-52 p-3.5 rounded-xl border transition-all cursor-pointer z-10 ${style.bg} ${
                    isSelected
                      ? "border-amber-400 ring-1 ring-amber-400/50 shadow-xl shadow-amber-500/10"
                      : `${style.border} hover:border-white/30`
                  }`}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${style.text}`}>
                      {node.layer}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="font-semibold text-xs text-zinc-100 mb-1">
                    {node.label}
                  </div>

                  <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {node.desc}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>{node.files.length} module(s)</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Node Details Inspector Panel */}
        <div className="w-80 border-l border-white/[0.08] bg-[#12141c]/95 p-4 flex flex-col justify-between overflow-y-auto flex-shrink-0">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                  Node Inspector · {selectedNode.layer}
                </span>
                <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                  {selectedNode.label}
                </h3>
              </div>

              <div className="text-xs text-zinc-300 leading-relaxed bg-[#181a24] p-3 rounded-lg border border-white/[0.06]">
                {selectedNode.desc}
              </div>

              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Associated Files
                </span>
                <div className="mt-2 space-y-1.5">
                  {selectedNode.files.map((file) => (
                    <div
                      key={file}
                      className="p-2 rounded bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-zinc-300 break-all"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Downstream Connections
                </span>
                <div className="mt-2 space-y-1">
                  {selectedNode.connections.length > 0 ? (
                    selectedNode.connections.map((cId) => {
                      const cNode = DEFAULT_NODES.find((n) => n.id === cId);
                      return (
                        <div key={cId} className="flex items-center gap-2 text-xs text-zinc-300 py-1">
                          <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span>{cNode?.label || cId}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-zinc-500 italic">Terminal node (no downstream deps)</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 italic">Select any node on the graph to inspect.</div>
          )}

          <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>RepoMind AST Graph Engine</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

      </div>
    </div>
  );
}
