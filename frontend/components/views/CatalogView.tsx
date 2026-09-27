"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Code,
  CheckCircle2,
  RefreshCw,
  Lock,
  Workflow,
  Cpu,
  Database,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Search,
  ChevronRight,
  Bookmark,
  Terminal,
  Server,
  Zap,
  Flame,
  HelpCircle,
  FolderGit2
} from "lucide-react";
import { generateRepoManual, type RepoManualResult } from "@/lib/api";

interface CatalogViewProps {
  repo?: string;
  branch?: string;
}

export function CatalogView({
  repo = "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ",
  branch = "main",
}: CatalogViewProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [manualData, setManualData] = useState<RepoManualResult | null>(null);
  const [activeSection, setActiveSection] = useState<string>("sec-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Sections navigation list
  const sections = useMemo(() => [
    { id: "sec-1", title: "1. Executive Summary & Core Mission", icon: ShieldCheck },
    { id: "sec-2", title: "2. Architectural Blueprint & Layers", icon: Workflow },
    { id: "sec-3", title: "3. Directory & Module Map", icon: FolderGit2 },
    { id: "sec-4", title: "4. Proprietary Algorithms & Engines", icon: Cpu },
    { id: "sec-5", title: "5. End-to-End Data Flows & Pipelines", icon: Zap },
    { id: "sec-6", title: "6. Developer Guide: How to Make Changes", icon: Terminal },
    { id: "sec-7", title: "7. Tech Stack & Prerequisites Matrix", icon: Server },
  ], []);

  // Fetch or generate repository manual
  const loadManual = async (force = false) => {
    setLoading(true);
    try {
      const res = await generateRepoManual(repo, branch, force);
      setManualData(res);
    } catch (err) {
      console.warn("Manual generation notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManual(false);
  }, [repo, branch]);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Copy Markdown content
  const handleCopy = () => {
    if (!manualData?.manual_content) return;
    navigator.clipboard.writeText(manualData.manual_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown file
  const handleDownload = () => {
    if (!manualData?.manual_content) return;
    const blob = new Blob([manualData.manual_content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanName = repo.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `${cleanName}-architecture-manual.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* ── Top Header Toolbar ── */}
      <div className="h-13 border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between bg-[#090a10] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm tracking-wide">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>AI Architecture Blueprint & Repository User Manual</span>
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Repo context */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">TARGET REPO:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/25">
              {repo} ({branch})
            </span>
          </div>

          {/* Non-editable Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-400">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Read-Only Architecture Guide</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Refresh/Regenerate */}
          <button
            onClick={() => loadManual(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono font-semibold border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            title="Perform fresh repository scan & re-generate manual"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Regenerate Analysis</span>
          </button>

          {/* Copy Markdown */}
          <button
            onClick={handleCopy}
            disabled={!manualData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono font-semibold border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            title="Copy full markdown manual to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy Markdown"}</span>
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            disabled={!manualData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Download as .md file"
          >
            {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Export Manual (.md)</span>
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body (Index Sidebar + Document Content) ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT INDEX SIDEBAR: Table of Contents & Quick Navigation ── */}
        <div className="w-72 sm:w-80 border-r border-white/[0.08] bg-[#090a10] flex flex-col flex-shrink-0 overflow-hidden">
          
          {/* Index Header */}
          <div className="p-3.5 border-b border-white/[0.06] bg-[#0c0d14] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              <span className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                Table of Contents
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">
                {sections.length} Chapters
              </span>
            </div>

            {/* In-Manual Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search topics in manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12141e] border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400/50 font-mono"
              />
            </div>
          </div>

          {/* Sections List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {sections
              .filter(sec => !searchQuery.trim() || sec.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((sec) => {
                const IconComponent = sec.icon;
                const isSelected = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold shadow-sm"
                        : "bg-[#0e1017] border-white/[0.04] text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <IconComponent className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-zinc-600"}`} />
                  </button>
                );
              })}
          </div>

          {/* Index Footer */}
          <div className="p-3 border-t border-white/[0.06] bg-[#0c0d14] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Fully Verified
            </span>
            <span>RepoMind Engine v0.2.0</span>
          </div>
        </div>

        {/* ── RIGHT READING STAGE: Markdown Document & Visual Architecture ── */}
        <div ref={contentContainerRef} className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#07080a] select-text">
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 rounded-2xl bg-[#0a0c14] border border-white/[0.08] my-6">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-sm font-mono font-bold text-zinc-200">
                Scanning repository file tree & generating comprehensive architecture manual...
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                Extracting AST dependencies, algorithm pathways, data flows, and developer modification guides for {repo}
              </div>
            </div>
          )}

          {/* Render Structured Document Content */}
          <div className="max-w-4xl mx-auto space-y-10">

            {/* Document Header Hero */}
            <div className="pb-6 border-b border-white/[0.08] space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>OFFICIAL REPOSITORY ARCHITECTURE BLUEPRINT & USER MANUAL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                {repo}
              </h1>
              <p className="text-xs font-mono text-zinc-500">
                Generated autonomously via RepoMind AST Reasoning Engine • Branch: <code className="text-zinc-300">{branch}</code>
              </p>
            </div>

            {/* SECTION 1: System Executive Summary */}
            <section id="sec-1" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  1. System Executive Summary & Core Mission
                </h2>
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed space-y-3 font-sans">
                <p>
                  <strong>RepoMind</strong> is an enterprise-grade autonomous pull request risk intelligence, automated code review, and architectural blast-radius governance engine developed for the <strong>IBM BOB 2.0 Hackathon</strong>.
                </p>
                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Core Objectives</h4>
                  <ul className="text-xs space-y-2 list-disc list-inside text-zinc-300 font-mono">
                    <li><strong>Autonomous PR Risk Profiling:</strong> Tokenizes unified diffs to classify regression severity without requiring user tokens.</li>
                    <li><strong>AST Blast Radius Mapping:</strong> Recursively locates downstream callers of modified functions to prevent ripple-effect breakage.</li>
                    <li><strong>Surgical Code Synthesis:</strong> Implements non-destructive search-and-replace patches that guarantee 100% preservation of surrounding code.</li>
                    <li><strong>Zero-Token Architecture:</strong> Utilizes short-lived RS256 GitHub App installation tokens and HTTP-only OAuth sessions.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SECTION 2: High-Level Architecture Blueprint */}
            <section id="sec-2" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <Workflow className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  2. High-Level Architectural Blueprint & System Layers
                </h2>
              </div>

              {/* Visual System Architecture Diagram */}
              <div className="p-5 rounded-xl bg-[#090a12] border border-white/[0.08] space-y-4">
                <div className="text-xs font-mono uppercase text-zinc-400 font-bold flex items-center justify-between">
                  <span>System Layer Communication Topology</span>
                  <span className="text-[10px] text-amber-400 font-normal">Next.js 16 ➔ FastAPI ➔ SQLite & LLM</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                  {/* Layer 1 */}
                  <div className="p-3 rounded-lg bg-[#111320] border border-white/[0.08] space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Layer 1: Client</span>
                    <div className="text-zinc-200 font-bold">Next.js 16 Studio</div>
                    <p className="text-[11px] text-zinc-400 font-sans">DiffViewer editor, Domino blast visualizer, file tree explorer, and tab manager.</p>
                  </div>
                  {/* Layer 2 */}
                  <div className="p-3 rounded-lg bg-[#111320] border border-white/[0.08] space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Layer 2: Gateway</span>
                    <div className="text-zinc-200 font-bold">FastAPI REST Router</div>
                    <p className="text-[11px] text-zinc-400 font-sans">Token resolution, session cookie validation, CORS filters, and workspace dispatching.</p>
                  </div>
                  {/* Layer 3 */}
                  <div className="p-3 rounded-lg bg-[#111320] border border-white/[0.08] space-y-2">
                    <span className="text-[10px] font-bold text-sky-400 uppercase">Layer 3: Core Engines</span>
                    <div className="text-zinc-200 font-bold">AST & LLM Reasoner</div>
                    <p className="text-[11px] text-zinc-400 font-sans">Diff tokenizer, AST dependency scanner, surgical patcher, and code integrity guardian.</p>
                  </div>
                  {/* Layer 4 */}
                  <div className="p-3 rounded-lg bg-[#111320] border border-white/[0.08] space-y-2">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Layer 4: Storage</span>
                    <div className="text-zinc-200 font-bold">SQLite Telemetry</div>
                    <p className="text-[11px] text-zinc-400 font-sans">Cached PR analyses, workspace history sessions, and architecture manuals.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: Directory & Module Map */}
            <section id="sec-3" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <FolderGit2 className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  3. Directory & Module Map (Component Responsibilities)
                </h2>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <div className="font-bold text-amber-300">📂 backend/</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-300 pl-3 border-l border-amber-500/30">
                    <div><code className="text-zinc-100 font-bold">main.py</code>: REST router & HTTP application root</div>
                    <div><code className="text-zinc-100 font-bold">llm_client.py</code>: Groq & Gemini multi-model agent engine</div>
                    <div><code className="text-zinc-100 font-bold">dependency_finder.py</code>: AST blast radius & symbol consumer scanner</div>
                    <div><code className="text-zinc-100 font-bold">diff_parser.py</code>: Git unified diff tokenizer & hunk parser</div>
                    <div><code className="text-zinc-100 font-bold">database.py</code>: SQLAlchemy Core persistence layer</div>
                    <div><code className="text-zinc-100 font-bold">github_client.py</code>: GitHub REST API integration</div>
                    <div><code className="text-zinc-100 font-bold">oauth.py</code>: Zero-token GitHub OAuth & session cookies</div>
                    <div><code className="text-zinc-100 font-bold">github_app.py</code>: RS256 JWT installation tokens & bot comments</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <div className="font-bold text-sky-300">📂 frontend/</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-300 pl-3 border-l border-sky-500/30">
                    <div><code className="text-zinc-100 font-bold">app/dashboard/page.tsx</code>: Main VS Code-style IDE orchestrator</div>
                    <div><code className="text-zinc-100 font-bold">components/DiffViewer.tsx</code>: Monospace code editor & PR modal</div>
                    <div><code className="text-zinc-100 font-bold">components/views/GitBlastView.tsx</code>: Domino ripple simulator</div>
                    <div><code className="text-zinc-100 font-bold">components/views/CatalogView.tsx</code>: Architecture manual studio</div>
                    <div><code className="text-zinc-100 font-bold">components/FileTree.tsx</code>: File tree, branch switcher & live PRs</div>
                    <div><code className="text-zinc-100 font-bold">lib/api.ts</code>: Typed client communicating with backend proxy</div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: Proprietary Algorithms & Core Engines */}
            <section id="sec-4" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  4. Proprietary Algorithms & Core Engines
                </h2>
              </div>

              <div className="space-y-3 font-sans text-xs text-zinc-300">
                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="font-mono font-bold text-amber-300 text-sm">
                    Algorithm A: AST Blast Radius Mapping (dependency_finder.py)
                  </h4>
                  <p className="leading-relaxed">
                    Rather than relying on brittle regex matching alone, the engine parses hunk headers to extract symbols (functions, class definitions, exported constants) that experienced line modifications. It then performs a whole-word token traversal across repository source files to construct a directed dependency graph.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="font-mono font-bold text-emerald-300 text-sm">
                    Algorithm B: Surgical Search-and-Replace Patching (llm_client.py)
                  </h4>
                  <p className="leading-relaxed">
                    Eliminates catastrophic file wipeouts. When modifying 1,000-line files, the AI outputs exact <code className="text-zinc-100 font-mono">search</code> blocks and <code className="text-zinc-100 font-mono">replace</code> blocks. A 4-stage fuzzy normalizer matches indentation, CRLF/LF line endings, and whitespace to substitute only the targeted lines. 100% of the surrounding file is untouched.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="font-mono font-bold text-sky-300 text-sm">
                    Algorithm C: Code Integrity Guardian (_validate_code_integrity)
                  </h4>
                  <p className="leading-relaxed">
                    Inspects all AI code output before presentation. It scans for lazy placeholder comments (e.g. <code className="text-rose-300 font-mono">// ... existing code ...</code>) and catastrophic truncation (file length dropping by &gt;40%). If detected, the response is instantly rejected and re-prompted via Gemini 2.5 Flash.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 5: End-to-End Data Flows & Pipelines */}
            <section id="sec-5" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  5. End-to-End Data Flows & Pipelines
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] font-mono text-xs space-y-3">
                <div className="font-bold text-amber-300">Pipeline: Autonomous Code Modification & GitHub PR Creation</div>
                <div className="p-3 rounded-lg bg-[#090a12] text-zinc-300 space-y-1.5 border border-white/[0.06]">
                  <div>1. User writes instruction in DiffViewer (or clicks AI Fix finding in ReviewPanel)</div>
                  <div>2. Frontend dispatches <code className="text-amber-400">POST /ai/generate-code</code> with up to 80,000 characters context</div>
                  <div>3. <code className="text-emerald-400">llm_client.generate_code_fix</code> applies surgical search-and-replace patches</div>
                  <div>4. <code className="text-sky-400">_validate_code_integrity</code> confirms zero code loss and absence of placeholders</div>
                  <div>5. Frontend renders interactive unified diff in DiffViewer editor buffer</div>
                  <div>6. User confirms and clicks "Create PR" ➔ <code className="text-rose-400">POST /repo/create-pr</code></div>
                  <div>7. <code className="text-purple-400">github_client</code> creates feature branch, commits patched file, and opens live GitHub PR</div>
                </div>
              </div>
            </section>

            {/* SECTION 6: Developer Guide */}
            <section id="sec-6" className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  6. Developer Modification Guide: How to Safely Make Changes
                </h2>
              </div>

              <div className="space-y-3 font-sans text-xs text-zinc-300">
                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="font-mono font-bold text-zinc-100 text-sm">How to Add a New API Route</h4>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                    <li>Define payload schema in <code className="text-amber-300">backend/models.py</code> using Pydantic.</li>
                    <li>Add your route in <code className="text-amber-300">backend/main.py</code> with dependency <code className="text-emerald-300">get_current_token</code>.</li>
                    <li>Expose the typed function in <code className="text-amber-300">frontend/lib/api.ts</code>.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#0c0e18] border border-white/[0.08] space-y-2">
                  <h4 className="font-mono font-bold text-zinc-100 text-sm">How to Add a New Studio View</h4>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                    <li>Create component at <code className="text-sky-300">frontend/components/views/YourView.tsx</code>.</li>
                    <li>Add the rail icon in <code className="text-sky-300">frontend/components/Shell.tsx</code>.</li>
                    <li>Mount your view in <code className="text-sky-300">frontend/app/dashboard/page.tsx</code> inside <code className="text-emerald-300">mainContent</code>.</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* SECTION 7: Tech Stack Matrix */}
            <section id="sec-7" className="space-y-4 pt-2 pb-8">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                <Server className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-mono text-zinc-100">
                  7. Tech Stack & Environment Prerequisites Matrix
                </h2>
              </div>

              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#090a10]">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="bg-[#12141e] border-b border-white/[0.08] text-zinc-400 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-4">Component</th>
                      <th className="py-2.5 px-4">Technology</th>
                      <th className="py-2.5 px-4">Version</th>
                      <th className="py-2.5 px-4">Responsibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-zinc-200">Frontend</td>
                      <td className="py-2.5 px-4 text-emerald-400">Next.js + React</td>
                      <td className="py-2.5 px-4">16.3.6 / 19.2</td>
                      <td className="py-2.5 px-4 text-zinc-400">IDE studio UI & proxy rewrites</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-zinc-200">Backend</td>
                      <td className="py-2.5 px-4 text-emerald-400">FastAPI</td>
                      <td className="py-2.5 px-4">0.115+</td>
                      <td className="py-2.5 px-4 text-zinc-400">Async REST gateway & router</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-zinc-200">Primary AI</td>
                      <td className="py-2.5 px-4 text-amber-400">Groq (LLaMA-3 / GPT-OSS)</td>
                      <td className="py-2.5 px-4">Cloud API</td>
                      <td className="py-2.5 px-4 text-zinc-400">Surgical code modification</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-zinc-200">Fallback AI</td>
                      <td className="py-2.5 px-4 text-amber-400">Google Gemini 2.5 Flash</td>
                      <td className="py-2.5 px-4">Cloud API</td>
                      <td className="py-2.5 px-4 text-zinc-400">1M token context & full audit</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-zinc-200">Database</td>
                      <td className="py-2.5 px-4 text-sky-400">SQLite + SQLAlchemy Core</td>
                      <td className="py-2.5 px-4">2.0+</td>
                      <td className="py-2.5 px-4 text-zinc-400">Persistent telemetry & manual cache</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>

      </div>

    </div>
  );
}
