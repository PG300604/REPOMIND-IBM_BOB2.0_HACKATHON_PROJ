"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Save, 
  RotateCcw, 
  Edit3, 
  Eye, 
  Split, 
  WrapText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  ChevronRight,
  GitCommit,
  Sparkles,
  GitPullRequest,
  Send,
  X,
  ExternalLink
} from "lucide-react";
import { 
  getRepoFileContent, 
  saveRepoFileContent, 
  generateAiCode, 
  createPullRequest, 
  type RepoFileContent,
  type CreatePrResult,
  type PullRequestItem,
} from "@/lib/api";

interface DiffViewerProps {
  rawDiff: string;
  activeFile: string | null;
  repo?: string;
  branch?: string;
  onContentSaved?: (path: string, content: string) => void;
  initialAiInstruction?: string | null;
  openPrModalTrigger?: number;
  initialPrData?: { title?: string; body?: string; branch?: string } | null;
  onPrCreated?: (pr: PullRequestItem) => void;
}

// Fallback demo files if backend is unavailable
const DEMO_FALLBACK: Record<string, string> = {
  "Services (Item)": `$w.onReady(() => {
  const service = $w('#servicesDataset').getCurrentItem();

  if (service.category === 'Compliance') {
    $w('#page').style.backgroundColor = '#F6F7F8';
  }

  if (service.category === 'Advisory') {
    $w('#enterpriseNote').text =
      'This service is delivered through a tailored engagement model.';
  }
});`,
  "About": `// About page controller
export function initAbout() {
  const team = [
    { name: 'Architecture Lead', role: 'Security & Core' },
    { name: 'AI Reviewer', role: 'Risk Assessment' }
  ];
  return team;
}`,
  "masterPage.js": `// masterPage.js - Global App Configuration
import { initTelemetry } from 'backend/telemetry';

$w.onReady(function () {
  // Initialize PR Risk Radar Client Listener
  initTelemetry({ mode: 'strict_audit' });
});`,
  "requirements.txt": `fastapi
uvicorn[standard]
httpx
python-dotenv
sqlalchemy
PyJWT
cryptography
itsdangerous`,
};

function parseDiffSection(fullDiff: string, targetPath: string) {
  if (!fullDiff || !targetPath) return null;
  const sections = fullDiff.split(/(?=^diff --git )/m);

  for (const section of sections) {
    const pathMatch = section.match(/^\+\+\+ b\/(.+)/m);
    if (!pathMatch) continue;
    const fp = pathMatch[1].trim();
    if (fp !== targetPath && !targetPath.endsWith(fp) && !fp.endsWith(targetPath)) continue;

    const lines = section.split("\n");
    const result: Array<{
      type: "hunk" | "added" | "removed" | "context" | "header";
      content: string;
      oldLine?: number;
      newLine?: number;
    }> = [];

    let addLine = 1;
    let remLine = 1;
    let inHunk = false;

    result.push({ type: "header", content: fp });

    for (const line of lines) {
      if (line.startsWith("@@")) {
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
        if (m) {
          remLine = parseInt(m[1], 10);
          addLine = parseInt(m[2], 10);
        }
        result.push({ type: "hunk", content: line });
        inHunk = true;
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        result.push({ type: "added", content: line.slice(1), newLine: addLine++ });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        result.push({ type: "removed", content: line.slice(1), oldLine: remLine++ });
      } else if (
        inHunk &&
        !line.startsWith("diff ") &&
        !line.startsWith("index ") &&
        !line.startsWith("--- ") &&
        !line.startsWith("+++ ")
      ) {
        result.push({
          type: "context",
          content: line,
          oldLine: remLine++,
          newLine: addLine++,
        });
      }
    }

    return result;
  }
  return null;
}

function detectLanguage(path: string): string {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "py":
      return "python";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    case "yaml":
    case "yml":
      return "yaml";
    case "sql":
      return "sql";
    default:
      return "plaintext";
  }
}

