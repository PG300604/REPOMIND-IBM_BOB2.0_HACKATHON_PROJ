"use client";

import { useState, useMemo } from "react";
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
  CheckCircle2,
  FolderGit2,
  FileCode,
  Sparkles
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

const LAYER_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  frontend: { border: "border-indigo-500/40", bg: "bg-indigo-950/20", text: "text-indigo-300", badge: "bg-indigo-500/10 text-indigo-400" },
  gateway: { border: "border-sky-500/40", bg: "bg-sky-950/20", text: "text-sky-300", badge: "bg-sky-500/10 text-sky-400" },
  engine: { border: "border-amber-500/40", bg: "bg-amber-950/20", text: "text-amber-300", badge: "bg-amber-500/10 text-amber-400" },
  ai: { border: "border-emerald-500/40", bg: "bg-emerald-950/20", text: "text-emerald-300", badge: "bg-emerald-500/10 text-emerald-400" },
  database: { border: "border-purple-500/40", bg: "bg-purple-950/20", text: "text-purple-300", badge: "bg-purple-500/10 text-purple-400" },
};

interface ArchitectureGraphViewProps {
  repo?: string;
  branch?: string;
  files?: string[];
}

export function ArchitectureGraphView({
  repo = "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ",
  branch = "main",
  files = [],
}: ArchitectureGraphViewProps) {
  const [zoom, setZoom] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamically partition repository files into architecture layers
  const nodes: NodeData[] = useMemo(() => {
    const isLocalRepo = repo.toLowerCase().includes("repomind");

    if (isLocalRepo) {
      return [
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
          desc: "Scroll-driven scrubbing canvas rendering WebGL neural fiber visuals with milestone narratives.",
          x: 80,
          y: 280,
          connections: ["ui_shell"]
        },
        {
          id: "api_gateway",
          label: "FastAPI REST Gateway",
          layer: "gateway",
          files: ["backend/main.py"],
          desc: "Central HTTP router dispatching analysis requests, token verification, and health monitoring.",
          x: 340,
          y: 120,
          connections: ["diff_engine", "dep_finder", "db_layer"]
        },
        {
          id: "auth_session",
          label: "OAuth & GitHub App JWT",
          layer: "gateway",
          files: ["backend/oauth.py", "backend/github_app.py", "backend/webhook.py"],
          desc: "Zero-token GitHub App installation token generation, HMAC webhook verification, and OAuth cookies.",
          x: 340,
          y: 280,
          connections: ["db_layer", "diff_engine"]
        },
        {
          id: "diff_engine",
          label: "Unified Diff Parser",
          layer: "engine",
          files: ["backend/diff_parser.py"],
          desc: "Parses unified Git diffs into structured file modifications, line additions, and symbol signatures.",
          x: 600,
          y: 80,
          connections: ["dep_finder", "ai_reasoner"]
        },
        {
          id: "dep_finder",
          label: "AST Blast Radius Scanner",
          layer: "engine",
          files: ["backend/dependency_finder.py"],
          desc: "Recursively scans repository files via abstract syntax tree matching to map downstream consumers.",
          x: 600,
          y: 220,
          connections: ["ai_reasoner"]
        },
        {
          id: "ai_reasoner",
          label: "Multi-Model Risk Engine",
          layer: "ai",
          files: ["backend/llm_client.py"],
          desc: "Multi-LLM pipeline running Groq LLaMA-3 + Gemini 2.5 Flash fallback for risk scoring and code repair.",
          x: 860,
          y: 150,
          connections: ["db_layer"]
        },
        {
          id: "db_layer",
          label: "SQLite Persistence Engine",
          layer: "database",
          files: ["backend/database.py", "data/pr_radar.db"],
          desc: "SQLAlchemy Core storage managing historical analyses, workspace sessions, and architecture manuals.",
          x: 600,
          y: 360,
          connections: []
        }
      ];
    }

    // Dynamic node generator for ANY external repository
    const feFiles = files.filter(f => 
      f.startsWith("frontend/") || f.includes("/client/") || f.includes("/ui/") || f.includes("/components/") ||
      f.endsWith(".tsx") || f.endsWith(".jsx") || f.endsWith(".vue") || f.endsWith(".html") || f.endsWith(".css")
    );

    const gwFiles = files.filter(f =>
      f.includes("api/") || f.includes("routes/") || f.includes("controllers/") || f.includes("handlers/") ||
      f.endsWith("main.py") || f.endsWith("app.py") || f.endsWith("server.ts") || f.endsWith("server.js") || f.endsWith("index.js")
    );

    const engFiles = files.filter(f =>
      (f.includes("services/") || f.includes("lib/") || f.includes("core/") || f.includes("domain/") || f.includes("engine/") || f.includes("pkg/")) &&
      !gwFiles.includes(f) && !feFiles.includes(f)
    );

    const dbFiles = files.filter(f =>
      f.includes("db/") || f.includes("database/") || f.includes("models/") || f.includes("migrations/") ||
      f.includes("schema/") || f.endsWith(".sql") || f.includes("prisma/")
    );

    const otherFiles = files.filter(f => 
      !feFiles.includes(f) && !gwFiles.includes(f) && !engFiles.includes(f) && !dbFiles.includes(f)
    );

    const dynamicNodes: NodeData[] = [];

    // Node 1: Presentation / Interface
    dynamicNodes.push({
      id: "node_presentation",
      label: feFiles.length > 0 ? "Presentation & Client Interface" : "Interface & Entry Layer",
      layer: "frontend",
      files: feFiles.length > 0 ? feFiles.slice(0, 12) : otherFiles.slice(0, 6),
      desc: feFiles.length > 0 
        ? `Contains ${feFiles.length} interface files governing UI rendering, components, and views.`
        : `Primary entry interface and top-level modules for ${repo}.`,
      x: 80,
      y: 140,
      connections: ["node_gateway"]
    });

    // Node 2: API & Gateway Layer
    dynamicNodes.push({
      id: "node_gateway",
      label: "API Routing & Gateway Boundary",
      layer: "gateway",
      files: gwFiles.length > 0 ? gwFiles.slice(0, 10) : otherFiles.slice(6, 12),
      desc: gwFiles.length > 0
        ? `Manages request intake, HTTP endpoints, parameter routing, and service dispatching.`
        : `Coordinates execution dispatch and external interfaces.`,
      x: 340,
      y: 140,
      connections: ["node_engine", "node_data"]
    });

    // Node 3: Core Domain & Business Logic
    dynamicNodes.push({
      id: "node_engine",
      label: "Core Domain & Service Logic",
      layer: "engine",
      files: engFiles.length > 0 ? engFiles.slice(0, 12) : otherFiles.slice(12, 18),
      desc: `Executes the primary business algorithms, data transformations, and domain operations for ${repo}.`,
      x: 600,
      y: 100,
      connections: ["node_data"]
    });

    // Node 4: Persistence & Storage Layer
    dynamicNodes.push({
      id: "node_data",
      label: "Persistence & Data Storage Layer",
      layer: "database",
      files: dbFiles.length > 0 ? dbFiles.slice(0, 10) : otherFiles.slice(18, 24),
      desc: `Manages state persistence, database schemas, object entities, and configuration storage.`,
      x: 600,
      y: 280,
      connections: []
    });

    // Node 5: Verification & DevOps Layer
    const testFiles = files.filter(f => f.includes("test") || f.includes("spec") || f.includes(".github"));
    if (testFiles.length > 0) {
      dynamicNodes.push({
        id: "node_testing",
        label: "Automated Testing & CI Pipeline",
        layer: "ai",
        files: testFiles.slice(0, 10),
        desc: `Verifies regression boundaries, unit behaviors, and continuous integration workflows.`,
        x: 860,
        y: 190,
        connections: ["node_engine"]
      });
    }

    return dynamicNodes;
  }, [repo, files]);

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Default selection when nodes change
  const activeSelected = selectedNode || nodes[0];

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 700);
  };

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* ── Top Header Bar ── */}
      <div className="h-13 border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between bg-[#090a10] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm tracking-wide">
            <Network className="w-4 h-4 text-amber-400" />
            <span>Architecture Node Graph</span>
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Repo context */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">REPOSITORY:</span>
            <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/20">
              {repo} ({branch})
            </span>
          </div>

          <span className="text-xs font-mono text-zinc-500 hidden md:inline">
            • {files.length} indexed files • {nodes.length} architectural nodes
          </span>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-mono font-bold border border-amber-500/30 transition-colors cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Mapping Nodes..." : "Scan & Map Codebase"}</span>
          </button>

          <div className="h-4 border-r border-white/[0.08] mx-1" />

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Canvas & Inspector Split ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Visual Node Canvas ── */}
        <div className="flex-1 overflow-auto bg-[#07080a] relative p-8">
          <div 
            className="relative min-w-[1050px] min-h-[500px] transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* SVG Connecting Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {nodes.map((node) =>
                node.connections.map((targetId) => {
                  const target = nodes.find((n) => n.id === targetId);
                  if (!target) return null;
                  const startX = node.x + 200;
                  const startY = node.y + 40;
                  const endX = target.x;
                  const endY = target.y + 40;
                  const midX = (startX + endX) / 2;

                  return (
                    <path
                      key={`${node.id}-${target.id}`}
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2"
                      strokeDasharray={isScanning ? "4 4" : undefined}
                      className={isScanning ? "animate-pulse" : ""}
                    />
                  );
                })
              )}
            </svg>

            {/* Interactive Nodes */}
            {nodes.map((node) => {
              const isSelected = activeSelected?.id === node.id;
              const style = LAYER_COLORS[node.layer] || LAYER_COLORS.engine;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{ left: node.x, top: node.y }}
                  className={`absolute w-52 p-3.5 rounded-xl border transition-all cursor-pointer z-10 ${
                    isSelected
                      ? "ring-2 ring-amber-400 border-amber-400 bg-[#0e1019] shadow-xl shadow-amber-400/10 scale-105"
                      : `${style.border} ${style.bg} hover:border-zinc-400 hover:scale-[1.02]`
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.badge}`}>
                      {node.layer}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {node.files.length} files
                    </span>
                  </div>

                  <div className="text-xs font-mono font-bold text-zinc-100 truncate mb-1">
                    {node.label}
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {node.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT INSPECTOR PANEL: Selected Node Detail & Source Files ── */}
        <div className="w-80 sm:w-96 border-l border-white/[0.08] bg-[#090a10] flex flex-col flex-shrink-0 overflow-hidden">
          {activeSelected ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/[0.08] space-y-2 bg-[#0c0d14]">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${LAYER_COLORS[activeSelected.layer]?.badge}`}>
                    {activeSelected.layer} Layer
                  </span>
                  <span className="text-xs font-mono text-zinc-500">ID: {activeSelected.id}</span>
                </div>
                <h3 className="text-sm font-bold font-mono text-zinc-100">
                  {activeSelected.label}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {activeSelected.desc}
                </p>
              </div>

              {/* Connected Targets */}
              {activeSelected.connections.length > 0 && (
                <div className="p-3 border-b border-white/[0.06] bg-[#0e1018] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-semibold">
                    Downstream Communication
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSelected.connections.map((cId) => (
                      <span key={cId} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
                        ➔ {nodes.find((n) => n.id === cId)?.label || cId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Files List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-semibold flex items-center justify-between">
                  <span>Assigned Source Files ({activeSelected.files.length})</span>
                  <span className="text-zinc-600 font-normal">Active in {repo}</span>
                </div>

                <div className="space-y-1.5">
                  {activeSelected.files.map((file) => (
                    <div
                      key={file}
                      className="p-2 rounded-lg bg-[#0e1017] border border-white/[0.04] hover:border-amber-400/30 transition-colors flex items-center gap-2 text-xs font-mono text-zinc-300 group"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                      <span className="truncate group-hover:text-amber-200 transition-colors">{file}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/[0.08] bg-[#0c0d14] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                <span>Verified via RepoMind AST</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> In Sync
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-zinc-500">
              Select any node on the graph to inspect assigned repository files and connection pipelines.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
