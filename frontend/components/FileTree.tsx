"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  FileText, 
  Folder, 
  FolderOpen,
  GitPullRequest, 
  Shield, 
  AlertTriangle, 
  History, 
  FolderGit2, 
  RefreshCw, 
  GitCommit, 
  Tag, 
  CircleDot,
  Sparkles,
  Plus,
  Loader2
} from "lucide-react";
import type { PullRequestItem, IssueItem } from "@/lib/api";

interface FileTreeProps {
  repoName?: string;
  branch?: string;
  repoFiles?: string[];
  pullRequests?: PullRequestItem[];
  issues?: IssueItem[];
  onSelectPR?: (pr: PullRequestItem) => void;
  onAddPR?: (pr: PullRequestItem) => void;
  onSwitchWorkspace?: () => void;
  onTriggerFullScan?: () => void;
  onCreateNewFile?: (path: string) => void;
  onCreatePR?: () => void;
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
  onToggleReviewPanel: () => void;
  panelOpen: boolean;
  onRefreshPRs?: () => void;
  isRefreshingPRs?: boolean;
}

export function FileTree({
  repoName = "RepoMind Workspace",
  branch = "main",
  repoFiles = [],
  pullRequests = [],
  issues = [],
  onSelectPR,
  onAddPR,
  onSwitchWorkspace,
  onTriggerFullScan,
  onCreateNewFile,
  onCreatePR,
  changedFiles,
  impactedFiles,
  activeFile,
  onFileClick,
  history,
  onHistoryClick,
  onToggleReviewPanel,
  panelOpen,
  onRefreshPRs,
  isRefreshingPRs = false,
}: FileTreeProps) {
  const [search, setSearch] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  // Add PR inline state
  const [isAddingPR, setIsAddingPR] = useState(false);
  const [newPrNum, setNewPrNum] = useState<number>(45);
  const [newPrTitle, setNewPrTitle] = useState("");
  const [newPrBranch, setNewPrBranch] = useState("fix/feature-branch");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "prs": true,
    "issues": false,
    "files": true,
    "changed": true,
    "blast": true,
    "history": false,
  });

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    "backend": true,
    "frontend": true,
    "components": true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const toggleFolder = (folder: string) => {
    setOpenFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFilePath.trim();
    if (!trimmed) {
      setIsCreatingFile(false);
      return;
    }
    onCreateNewFile?.(trimmed);
    setNewFilePath("");
    setIsCreatingFile(false);
  };

  // Group files dynamically into top-level directories
  const fileGroups = useMemo(() => {
    const list = repoFiles.length > 0 ? repoFiles : [
      "backend/main.py",
      "backend/database.py",
      "backend/diff_parser.py",
      "backend/dependency_finder.py",
      "backend/llm_client.py",
      "backend/github_app.py",
      "backend/oauth.py",
      "backend/webhook.py",
      "backend/models.py",
      "frontend/app/page.tsx",
      "frontend/app/dashboard/page.tsx",
      "frontend/components/FileTree.tsx",
      "frontend/components/DiffViewer.tsx",
      "frontend/components/ReviewPanel.tsx",
      "requirements.txt",
      "README.md",
    ];

    const groups: Record<string, string[]> = {};
    const rootFiles: string[] = [];

    list.forEach((filePath) => {
      const parts = filePath.split("/");
      if (parts.length > 1) {
        const topDir = parts[0];
        if (!groups[topDir]) groups[topDir] = [];
        groups[topDir].push(filePath);
      } else {
        rootFiles.push(filePath);
      }
    });

    return { groups, rootFiles };
  }, [repoFiles]);

  const hasAnalysis = changedFiles.length > 0;

  return (
    <aside className="flex flex-col h-full bg-[#090a0f] select-none text-zinc-300 font-sans border-r border-white/[0.06]">
      
      {/* ── Active Repository Header with Switch Action ── */}
      <div className="p-3 border-b border-white/[0.06] bg-[#07080a] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderGit2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-mono font-bold text-zinc-200 truncate" title={repoName}>
              {repoName.split("/").pop() || repoName}
            </span>
          </div>

          {onSwitchWorkspace && (
            <button
              onClick={onSwitchWorkspace}
              className="text-[10px] font-mono text-zinc-400 hover:text-amber-300 hover:bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1"
              title="Switch repository session"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Switch</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1 truncate max-w-[170px]" title={repoName}>
            <GitCommit className="w-3 h-3 text-zinc-600 flex-shrink-0" />
            <span className="truncate">{branch}</span>
          </span>
          <span className="text-zinc-600">{repoFiles.length || 20} files</span>
        </div>

        {/* Action Bar: Full Repo Scan, New File, New PR */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={onTriggerFullScan}
            className="h-6 px-2 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-semibold flex items-center justify-center gap-1 border border-indigo-500/25 transition-colors cursor-pointer"
            title="Scan entire repository for security, UI and bug vulnerabilities"
          >
            <Shield className="w-3 h-3 text-indigo-400" />
            <span>Full Scan</span>
          </button>

          <button
            onClick={onCreatePR}
            className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold flex items-center justify-center gap-1 border border-emerald-500/25 transition-colors cursor-pointer"
            title="Create a new Pull Request on GitHub"
          >
            <GitPullRequest className="w-3 h-3 text-emerald-400" />
            <span>Create PR</span>
          </button>
        </div>

        {/* Quick File Search */}
        <div className="relative flex items-center pt-1">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 pl-8 pr-3 rounded bg-[#0c0d12] border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400/60 transition-colors"
          />
        </div>
      </div>

      {/* ── Tree Scrollable Canvas ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2 text-xs space-y-3 scrollbar-thin">
        
        {/* ── 1. Pull Requests Drawer ── */}
        <div className="border-b border-white/[0.04] pb-2">
          <div className="flex items-center justify-between px-2 py-1 text-zinc-400 font-mono text-[11px] font-bold uppercase tracking-wider">
            <div
              onClick={() => toggleSection("prs")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 flex-1"
            >
              {openSections["prs"] ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
              <span>Pull Requests ({pullRequests.length})</span>
            </div>

            {/* Actions: Sync & Add */}
            <div className="flex items-center gap-1">
              {onRefreshPRs && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefreshPRs();
                  }}
                  className="p-1 rounded text-zinc-500 hover:text-amber-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Sync real PRs from GitHub"
                >
                  <RefreshCw className={cn("w-3 h-3", isRefreshingPRs && "animate-spin text-amber-400")} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsAddingPR((prev) => !prev);
                  setOpenSections((prev) => ({ ...prev, prs: true }));
                }}
                className="p-1 rounded text-zinc-500 hover:text-amber-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Add Pull Request to list"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {openSections["prs"] && (
            <div className="pl-1 mt-1 space-y-2">
              {/* Inline PR Creator Form */}
              {isAddingPR && (
                <div className="p-2.5 rounded-lg bg-[#10131e] border border-amber-400/40 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold uppercase">
                    <span>Add / Track Pull Request</span>
                    <button
                      onClick={() => setIsAddingPR(false)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newPrTitle.trim()) return;
                      onAddPR?.({
                        number: newPrNum || Math.floor(10 + Math.random() * 90),
                        title: newPrTitle.trim(),
                        user: "PG300604",
                        state: "open",
                        created_at: new Date().toISOString(),
                        head_branch: newPrBranch || "feature/update",
                        base_branch: "main",
                      });
                      setNewPrTitle("");
                      setNewPrNum((prev) => prev + 1);
                      setIsAddingPR(false);
                    }}
                    className="space-y-1.5 pt-1"
                  >
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="PR #"
                        value={newPrNum}
                        onChange={(e) => setNewPrNum(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 rounded bg-[#07080a] border border-white/[0.1] text-xs text-zinc-100 outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        placeholder="PR Title..."
                        value={newPrTitle}
                        onChange={(e) => setNewPrTitle(e.target.value)}
                        required
                        className="flex-1 px-2 py-1 rounded bg-[#07080a] border border-white/[0.1] text-xs text-zinc-100 outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Branch name (e.g. fix/ui)"
                        value={newPrBranch}
                        onChange={(e) => setNewPrBranch(e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-[#07080a] border border-white/[0.1] text-xs text-zinc-100 outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black font-semibold text-[11px] cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {pullRequests.length === 0 ? (
                <div className="text-[11px] font-mono text-zinc-500 py-2 px-2 flex flex-col gap-1 items-start">
                  <span>No pull requests found.</span>
                  {onRefreshPRs && (
                    <button
                      type="button"
                      onClick={onRefreshPRs}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Sync real PRs from GitHub</span>
                    </button>
                  )}
                </div>
              ) : (
                pullRequests.map((pr) => (
                  <div
                    key={pr.number}
                    className="p-2.5 rounded-lg bg-[#0c0d14] hover:bg-[#12141f] border border-white/[0.06] hover:border-amber-400/40 transition-colors flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-300">
                          #{pr.number}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold",
                          pr.state === "open"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        )}>
                          {pr.state || "open"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 truncate">
                        @{pr.user}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-200 font-medium line-clamp-2 leading-snug">
                      {pr.title}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[120px]" title={pr.head_branch}>
                        {pr.head_branch || "main"}
                      </span>

                      {/* Specialized in-context Analyze PR button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPR?.(pr);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        title={`Analyze Pull Request #${pr.number}`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Analyze PR</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── 2. Open Issues Drawer ── */}
        {issues.length > 0 && (
          <div className="border-b border-white/[0.04] pb-2">
            <div
              onClick={() => toggleSection("issues")}
              className="flex items-center justify-between px-2 py-1 text-zinc-400 hover:text-zinc-200 cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              <div className="flex items-center gap-1.5">
                {openSections["issues"] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
                <span>Issues ({issues.length})</span>
              </div>
            </div>

            {openSections["issues"] && (
              <div className="pl-3 mt-1 space-y-1">
                {issues.map((iss) => (
                  <div
                    key={iss.number}
                    className="p-1.5 rounded bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-indigo-400/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-indigo-400 font-bold">#{iss.number}</span>
                      <span className="text-zinc-500 text-[10px]">@{iss.user}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                      {iss.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 3. Active Analyzed PR Diffs & Blast Radius ── */}
        {hasAnalysis && (
          <div className="border-b border-white/[0.04] pb-2">
            {/* Changed Files */}
            <div>
              <div
                onClick={() => toggleSection("changed")}
                className="flex items-center justify-between px-2 py-1 text-amber-400 hover:text-amber-300 cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  {openSections["changed"] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>PR Changed Files ({changedFiles.length})</span>
                </div>
              </div>

              {openSections["changed"] && (
                <div className="pl-3 mt-1 space-y-0.5">
                  {changedFiles.map((file) => {
                    const name = file.split("/").pop() || file;
                    const active = activeFile === file;
                    return (
                      <div
                        key={file}
                        onClick={() => onFileClick(file)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded cursor-pointer font-mono text-xs transition-colors",
                          active
                            ? "bg-amber-500/15 text-amber-300 font-semibold"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                        )}
                        title={file}
                      >
                        <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate flex-1">{name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Downstream Blast Radius Files */}
            {impactedFiles.length > 0 && (
              <div className="mt-2">
                <div
                  onClick={() => toggleSection("blast")}
                  className="flex items-center justify-between px-2 py-1 text-rose-400 hover:text-rose-300 cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    {openSections["blast"] ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span>Blast Radius ({impactedFiles.length})</span>
                  </div>
                </div>

                {openSections["blast"] && (
                  <div className="pl-3 mt-1 space-y-0.5">
                    {impactedFiles.map((file) => {
                      const name = file.split("/").pop() || file;
                      const active = activeFile === file;
                      return (
                        <div
                          key={file}
                          onClick={() => onFileClick(file)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded cursor-pointer font-mono text-xs transition-colors",
                            active
                              ? "bg-rose-500/15 text-rose-300 font-semibold"
                              : "text-zinc-400 hover:text-rose-200 hover:bg-rose-500/5"
                          )}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate flex-1">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 4. Full Workspace Repository Files ── */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-zinc-400 font-mono text-[11px] font-bold uppercase tracking-wider">
            <div 
              onClick={() => toggleSection("files")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 flex-1"
            >
              {openSections["files"] ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>Workspace Files</span>
            </div>

            {/* + New File Trigger */}
            <button
              onClick={() => setIsCreatingFile(true)}
              className="p-1 rounded text-zinc-500 hover:text-amber-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Create new file in workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New File Inline Creator Form */}
          {isCreatingFile && (
            <form onSubmit={handleCreateFileSubmit} className="p-1.5 mb-1 bg-[#10131e] rounded border border-amber-400/40">
              <input
                type="text"
                autoFocus
                placeholder="e.g. backend/security.py"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsCreatingFile(false);
                }}
                className="w-full px-2 py-1 bg-black/40 border border-white/[0.1] rounded text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-mono font-bold hover:bg-amber-300"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {openSections["files"] && (
            <div className="space-y-1 mt-1 pl-1">
              {/* Directory Groups */}
              {Object.entries(fileGroups.groups).map(([folder, files]) => {
                const isFolderOpen = openFolders[folder] ?? true;
                const matchedFiles = search
                  ? files.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
                  : files;

                if (search && matchedFiles.length === 0) return null;

                return (
                  <div key={folder} className="space-y-0.5">
                    <div
                      onClick={() => toggleFolder(folder)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] cursor-pointer font-mono text-xs transition-colors"
                    >
                      {isFolderOpen ? (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="font-semibold text-zinc-300">{folder}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto font-mono">{matchedFiles.length}</span>
                    </div>

                    {isFolderOpen && (
                      <div className="pl-4 space-y-0.5 border-l border-white/[0.04] ml-3">
                        {matchedFiles.map((file) => {
                          const active = activeFile === file;
                          const fileName = file.split("/").pop() || file;
                          return (
                            <div
                              key={file}
                              onClick={() => onFileClick(file)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded cursor-pointer font-mono text-xs transition-colors group",
                                active
                                  ? "bg-amber-500/15 text-amber-300 font-semibold"
                                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                              )}
                              title={file}
                            >
                              <FileCode className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-amber-400" : "text-zinc-500")} />
                              <span className="truncate flex-1">{fileName}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Root Files */}
              {fileGroups.rootFiles
                .filter((f) => !search || f.toLowerCase().includes(search.toLowerCase()))
                .map((file) => {
                  const active = activeFile === file;
                  return (
                    <div
                      key={file}
                      onClick={() => onFileClick(file)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded cursor-pointer font-mono text-xs transition-colors",
                        active
                          ? "bg-amber-500/15 text-amber-300 font-semibold"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                      )}
                      title={file}
                    >
                      <FileText className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-amber-400" : "text-zinc-500")} />
                      <span className="truncate flex-1">{file}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

    </aside>
  );
}