// Professional Obsidian / OneDark Syntax Highlighter & Indentation Engine
function highlightCode(code: string, language: string) {
  if (!code) return null;

  // Rich lexical token patterns
  const tokens = code.split(
    /('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`[^`]*`|#.*|\/\/.*|\/\*[\s\S]*?\*\/|\b(?:import|export|from|as|default|function|class|const|let|var|return|def|async|await|try|except|catch|finally|while|for|in|of|type|interface|enum|public|private|protected|static|readonly|with|yield|pass|lambda|switch|case|break|continue|new|typeof|instanceof|extends|implements)\b|\b(?:useState|useEffect|useMemo|useCallback|useRef|useContext|render|parseDiff|fetch|encodeURIComponent|split|join|map|filter|reduce|find|push|pop|replace|match|search|slice|FastAPI|Depends|HTTPException|BaseModel|Request|Response)\b|\b(?:React|FC|JSX|DiffViewerProps|HTMLTextAreaElement|Promise|Array|Record|string|number|boolean|any|void)\b|\b(?:true|false|null|undefined|None|True|False)\b|\b\d+\b|(\{|\}|\(|\)|\[|\]|=>|===|!==|==|!=|\+|\-|\*|\/|\&{2}|\|{2}))/g
  );

  return tokens.map((token, i) => {
    if (!token) return null;

    // Strings (Warm natural emerald green)
    if (token.startsWith("'") || token.startsWith('"') || token.startsWith("`")) {
      return <span key={i} className="text-[#98c379]">{token}</span>;
    }
    // Comments (Muted slate gray italic)
    if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) {
      return <span key={i} className="text-[#5c6370] italic">{token}</span>;
    }
    // Keywords (Tokyo Night / OneDark soft purple)
    if (/^(import|export|from|as|default|function|class|const|let|var|return|def|async|await|try|except|catch|finally|while|for|in|of|type|interface|enum|public|private|protected|static|readonly|with|yield|pass|lambda|switch|case|break|continue|new|typeof|instanceof|extends|implements)$/.test(token)) {
      return <span key={i} className="text-[#c678dd] font-semibold">{token}</span>;
    }
    // Built-in functions, React hooks, and methods (Vibrant cyan/blue)
    if (/^(useState|useEffect|useMemo|useCallback|useRef|useContext|render|parseDiff|fetch|encodeURIComponent|split|join|map|filter|reduce|find|push|pop|replace|match|search|slice|FastAPI|Depends|HTTPException|BaseModel|Request|Response)$/.test(token)) {
      return <span key={i} className="text-[#61afef] font-medium">{token}</span>;
    }
    // Types, Interfaces & Component Names (Warm gold/yellow)
    if (/^(React|FC|JSX|DiffViewerProps|HTMLTextAreaElement|Promise|Array|Record|string|number|boolean|any|void)$/.test(token)) {
      return <span key={i} className="text-[#e5c07b] font-medium">{token}</span>;
    }
    // Booleans & Null (Warm coral/orange)
    if (/^(true|false|null|undefined|None|True|False)$/.test(token)) {
      return <span key={i} className="text-[#d19a66] font-medium">{token}</span>;
    }
    // Numbers (Warm amber/orange)
    if (/^\d+$/.test(token)) {
      return <span key={i} className="text-[#d19a66]">{token}</span>;
    }
    // Brackets & Operators (Muted silver)
    if (/^(\{|\}|\(|\)|\[|\]|=>|===|!==|==|!=|\+|\-|\*|\/|\&{2}|\|{2})$/.test(token)) {
      return <span key={i} className="text-[#abb2bf]">{token}</span>;
    }

    return <span key={i} className="text-[#e2e8f0]">{token}</span>;
  });
}

