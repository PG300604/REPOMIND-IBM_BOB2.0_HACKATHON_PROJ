"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Shell } from "@/components/Shell";
import { FileTree } from "@/components/FileTree";
import { DiffViewer } from "@/components/DiffViewer";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBar } from "@/components/StatusBar";
import { AnalyzeModal } from "@/components/AnalyzeModal";
import { WorkspaceLauncher } from "@/components/WorkspaceLauncher";

// Dedicated Views
import { ArchitectureGraphView } from "@/components/views/ArchitectureGraphView";
import { GitBlastView } from "@/components/views/GitBlastView";
import { DatabaseView } from "@/components/views/DatabaseView";
import { CatalogView } from "@/components/views/CatalogView";
import { WebhookSyncView } from "@/components/views/WebhookSyncView";
import { ToolsConfigView } from "@/components/views/ToolsConfigView";

import {
  getMe,
  logout,
  listAnalyses,
  getAnalysis,
  getRepoWorkspace,
  getRepoPullRequests,
  analyzePR,
  generateRepoManual,
  type AnalyzeResponse,
  type AnalysisRecord,
  type AuthUser,
  type RepoWorkspaceData,
  type PullRequestItem,
  type RepoAuditFinding,
} from "@/lib/api";

import Link from "next/link";
import { 
  FileCode, 
  BookOpen, 
  Database, 
  GitBranch, 
  Network, 
  Cloud, 
  Wrench, 
  X, 
  Plus,
  ChevronRight,
  Search,
  PanelLeft,
  PanelRight,
  ArrowUpRight,
  FolderGit2
} from "lucide-react";

function getInitialOpenTabs(files: string[]): { tabs: string[]; active: string | null } {
  if (!files || files.length === 0) return { tabs: [], active: null };
  const meaningful = files.filter((f) => {
    const parts = f.split("/");
    const name = parts[parts.length - 1];
    if (name.startsWith(".")) return false;
    if (parts.some((p) => p.startsWith("."))) return false;
    if (name.includes(".env")) return false;
    if (name.endsWith(".lock") || name.endsWith("-lock.json")) return false;
    if (name.includes(".git")) return false;
    return true;
  });

  const entry =
    meaningful.find(
      (f) =>
        f.endsWith("main.py") ||
        f.endsWith("app.py") ||
        f.endsWith("index.ts") ||
        f.endsWith("index.tsx") ||
        f.endsWith("page.tsx") ||
        f.endsWith("index.js") ||
        f.endsWith("README.md")
    ) || meaningful[0];

  if (entry) {
    return { tabs: [entry], active: entry };
  }
  return { tabs: [], active: null };
}

