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
  RefreshCw, 
  Lock, 
  Workflow, 
  Cpu, 
  Database, 
  ArrowRight, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  Bookmark, 
  Terminal, 
  Server, 
  Zap, 
  FolderGit2
} from "lucide-react";
import { generateRepoManual, type RepoManualResult } from "@/lib/api";

interface CatalogViewProps {
  repo?: string;
  branch?: string;
}

interface ParsedChapter {
  id: string;
  num: number;
  title: string;
  body: string;
}

const SECTION_ICONS = [
  ShieldCheck,
  Workflow,
  FolderGit2,
  Cpu,
  Zap,
  Terminal,
  Server,
];

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

  // Fetch or generate repository manual whenever repo or branch changes
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

  // Dynamically parse markdown manual content into structured chapters
  const chapters: ParsedChapter[] = useMemo(() => {
    if (!manualData?.manual_content) return [];
    const text = manualData.manual_content;
    const splitRegex = /(?=^##\s+\d+\.)/m;
    const rawChunks = text.split(splitRegex);

    const parsed: ParsedChapter[] = [];
    let count = 0;

    for (const chunk of rawChunks) {
      const match = chunk.match(/^##\s+(\d+)\.\s+([^\n]+)/m);
      if (match) {
        count += 1;
        const num = parseInt(match[1], 10) || count;
        const title = `${num}. ${match[2].trim()}`;
        const body = chunk.replace(/^##\s+[^\n]+\n?/, "").trim();
        parsed.push({
          id: `sec-${num}`,
          num,
          title,
          body,
        });
      }
    }

    // Fallback if formatting was non-standard
    if (parsed.length === 0 && text.trim().length > 0) {
      parsed.push({
        id: "sec-1",
        num: 1,
        title: "1. Repository Architecture & Technical Guide",
        body: text,
      });
    }

    return parsed;
  }, [manualData?.manual_content]);

  // Filter chapters based on search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)
    );
  }, [chapters, searchQuery]);

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

          {/* Active target repository context */}
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

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Regenerate Analysis */}
          <button
            onClick={() => loadManual(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono font-semibold border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            title="Force refresh & regenerate architecture blueprint"
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
                {chapters.length} Chapters
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
            {filteredChapters.map((ch, idx) => {
              const IconComponent = SECTION_ICONS[idx % SECTION_ICONS.length] || FileText;
              const isSelected = activeSection === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => scrollToSection(ch.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold shadow-sm"
                      : "bg-[#0e1017] border-white/[0.04] text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <IconComponent className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                    <span className="truncate">{ch.title}</span>
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
                Extracting modules, algorithm pathways, data flows, and developer guides for {repo}
              </div>
            </div>
          )}

          {/* Render Dynamic Structured Document Content */}
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

            {/* Render Each Parsed Chapter Dynamically */}
            {chapters.map((ch, idx) => {
              const IconComponent = SECTION_ICONS[idx % SECTION_ICONS.length] || FileText;
              return (
                <section key={ch.id} id={ch.id} className="space-y-4 pt-2">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
                    <IconComponent className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <h2 className="text-lg font-bold font-mono text-zinc-100">
                      {ch.title}
                    </h2>
                  </div>
                  <div className="text-sm text-zinc-300 leading-relaxed space-y-3 font-sans">
                    <RenderMarkdownContent content={ch.body} />
                  </div>
                </section>
              );
            })}

          </div>
        </div>

      </div>

    </div>
  );
}

// ── Lightweight Rich Markdown Element Renderer ──────────────────────────────
function RenderMarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  // Split into paragraphs / code blocks / tables / lists
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block / Mermaid
    if (line.trim().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join("\n");

      if (lang === "mermaid") {
        elements.push(
          <div key={`mermaid-${i}`} className="p-4 rounded-xl bg-[#090a12] border border-emerald-500/20 space-y-2 my-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5" /> Architecture Component Graph
              </span>
              <span className="text-zinc-500 font-normal">Mermaid Blueprint</span>
            </div>
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto p-3 rounded-lg bg-[#0c0d16] border border-white/[0.04]">
              {fullCode}
            </pre>
          </div>
        );
      } else {
        elements.push(
          <div key={`code-${i}`} className="p-3.5 rounded-xl bg-[#0b0c14] border border-white/[0.08] my-3 overflow-hidden">
            {lang && (
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5 pb-1 border-b border-white/[0.04]">
                {lang}
              </div>
            )}
            <pre className="text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed">
              {fullCode}
            </pre>
          </div>
        );
      }
      continue;
    }

    // 2. Markdown Table
    if (line.includes("|") && line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCols = tableLines[0].split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        const bodyRows = tableLines.slice(2).map(r => r.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));

        elements.push(
          <div key={`table-${i}`} className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#090a10] my-3">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[#12141e] border-b border-white/[0.08] text-zinc-400 font-semibold text-[11px] uppercase">
                  {headerCols.map((h, hIdx) => (
                    <th key={hIdx} className="py-2.5 px-4">{h.replace(/\*\*/g, "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.01]">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`py-2 px-4 ${cIdx === 0 ? "font-bold text-zinc-200" : "text-zinc-300"}`}>
                        {cell.replace(/\*\*/g, "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Subheadings (###)
    if (line.trim().startsWith("### ")) {
      const subTitle = line.trim().replace(/^###\s+/, "");
      elements.push(
        <h4 key={`sub-${i}`} className="font-mono font-bold text-sm text-emerald-300 pt-2 flex items-center gap-2">
          <span>{subTitle}</span>
        </h4>
      );
      i++;
      continue;
    }

    // 4. Bullet lists (- or *)
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="space-y-1.5 my-2 pl-4 list-disc text-xs font-mono text-zinc-300">
          {listItems.map((item, idx) => (
            <li key={idx}>
              <FormatInlineTokens text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Blockquote (> ...)
    if (line.trim().startsWith(">")) {
      const quote = line.trim().replace(/^>\s*/, "");
      elements.push(
        <blockquote key={`quote-${i}`} className="p-3 rounded-lg bg-emerald-500/5 border-l-2 border-emerald-400 text-xs font-mono text-zinc-300 my-2">
          {quote}
        </blockquote>
      );
      i++;
      continue;
    }

    // 6. Regular Paragraph
    if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-zinc-300 leading-relaxed">
          <FormatInlineTokens text={line} />
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-2">{elements}</div>;
}

// Inline token renderer for bold, code, and text
function FormatInlineTokens({ text }: { text: string }) {
  // Regex to split on `code` or **bold**
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((p, idx) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-amber-300 font-mono text-[11px] border border-white/[0.04]">
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={idx} className="font-semibold text-zinc-100">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={idx}>{p}</span>;
      })}
    </>
  );
}