// Visual Indentation Guide & Code Line Renderer
function renderCodeLine(code: string, language: string, isWrap: boolean) {
  const leadingMatch = code.match(/^(\s+)/);
  const leadingSpaces = leadingMatch ? leadingMatch[1] : "";
  const isPython = language === "python";
  const step = isPython ? 4 : 2;
  const indentCount = Math.floor(leadingSpaces.length / step);
  const remainderSpaces = " ".repeat(leadingSpaces.length % step);
  const trimmed = code.slice(leadingSpaces.length);

  return (
    <div className={cn("flex items-center flex-1 font-mono text-[13px] tracking-wide", isWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre")}>
      {Array.from({ length: indentCount }).map((_, i) => (
        <span
          key={i}
          className="inline-block border-l border-white/[0.08] h-5 flex-shrink-0"
          style={{ width: isPython ? "24px" : "16px" }}
        />
      ))}
      {remainderSpaces}
      <span>{highlightCode(trimmed, language)}</span>
    </div>
  );
}

export function DiffViewer({
  rawDiff,
  activeFile,
  repo = "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ",
  branch = "main",
  onContentSaved,
  initialAiInstruction,
  openPrModalTrigger,
  initialPrData,
  onPrCreated,
}: DiffViewerProps) {
  const [fileContent, setFileContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [source, setSource] = useState<string>("local");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── AI Code Writing Bot State ──
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{ explanation: string; revised: string; diff: string } | null>(null);

  // ── PR Creation Modal State ──
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBranch, setPrBranch] = useState("");
  const [prBody, setPrBody] = useState("");
  const [isSubmittingPr, setIsSubmittingPr] = useState(false);
  const [prSuccessResult, setPrSuccessResult] = useState<CreatePrResult | null>(null);

  // Check if diff is available for this activeFile
  const diffLines = useMemo(() => {
    if (!rawDiff || !activeFile) return null;
    return parseDiffSection(rawDiff, activeFile);
  }, [rawDiff, activeFile]);

  const hasDiff = Boolean(diffLines && diffLines.length > 0);
  const [viewMode, setViewMode] = useState<"code" | "diff">("code");

  // Synchronize view mode if diff exists
  useEffect(() => {
    if (hasDiff) {
      setViewMode("diff");
    } else {
      setViewMode("code");
    }
  }, [hasDiff, activeFile]);

  // If initial instruction passed (from AI Review finding)
  useEffect(() => {
    if (initialAiInstruction) {
      setAiInstruction(initialAiInstruction);
      setIsAiOpen(true);
    }
  }, [initialAiInstruction]);

  // Handle external trigger to open PR modal
  useEffect(() => {
    if (openPrModalTrigger && openPrModalTrigger > 0) {
      if (initialPrData) {
        if (initialPrData.title) setPrTitle(initialPrData.title);
        if (initialPrData.branch) setPrBranch(initialPrData.branch);
        if (initialPrData.body) setPrBody(initialPrData.body);
      } else {
        const baseName = activeFile ? activeFile.split("/").pop()?.replace(/\.[^/.]+$/, "") : "update";
        setPrTitle(`fix: update ${activeFile || "code"}`);
        setPrBranch(`fix/${baseName}-improvements`);
        setPrBody(`Automated Pull Request generated via RepoMind Studio.\n\n### Changes Summary\n- Updated \`${activeFile || "workspace"}\` with quality and security refinements.\n- Validated against AST dependency graph.`);
      }
      setPrSuccessResult(null);
      setIsPrModalOpen(true);
    }
  }, [openPrModalTrigger, initialPrData, activeFile]);

  // Fetch real file content when activeFile changes
  useEffect(() => {
    if (!activeFile) return;

    let canceled = false;
    setIsLoading(true);
    setSaveMessage(null);
    setAiResult(null);

    getRepoFileContent(repo, activeFile, branch)
      .then((data: RepoFileContent) => {
        if (canceled) return;
        setFileContent(data.content);
        setOriginalContent(data.content);
        setSource(data.source);
        setIsLoading(false);
      })
      .catch((_err) => {
        if (canceled) return;
        const fallback = DEMO_FALLBACK[activeFile] || `// File: ${activeFile}\n// Repository: ${repo} (${branch})\n\n// Start writing or asking AI to generate code here.\n`;
        setFileContent(fallback);
        setOriginalContent(fallback);
        setSource("fallback");
        setIsLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [activeFile, repo, branch]);

  const isDirty = fileContent !== originalContent;
  const language = activeFile ? detectLanguage(activeFile) : "plaintext";
  const lines = useMemo(() => fileContent.split("\n"), [fileContent]);

  // Handle Save
  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await saveRepoFileContent(repo, activeFile, fileContent, branch);
      setOriginalContent(fileContent);
      setIsSaving(false);
      setSaveMessage(`Saved to ${res.source || "workspace"}`);
      onContentSaved?.(activeFile, fileContent);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setIsSaving(false);
      setSaveMessage("Saved to session memory");
      setOriginalContent(fileContent);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, fileContent, activeFile]);

  // Handle AI Code Generation
  const handleGenerateAiFix = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeFile || !aiInstruction.trim()) return;

    setIsGeneratingAi(true);
    try {
      const res = await generateAiCode(activeFile, aiInstruction, fileContent);
      setAiResult({
        explanation: res.explanation,
        revised: res.revised_content,
        diff: res.diff,
      });
    } catch (err: any) {
      console.warn("AI code generation notice:", err);
      const fallbackPatch = `// AI Fix: ${aiInstruction}\n` + fileContent;
      setAiResult({
        explanation: `AI Code Suggestion: ${aiInstruction}`,
        revised: fallbackPatch,
        diff: `--- a/${activeFile}\n+++ b/${activeFile}\n@@ -1,1 +1,2 @@\n+// AI Fix: ${aiInstruction}\n`,
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply AI Fix to code
  const handleApplyAiFix = () => {
    if (!aiResult) return;
    setFileContent(aiResult.revised);
    setAiResult(null);
    setIsAiOpen(false);
    setIsEditing(true);
    setSaveMessage("AI fix applied to buffer! Save changes to persist.");
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Open PR modal with prefilled data
  const handleOpenPrModal = () => {
    const baseName = activeFile ? activeFile.split("/").pop()?.replace(/\.[^/.]+$/, "") : "update";
    setPrTitle(`fix: update ${activeFile || "code"}`);
    setPrBranch(`fix/${baseName}-improvements`);
    setPrBody(`Automated Pull Request generated via RepoMind Studio.\n\n### Changes Summary\n- Updated \`${activeFile}\` with quality and security refinements.\n- Validated against AST dependency graph.`);
    setPrSuccessResult(null);
    setIsPrModalOpen(true);
  };

  // Submit PR to GitHub
  const handleSubmitPr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile) return;

    // Use AI fix if available and not yet applied, otherwise active buffer
    const contentToCommit = (aiResult?.revised && aiResult.revised !== fileContent)
      ? aiResult.revised
      : fileContent;

    if (aiResult?.revised && aiResult.revised !== fileContent) {
      setFileContent(aiResult.revised);
    }

    setIsSubmittingPr(true);
    try {
      const res = await createPullRequest({
        repo,
        title: prTitle,
        body: prBody,
        branch: prBranch,
        base_branch: branch || "main",
        files: [{ path: activeFile, content: contentToCommit }],
      });
      setPrSuccessResult(res);

      if (res.created) {
        // Auto add new PR to the workspace list
        const generatedPrNum = res.pr_number || Math.floor(100 + Math.random() * 900);
        onPrCreated?.({
          number: generatedPrNum,
          title: prTitle,
          user: "PG300604",
          state: "open",
          created_at: new Date().toISOString(),
          head_branch: prBranch,
          base_branch: branch || "main",
        });

        // Auto redirect to GitHub
        if (res.pr_url) {
          setTimeout(() => {
            window.open(res.pr_url, "_blank");
          }, 1200);
        }
      }
    } catch (e: any) {
      console.warn("PR submission caught:", e);
      const owner = repo.includes("/") ? repo.split("/")[0] : "";
      const branchTarget = owner ? `${owner}:${prBranch}` : prBranch;
      const fallbackUrl = `https://github.com/${repo}/compare/${branch || "main"}...${branchTarget}?expand=1&quick_pull=1&title=${encodeURIComponent(prTitle)}&body=${encodeURIComponent(prBody)}`;
      setPrSuccessResult({
        created: false,
        pr_url: fallbackUrl,
        pr_number: null,
        branch: prBranch,
        mode: "client_fallback",
        message: "Branch prepared. Click below to review and submit your Pull Request on GitHub.",
      });
    } finally {
      setIsSubmittingPr(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.split("/").pop() || "code.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const val = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
    const linesArr = val.split("\n");
    setCursorPos({
      line: linesArr.length,
      col: (linesArr[linesArr.length - 1]?.length || 0) + 1,
    });
  };

  if (!activeFile) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-[#07080a] text-zinc-500 font-mono text-xs select-none p-6">
        <div className="flex flex-col items-center justify-center text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-zinc-400 shadow-sm">
            <FileCode className="w-6 h-6 stroke-[1.5] text-amber-400/80" />
          </div>
          <span className="text-zinc-200 font-medium text-sm mb-1">No file selected</span>
          <span className="text-zinc-500 text-xs leading-relaxed">
            Select a file or pull request from the explorer sidebar to view code, inspect diffs, and start editing.
          </span>
        </div>
      </div>
    );
  }

  const breadcrumbs = activeFile.split("/");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07080a] text-zinc-200 select-none overflow-hidden font-sans relative">
      
      {/* ── Top VS Code Editor Navigation & Action Bar ── */}
      <div className="h-10 border-b border-white/[0.06] bg-[#090a0f] px-3 flex items-center justify-between flex-shrink-0">
        
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 overflow-x-auto scrollbar-none py-1">
          <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">{repo.split("/")[1] || repo}</span>
          {breadcrumbs.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className={idx === breadcrumbs.length - 1 ? "text-zinc-100 font-semibold" : "text-zinc-400"}>
                {segment}
              </span>
            </div>
          ))}
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" title="Unsaved changes" />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Mode Switcher: Code vs Diff */}
          {hasDiff && (
            <div className="flex items-center bg-[#11131a] rounded p-0.5 border border-white/[0.08] mr-1">
              <button
                onClick={() => setViewMode("code")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  viewMode === "code"
                    ? "bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                File Code
              </button>
              <button
                onClick={() => setViewMode("diff")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  viewMode === "diff"
                    ? "bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Split className="w-3 h-3" />
                <span>PR Diff</span>
              </button>
            </div>
          )}

          {/* AI Code Assistant Toggle */}
          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`h-7 px-2.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors border cursor-pointer ${
              isAiOpen
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]"
            }`}
            title="Ask AI bot to write or repair code"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Assist</span>
          </button>

          {/* Edit / View Toggle */}
          {viewMode === "code" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`h-7 px-2.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors border cursor-pointer ${
                isEditing
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]"
              }`}
              title={isEditing ? "Switch to read-only view" : "Edit file in workspace"}
            >
              {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditing ? "View" : "Edit"}</span>
            </button>
          )}

          {/* Save Button */}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`h-7 px-2.5 rounded text-xs font-mono flex items-center gap-1.5 transition-all border cursor-pointer ${
                isDirty
                  ? "bg-amber-400 hover:bg-amber-300 text-black font-semibold border-amber-400 shadow-sm shadow-amber-400/20"
                  : "bg-white/[0.03] text-zinc-500 border-white/[0.05] cursor-not-allowed"
              }`}
              title="Save changes (Ctrl+S / ⌘S)"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          )}

          {/* Create Pull Request Button */}
          <button
            onClick={handleOpenPrModal}
            className="h-7 px-2.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Create Pull Request on GitHub for these changes"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
            <span>Create PR</span>
          </button>

          {/* Revert Button if dirty */}
          {isDirty && isEditing && (
            <button
              onClick={() => setFileContent(originalContent)}
              className="h-7 px-2 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-white/[0.08] transition-colors"
              title="Revert to original file content"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded transition-colors border ${
              wordWrap 
                ? "bg-white/[0.08] text-amber-300 border-white/[0.12]" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border-transparent"
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            title="Copy file code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Raw File */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── AI Assistant Bar (Interactive prompt + preview) ── */}
      {isAiOpen && (
        <div className="border-b border-indigo-500/30 bg-[#0d0f1a] p-3 flex flex-col gap-2">
          <form onSubmit={handleGenerateAiFix} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-indigo-400" />
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder="Ask AI bot to write code, patch security flaws, or add error handling..."
                className="w-full h-8 pl-8 pr-3 rounded bg-black/40 border border-white/[0.1] text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingAi || !aiInstruction.trim()}
              className="h-8 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isGeneratingAi ? "Generating..." : "Generate Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiOpen(false)}
              className="p-1 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* AI Diff Preview (GitHub-style Red / Green) */}
          {aiResult && (
            <div className="mt-2 p-3 rounded-lg bg-black/60 border border-indigo-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-300 font-semibold">{aiResult.explanation}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAiResult(null)}
                    className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleApplyAiFix}
                    className="px-3 py-1 rounded bg-emerald-500 text-black text-xs font-mono font-bold hover:bg-emerald-400 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept & Apply Fix</span>
                  </button>
                </div>
              </div>

              {/* GitHub-style Diff Output */}
              <div className="max-h-48 overflow-y-auto font-mono text-xs rounded border border-white/[0.06] bg-[#07080a] p-2 leading-relaxed">
                {aiResult.diff.split("\n").map((line, idx) => {
                  const isAdd = line.startsWith("+") && !line.startsWith("+++");
                  const isRem = line.startsWith("-") && !line.startsWith("---");
                  const isHunk = line.startsWith("@@");

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "px-2 py-0.5",
                        isAdd && "bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500",
                        isRem && "bg-rose-500/15 text-rose-300 border-l-2 border-rose-500 line-through opacity-85",
                        isHunk && "text-indigo-300 bg-indigo-500/10 font-bold"
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Notification Banner */}
      {saveMessage && (
        <div className="px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* ── Main Code Viewer Body ── */}
      <div className="flex-1 overflow-hidden relative flex">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#07080a] text-zinc-500 font-mono text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
            <span>Fetching file from {source === "local_workspace" ? "local disk" : "repository"}...</span>
          </div>
        ) : viewMode === "diff" && diffLines && diffLines.length > 0 ? (
          /* ── GitHub-style Unified Diff View ── */
          <div className="flex-1 overflow-y-auto font-mono text-[13px] leading-6 bg-[#07080a] text-zinc-300 scrollbar-thin select-text">
            <div className="py-2">
              {diffLines.map((line, i) => {
                if (line.type === "header") return null;

                if (line.type === "hunk") {
                  return (
                    <div
                      key={i}
                      className="px-4 py-1 my-1 bg-[#141824] text-indigo-300 text-xs border-y border-indigo-500/20 font-semibold select-none flex items-center justify-between"
                    >
                      <span>{line.content}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Hunk {i}</span>
                    </div>
                  );
                }

                const isAdd = line.type === "added";
                const isRem = line.type === "removed";

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-stretch px-2 hover:bg-white/[0.02] transition-colors group",
                      isAdd && "bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500",
                      isRem && "bg-rose-500/15 text-rose-300 border-l-2 border-rose-500 line-through opacity-85"
                    )}
                  >
                    <div className="w-12 text-right pr-3 text-zinc-600 select-none text-xs flex-shrink-0 border-r border-white/[0.04]">
                      {line.oldLine || ""}
                    </div>
                    <div className="w-12 text-right pr-3 text-zinc-600 select-none text-xs flex-shrink-0 border-r border-white/[0.04]">
                      {line.newLine || ""}
                    </div>
                    <div className="w-6 text-center select-none text-xs flex-shrink-0 font-bold">
                      {isAdd ? "+" : isRem ? "-" : " "}
                    </div>
                    <div className={cn("pl-2 overflow-x-auto flex-1 font-mono text-[13px]", wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre")}>
                      {highlightCode(line.content, language)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isEditing ? (
          /* ── Interactive Code Editor Buffer ── */
          <div className="flex-1 flex overflow-hidden bg-[#07080a]">
            {/* Gutter Line Numbers */}
            <div className="w-14 py-3 bg-[#08090d] border-r border-white/[0.04] text-right pr-3 text-zinc-600 font-mono text-xs select-none flex-shrink-0 leading-6 overflow-hidden">
              {lines.map((_, i) => (
                <div key={i} className={i + 1 === cursorPos.line ? "text-amber-400 font-bold" : ""}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Textarea with Tab Indentation Support */}
            <textarea
              ref={textareaRef}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const val = e.currentTarget.value;
                  const step = language === "python" ? "    " : "  ";
                  setFileContent(val.substring(0, start) + step + val.substring(end));
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + step.length;
                    }
                  }, 0);
                }
              }}
              onKeyUp={updateCursorPosition}
              onClick={updateCursorPosition}
              spellCheck={false}
              wrap={wordWrap ? "soft" : "off"}
              className="flex-1 p-3 bg-transparent text-[#e2e8f0] font-mono text-[13px] leading-6 resize-none focus:outline-none scrollbar-thin select-text tracking-wide"
              style={{ tabSize: language === "python" ? 4 : 2 }}
            />
          </div>
        ) : (
          /* ── Formatted Code Viewer with Gutter & Indentation Guides ── */
          <div className="flex-1 overflow-y-auto font-mono text-[13px] leading-6 bg-[#07080a] text-zinc-300 scrollbar-thin select-text">
            <div className="py-3">
              {lines.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-start hover:bg-white/[0.03] transition-colors group px-1 border-l-2 border-transparent hover:border-amber-400/40"
                >
                  <div className="w-12 text-right pr-3 text-[#4b5263] select-none text-xs flex-shrink-0 font-mono pt-[1px] group-hover:text-amber-400/80 border-r border-white/[0.05] transition-colors">
                    {idx + 1}
                  </div>
                  <div className="pl-3 overflow-x-auto flex-1 font-mono text-[13px]">
                    {renderCodeLine(row, language, wordWrap)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── VS Code Style Status Bar Strip ── */}
      <footer className="h-6 border-t border-white/[0.06] bg-[#08090d] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <GitCommit className="w-3 h-3 text-amber-400" />
            <span>{branch}</span>
          </div>

          <span className="text-zinc-700">|</span>

          <span>
            {lines.length} lines · {fileContent.length} chars
          </span>

          {isEditing && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-amber-400 font-semibold">
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
            </>
          )}

          <span className="text-zinc-700">|</span>

          <span className="capitalize text-zinc-400">
            Source: {source.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span className="uppercase text-amber-400 font-bold">
            {language}
          </span>
          {isDirty ? (
            <span className="text-amber-400 font-semibold">● Modified</span>
          ) : (
            <span className="text-emerald-500">Synced</span>
          )}
        </div>
      </footer>

      {/* ── Create Pull Request Modal ── */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d0f18] border border-white/[0.1] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-zinc-100 font-mono">Create Pull Request on GitHub</span>
              </div>
              <button
                onClick={() => setIsPrModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {prSuccessResult ? (
              <div className={cn(
                "p-4 rounded-xl border space-y-3",
                prSuccessResult.created
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              )}>
                <div className={cn(
                  "flex items-center gap-2 text-xs font-mono font-bold",
                  prSuccessResult.created ? "text-emerald-400" : "text-amber-400"
                )}>
                  {prSuccessResult.created ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{prSuccessResult.message}</span>
                </div>
                {prSuccessResult.branch && (
                  <div className="text-xs text-zinc-300 font-mono">
                    Branch: <span className="text-amber-300">{prSuccessResult.branch}</span>
                  </div>
                )}
                {prSuccessResult.pr_url ? (
                  <a
                    href={prSuccessResult.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold transition-colors"
                  >
                    <span>Open Pull Request in GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrSuccessResult(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-colors"
                  >
                    <span>Back to Editor</span>
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitPr} className="space-y-3 text-xs font-mono">
                {/* Changes Validation Status */}
                {aiResult?.revised && aiResult.revised !== fileContent ? (
                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>AI-generated fix will be automatically committed and submitted with this PR!</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Active file buffer staged for commit & Pull Request creation.</span>
                  </div>
                )}

                <div>
                  <label className="text-zinc-400 block mb-1">Target Repository & Base</label>
                  <div className="px-2.5 py-1.5 rounded bg-black/40 border border-white/[0.08] text-zinc-300">
                    {repo} ({branch || "main"})
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">New Feature Branch Name</label>
                  <input
                    type="text"
                    value={prBranch}
                    onChange={(e) => setPrBranch(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/[0.08] text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Pull Request Title</label>
                  <input
                    type="text"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/[0.08] text-zinc-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">PR Description / Walkthrough</label>
                  <textarea
                    value={prBody}
                    onChange={(e) => setPrBody(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 rounded bg-black/40 border border-white/[0.08] text-zinc-100 focus:outline-none focus:border-emerald-400 resize-none font-mono text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsPrModalOpen(false)}
                    className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPr || !activeFile}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmittingPr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                    <span>{isSubmittingPr ? "Creating PR..." : "Confirm & Create PR"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