export default function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [analysis, setAnalysis]         = useState<AnalyzeResponse | null>(null);
  const [rawDiff, setRawDiff]           = useState("");
  const [prLabel, setPrLabel]           = useState("");
  
  // Navigation View State
  const [activeRail, setActiveRail]     = useState<"code" | "catalog" | "db" | "git" | "flow" | "cloud" | "tools">("code");
  
  // Tabs matching open files (starts empty or with clean entrypoint, never dotfiles)
  const [tabs, setTabs]                 = useState<string[]>([]);
  const [activeTab, setActiveTab]       = useState<string | null>(null);
  const [viewMode, setViewMode]         = useState<"desktop" | "mobile">("desktop");
  const [user, setUser]                 = useState<AuthUser | null>(null);
  const [history, setHistory]           = useState<AnalysisRecord[]>([]);

  // AI Assist & PR Creation Workflow State
  const [initialAiInstruction, setInitialAiInstruction] = useState<string | null>(null);
  const [openPrModalTrigger, setOpenPrModalTrigger]     = useState<number>(0);
  const [initialPrData, setInitialPrData]               = useState<{ title?: string; body?: string; branch?: string } | null>(null);
  const [panelDefaultTab, setPanelDefaultTab]           = useState<"pr" | "audit">("pr");

  // ── Workspace & Repo Session State ─────────────────────────────────────
  const [workspace, setWorkspace]             = useState<RepoWorkspaceData | null>(null);
  const [launcherLoading, setLauncherLoading] = useState(false);
  const [launcherStep, setLauncherStep]       = useState("");

  // Active Pull Requests state (Synced with GitHub)
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [isRefreshingPRs, setIsRefreshingPRs] = useState<boolean>(false);

  const handleAddPR = useCallback((pr: PullRequestItem) => {
    setPullRequests((prev) => [pr, ...prev.filter((p) => p.number !== pr.number)]);
  }, []);

  const refreshPullRequests = useCallback(async (repoName?: string) => {
    const targetRepo = repoName || workspace?.repo || "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ";
    setIsRefreshingPRs(true);
    try {
      const prs = await getRepoPullRequests(targetRepo, "all");
      setPullRequests(prs);
    } catch (e) {
      console.warn("Could not sync pull requests:", e);
    } finally {
      setIsRefreshingPRs(false);
    }
  }, [workspace?.repo]);

  // ── Handle analysis result ─────────────────────────────────────────────
  const handleResult = useCallback(
    (result: AnalyzeResponse, label: string, diff: string) => {
      setAnalysis(result);
      setRawDiff(result.raw_diff || diff);
      setPrLabel(label);
      if (result.changed_files && result.changed_files.length > 0) {
        setTabs((prev) => Array.from(new Set([...prev, ...result.changed_files])));
        setActiveTab(result.changed_files[0] ?? null);
      }
      setActiveRail("code");
      setPanelDefaultTab("pr");
      if (!panelOpen) setPanelOpen(true);
      listAnalyses(20).then(setHistory).catch(() => {});
    },
    [panelOpen]
  );

  // ── Load workspace repository ─────────────────────────────────────────
  const loadWorkspace = useCallback(async (repo: string, branch = "main", prNumber?: number) => {
    setLauncherLoading(true);
    setLauncherStep("Fetching repository tree and files...");
    // Clear previous repo data
    setAnalysis(null);
    setRawDiff("");
    setPrLabel("");

    try {
      const data = await getRepoWorkspace(repo, branch);
      setLauncherStep("Syncing pull requests and open issues...");
      setWorkspace(data);
      sessionStorage.removeItem("repomind_switching_workspace");
      sessionStorage.setItem("repomind_active_workspace", JSON.stringify(data));
      setPullRequests(data.pull_requests || []);

      const { tabs: initialTabs, active: initialActive } = getInitialOpenTabs(data.files || []);
      setTabs(initialTabs);
      setActiveTab(initialActive);

      // Warm up architecture manual in the background
      generateRepoManual(data.repo, data.branch || branch, false).catch(() => {});

      if (prNumber) {
        setLauncherStep(`Analyzing Pull Request #${prNumber}...`);
        try {
          const result = await analyzePR({ repo: data.repo, pr_number: prNumber });
          handleResult(result, `${data.repo}#${prNumber}`, result.raw_diff || "");
        } catch (e) {
          console.warn("Auto PR analysis notice:", e);
        }
      } else if (data.pull_requests && data.pull_requests.length > 0) {
        const firstPr = data.pull_requests[0];
        setLauncherStep(`Analyzing active Pull Request #${firstPr.number}: ${firstPr.title}...`);
        try {
          const result = await analyzePR({ repo: data.repo, pr_number: firstPr.number });
          handleResult(result, `${data.repo}#${firstPr.number}`, result.raw_diff || "");
        } catch (e) {
          console.warn("Auto first PR analysis notice:", e);
        }
      }
    } catch (err: any) {
      console.error("Workspace loading failed:", err);
      throw err;
    } finally {
      setLauncherLoading(false);
      setLauncherStep("");
    }
  }, [handleResult]);

  // ── Select Pull Request from Sidebar ─────────────────────────────────
  const handleSelectPR = useCallback(async (pr: PullRequestItem) => {
    if (!workspace) return;
    try {
      setPrLabel(`${workspace.repo}#${pr.number}`);
      const result = await analyzePR({ repo: workspace.repo, pr_number: pr.number });
      handleResult(result, `${workspace.repo}#${pr.number}`, result.raw_diff || "");
    } catch {
      setModalOpen(true);
    }
  }, [workspace, handleResult]);

  // ── Full Repo Scan Trigger ──
  const handleTriggerFullScan = useCallback(() => {
    setPanelDefaultTab("audit");
    setPanelOpen(true);
  }, []);

  // ── Create New File in Workspace ──
  const handleCreateNewFile = useCallback((path: string) => {
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
    setActiveRail("code");
  }, []);

  // ── Create Pull Request Action ──
  const handleCreatePR = useCallback(() => {
    setActiveRail("code");
    setInitialPrData(null);
    setOpenPrModalTrigger((prev) => prev + 1);
  }, []);

  // ── Apply Fix from Review Panel Finding ──
  const handleApplyFix = useCallback((finding: RepoAuditFinding) => {
    if (finding.file) {
      setTabs((prev) => (prev.includes(finding.file) ? prev : [...prev, finding.file]));
      setActiveTab(finding.file);
    }
    const instruction = `Fix ${finding.title}: ${finding.description}${
      finding.suggested_patch ? `\n\nSuggested patch:\n${finding.suggested_patch}` : ""
    }`;
    setInitialAiInstruction(instruction);
    setActiveRail("code");
  }, []);

  // ── Create PR for Review Panel Finding ──
  const handleCreatePrForFinding = useCallback((finding: RepoAuditFinding) => {
    if (finding.file) {
      setTabs((prev) => (prev.includes(finding.file) ? prev : [...prev, finding.file]));
      setActiveTab(finding.file);
    }
    setActiveRail("code");
    setInitialPrData({
      title: `fix: ${finding.title}`,
      branch: `fix/${finding.category}-${finding.id.toLowerCase()}`,
      body: `Automated fix for quality finding in \`${finding.file}\`.\n\n### Issue\n${finding.description}\n\n**Category:** ${finding.category}\n**Severity:** ${finding.severity}${
        finding.suggested_patch ? `\n\n### Suggested Patch\n\`\`\`\n${finding.suggested_patch}\n\`\`\`` : ""
      }`,
    });
    setOpenPrModalTrigger((prev) => prev + 1);
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────
  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;

    getMe().then(setUser).catch(() => {});
    listAnalyses(20).then(setHistory).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const repoParam = params.get("repo");
    const prParam = params.get("pr");

    if (repoParam) {
      loadWorkspace(repoParam, params.get("branch") || "main", prParam ? parseInt(prParam) : undefined);
    } else {
      const isSwitching = sessionStorage.getItem("repomind_switching_workspace") === "true";
      const stored = sessionStorage.getItem("repomind_active_workspace");
      if (stored && !isSwitching) {
        try {
          const parsed = JSON.parse(stored);
          setWorkspace(parsed);
          if (parsed.pull_requests?.length > 0) {
            setPullRequests(parsed.pull_requests);
          }
          refreshPullRequests(parsed.repo);
          const { tabs: restoredTabs, active: restoredActive } = getInitialOpenTabs(parsed.files || []);
          setTabs(restoredTabs);
          setActiveTab(restoredActive);
        } catch {}
      } else if (!isSwitching) {
        loadWorkspace("PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ", "main");
      }
    }

    if (params.get("connected") === "1") {
      window.history.replaceState({}, "", "/dashboard");
      const lastPr = localStorage.getItem("pr_radar_last_pr_url");
      if (lastPr) {
        setModalOpen(true);
      }
    }
  }, [loadWorkspace, refreshPullRequests]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if (inInput) return;
      if (e.key === "n" || e.key === "N") setModalOpen(true);
      if (e.key === "b" || e.key === "B") setPanelOpen((p) => !p);
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setModalOpen(true);
      }
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Load cached analysis from history ─────────────────────────────────
  async function handleHistoryClick(repo: string, prNumber: number) {
    const cached = await getAnalysis(repo, prNumber);
    if (!cached) return;
    const { raw_diff, created_at, id, ...rest } = cached;
    setAnalysis(rest as AnalyzeResponse);
    setRawDiff(raw_diff || "");
    setPrLabel(`${repo}#${prNumber}`);
    setTabs(rest.changed_files);
    setActiveTab(rest.changed_files[0] ?? null);
    setActiveRail("code");
    if (!panelOpen) setPanelOpen(true);
  }

  // ── Logout ────────────────────────────────────────────────────────────
  async function handleLogout() {
    await logout();
    setUser(null);
    window.location.href = "/dashboard";
  }

  // ── Left Rail Dock ───────────────────────────────────────────────────
  const rail = (
    <div
      className="flex flex-col items-center pt-2 pb-2 gap-1.5 bg-[#07080a] h-full select-none"
      onDoubleClick={() => setSidebarOpen((s) => !s)}
    >
      {/* Top Minimalist Logo: White font matching landing page REPOMIND */}
      <Link 
        href="/"
        className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] hover:border-white/30 flex items-center justify-center mb-1 group cursor-pointer transition-all shadow-sm"
        title="Return to RepoMind Landing Page"
      >
        <span className="font-mono font-bold text-xs tracking-[0.1em] text-zinc-100 group-hover:text-white transition-colors">
          RM
        </span>
      </Link>

      {/* Primary Rail Navigation (Topmost: Work tools) */}
      <RailBtn 
        title="VS Code Workspace Explorer & Diff" 
        active={activeRail === "code"} 
        onClick={() => { setActiveRail("code"); setSidebarOpen(true); }}
      >
        <FileCode className="w-4 h-4" />
      </RailBtn>

      <RailBtn 
        title="Git Branches & Blast Radius Graph" 
        active={activeRail === "git"} 
        onClick={() => { setActiveRail("git"); }}
      >
        <GitBranch className="w-4 h-4" />
      </RailBtn>

      <RailBtn 
        title="Architecture Node Diagram" 
        active={activeRail === "flow"} 
        onClick={() => { setActiveRail("flow"); }}
      >
        <Network className="w-4 h-4" />
      </RailBtn>

      <RailBtn 
        title="AI Documentation & Catalog" 
        active={activeRail === "catalog"} 
        onClick={() => { setActiveRail("catalog"); }}
      >
        <BookOpen className="w-4 h-4" />
      </RailBtn>

      <RailBtn 
        title="GitHub Webhook Synchronizer" 
        active={activeRail === "cloud"} 
        onClick={() => { setActiveRail("cloud"); }}
      >
        <Cloud className="w-4 h-4" />
      </RailBtn>

      <div className="flex-1" />

      {/* Second to last: SQLite Telemetry & System Logic Analyzer */}
      <RailBtn 
        title="SQLite Telemetry & System Logic" 
        active={activeRail === "db"} 
        onClick={() => { setActiveRail("db"); }}
      >
        <Database className="w-4 h-4" />
      </RailBtn>

      {/* Last position: Tools, Model Config & Studio Guide */}
      <RailBtn 
        title="Tools, Model Config & Studio Guide" 
        active={activeRail === "tools"} 
        onClick={() => { setActiveRail("tools"); }}
      >
        <Wrench className="w-4 h-4" />
      </RailBtn>
    </div>
  );

  // ── Left Sidebar Zone ────────────────────────────────────────────────
  const sidebar = (
    <FileTree
      repoName={workspace?.repo || "RepoMind Workspace"}
      branch={workspace?.branch || "main"}
      repoFiles={workspace?.files || []}
      pullRequests={pullRequests}
      issues={workspace?.issues || []}
      onSelectPR={handleSelectPR}
      onAddPR={handleAddPR}
      onSwitchWorkspace={() => {
        sessionStorage.setItem("repomind_switching_workspace", "true");
        sessionStorage.removeItem("repomind_active_workspace");
        setWorkspace(null);
        setTabs([]);
        setActiveTab(null);
        setAnalysis(null);
        setRawDiff("");
      }}
      onTriggerFullScan={handleTriggerFullScan}
      onCreateNewFile={handleCreateNewFile}
      onCreatePR={handleCreatePR}
      changedFiles={analysis?.changed_files ?? []}
      impactedFiles={analysis?.impacted_files ?? []}
      activeFile={activeTab}
      onFileClick={(file) => {
        if (!tabs.includes(file)) {
          setTabs([...tabs, file]);
        }
        setActiveTab(file);
        setActiveRail("code");
      }}
      history={history}
      onHistoryClick={handleHistoryClick}
      onToggleReviewPanel={() => setPanelOpen((p) => !p)}
      panelOpen={panelOpen}
      onRefreshPRs={refreshPullRequests}
      isRefreshingPRs={isRefreshingPRs}
    />
  );

  // ── VS Code-Style Top Bar (No Emojis, No Slop, Clean Breadcrumb) ──────
  const breadcrumb = activeTab
    ? activeTab.split("/")
    : ["RepoMind", "Workspace"];

  const titlebar = (
    <div className="flex items-center justify-between bg-[#090a0f] h-full select-none font-sans px-2 overflow-x-auto scrollbar-none">
      
      {/* Left: VS Code Tabs or View Title */}
      <div className="flex items-center h-full flex-shrink-0">
        
        {/* Editor File Tabs */}
        {activeRail === "code" && (
          <div className="flex items-center h-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              const displayName = tab.split("/").pop() || tab;
              return (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-3.5 h-full cursor-pointer text-xs font-mono transition-colors border-r ${
                    isActive
                      ? "bg-[#0c0d12] text-zinc-100 font-semibold border-t-2 border-t-amber-400 border-r-white/[0.06] border-l border-l-white/[0.06]"
                      : "bg-[#07080a]/50 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border-r-white/[0.04]"
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
                  <span className="truncate max-w-[140px]">{displayName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = tabs.filter((t) => t !== tab);
                      setTabs(next);
                      if (activeTab === tab) {
                        setActiveTab(next[next.length - 1] ?? null);
                      }
                    }}
                    className="w-3.5 h-3.5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => {
                const newName = `scratch_${tabs.length + 1}.py`;
                setTabs([...tabs, newName]);
                setActiveTab(newName);
              }}
              className="h-full px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
              title="Add new editor tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Title if other rail tab is active */}
        {activeRail !== "code" && (
          <div className="flex items-center gap-2 px-3 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            {activeRail === "catalog" && "AI Documentation & Schema Catalog"}
            {activeRail === "db" && "SQLite Telemetry & Performance"}
            {activeRail === "git" && "Git Blast Radius & Staging Consequence"}
            {activeRail === "flow" && "Architecture Node Graph"}
            {activeRail === "cloud" && "GitHub Webhook Synchronizer"}
            {activeRail === "tools" && "Tools, Models & Configuration"}
          </div>
        )}
      </div>

      {/* Center: Repository & Active Branch Indicator (No separate floating Analyze button) */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-[#07080a] border border-white/[0.06] text-xs font-mono text-zinc-400 max-w-sm w-full mx-4 select-none">
        <FolderGit2 className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
        <span className="truncate text-zinc-300 font-medium">{workspace?.repo || "Workspace"}</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-500 truncate text-[11px]">{workspace?.branch || "main"}</span>
        {prLabel && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="text-amber-400 font-semibold truncate text-[11px]">{prLabel}</span>
          </>
        )}
      </div>

      {/* Right: Layout toggles & Auth status */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {/* Toggle Explorer Sidebar */}
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className={`p-1.5 rounded transition-colors ${
            sidebarOpen ? "text-amber-400 bg-white/[0.06]" : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle Explorer Sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Review Panel */}
        <button
          onClick={() => setPanelOpen((p) => !p)}
          className={`p-1.5 rounded transition-colors ${
            panelOpen ? "text-amber-400 bg-white/[0.06]" : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Toggle AI Risk Panel (B)"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-zinc-700 h-4 border-r border-white/[0.08]" />

        {/* GitHub Connection Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#07080a] border border-white/[0.08] text-xs text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-mono">
            {user ? `@${user.login}` : "Connected"}
          </span>
          <button
            onClick={() => {
              if (user) handleLogout();
              else setModalOpen(true);
            }}
            className="text-zinc-500 hover:text-zinc-300 ml-1"
            title={user ? "Logout" : "Connect"}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render Active Central View ──
  const mainContent = (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
      {activeRail === "code" && (
        <DiffViewer
          rawDiff={rawDiff}
          activeFile={activeTab}
          repo={workspace?.repo}
          branch={workspace?.branch}
          initialAiInstruction={initialAiInstruction}
          openPrModalTrigger={openPrModalTrigger}
          initialPrData={initialPrData}
          onPrCreated={handleAddPR}
        />
      )}
      {activeRail === "catalog" && <CatalogView repo={workspace?.repo} branch={workspace?.branch} />}
      {activeRail === "db" && <DatabaseView activeRepo={workspace?.repo} />}
      {activeRail === "git" && (
        <GitBlastView
          analysis={analysis}
          prLabel={prLabel}
          repo={workspace?.repo}
          branches={workspace?.branches}
          files={workspace?.files || []}
          onOpenFile={(path) => {
            if (path) {
              setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
              setActiveTab(path);
              setActiveRail("code");
            }
          }}
        />
      )}
      {activeRail === "flow" && (
        <ArchitectureGraphView 
          repo={workspace?.repo}
          branch={workspace?.branch}
          files={workspace?.files || []}
        />
      )}
      {activeRail === "cloud" && <WebhookSyncView repo={workspace?.repo} />}
      {activeRail === "tools" && <ToolsConfigView />}
    </div>
  );

  if (!workspace) {
    return (
      <WorkspaceLauncher
        onSelectWorkspace={loadWorkspace}
        loading={launcherLoading}
        loadingStep={launcherStep}
      />
    );
  }

  return (
    <>
      <Shell
        rail={rail}
        sidebar={sidebar}
        titlebar={titlebar}
        main={mainContent}
        panel={
          <ReviewPanel
            analysis={analysis}
            onClose={() => setPanelOpen(false)}
            repo={workspace?.repo}
            branch={workspace?.branch}
            defaultTab={panelDefaultTab}
            onApplyFix={handleApplyFix}
            onCreatePrForFinding={handleCreatePrForFinding}
          />
        }
        statusbar={
          <StatusBar
            analysis={analysis}
            prLabel={prLabel}
            user={user}
            onLogout={handleLogout}
          />
        }
        panelOpen={panelOpen}
        sidebarOpen={sidebarOpen}
      />

      <AnalyzeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onResult={handleResult}
      />
    </>
  );
}

// ── Rail button helper ─────────────────────────────────────────────────────
function RailBtn({
  children,
  title,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`relative w-full h-10 flex items-center justify-center cursor-pointer border-none transition-all duration-150 ${
        active
          ? "text-amber-400 bg-white/[0.06]"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-amber-400 rounded-r" />
      )}
      {children}
    </button>
  );
}
