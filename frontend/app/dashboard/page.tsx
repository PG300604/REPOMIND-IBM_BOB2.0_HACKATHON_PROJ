"use client";

import { useEffect, useCallback, useState } from "react";
import { Shell } from "@/components/Shell";
import { FileTree } from "@/components/FileTree";
import { DiffViewer } from "@/components/DiffViewer";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBar } from "@/components/StatusBar";
import { AnalyzeModal } from "@/components/AnalyzeModal";
import {
  getMe, logout, listAnalyses, getAnalysis,
  type AnalyzeResponse, type AnalysisRecord, type AuthUser,
} from "@/lib/api";

export default function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [analysis, setAnalysis]         = useState<AnalyzeResponse | null>(null);
  const [rawDiff, setRawDiff]           = useState("");
  const [prLabel, setPrLabel]           = useState("");
  const [tabs, setTabs]                 = useState<string[]>([]);
  const [activeTab, setActiveTab]       = useState<string | null>(null);
  const [user, setUser]                 = useState<AuthUser | null>(null);
  const [history, setHistory]           = useState<AnalysisRecord[]>([]);

  // ── Boot: check auth + load history + handle OAuth return ─────────────
  useEffect(() => {
    getMe().then(setUser);
    listAnalyses(20).then(setHistory).catch(() => {});

    // If redirected back from OAuth (?connected=1), retry last PR
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      window.history.replaceState({}, "", "/dashboard");
      const lastPr = localStorage.getItem("pr_radar_last_pr_url");
      if (lastPr) {
        // Re-open modal pre-filled
        setModalOpen(true);
      }
    }
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if (inInput) return;
      if (e.key === "n" || e.key === "N") setModalOpen(true);
      if (e.key === "b" || e.key === "B") setPanelOpen((p) => !p);
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Handle analysis result ─────────────────────────────────────────────
  const handleResult = useCallback(
    (result: AnalyzeResponse, label: string, diff: string) => {
      setAnalysis(result);
      setRawDiff(diff);
      setPrLabel(label);
      setTabs(result.changed_files);
      setActiveTab(result.changed_files[0] ?? null);
      if (!panelOpen) setPanelOpen(true);
      // Refresh history
      listAnalyses(20).then(setHistory).catch(() => {});
    },
    [panelOpen]
  );

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
    if (!panelOpen) setPanelOpen(true);
  }

  // ── Logout ────────────────────────────────────────────────────────────
  async function handleLogout() {
    await logout();
    setUser(null);
    window.location.href = "/dashboard";
  }

  // ── Rail zone ─────────────────────────────────────────────────────────
  const rail = (
    <div
      className="flex flex-col items-center pt-2 gap-1 bg-[#161b22] border-r border-[#21262d] h-full"
      onDoubleClick={() => setSidebarOpen((s) => !s)}
    >
      <div className="text-xl pb-2 pt-1 select-none text-[#58a6ff]">🛡️</div>
      <RailBtn title="Pull Requests" active onClick={() => {}}>
        <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h.538A1.962 1.962 0 0 1 12.5 4.462v9.538a2.25 2.25 0 1 1-1.5 0V4.462a.462.462 0 0 0-.462-.462H10v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
        </svg>
      </RailBtn>
      <div className="flex-1" />
      <RailBtn title="New analysis (N)" onClick={() => setModalOpen(true)}>
        <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
          <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
        </svg>
      </RailBtn>
      <RailBtn title="Toggle review panel (B)" active={panelOpen} onClick={() => setPanelOpen((p) => !p)} style={{ marginBottom: 8 }}>
        <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
          <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 12H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 13.543V12H1.75A1.75 1.75 0 0 1 0 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
        </svg>
      </RailBtn>
    </div>
  );

  // ── Sidebar zone ──────────────────────────────────────────────────────
  const sidebar = (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#21262d]">
      <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
          Pull Requests
        </span>
        <button
          onClick={() => setModalOpen(true)}
          className="text-[#8b949e] hover:text-[#c9d1d9] text-sm leading-none bg-none border-none cursor-pointer px-1 rounded hover:bg-[#21262d]"
          title="New analysis"
        >
          ＋
        </button>
      </div>
      <FileTree
        changedFiles={analysis?.changed_files ?? []}
        impactedFiles={analysis?.impacted_files ?? []}
        activeFile={activeTab}
        onFileClick={setActiveTab}
        history={history}
        onHistoryClick={handleHistoryClick}
      />
    </div>
  );

  // ── Titlebar / tabs ───────────────────────────────────────────────────
  const titlebar = (
    <div className="flex items-stretch bg-[#0d1117] border-b border-[#21262d] overflow-x-auto scrollbar-none">
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center px-3 text-[#8b949e] hover:text-[#c9d1d9] text-base bg-none border-none cursor-pointer flex-shrink-0"
        title="New analysis"
      >
        ＋
      </button>
      {tabs.map((path) => {
        const name = path.split("/").pop()!;
        return (
          <div
            key={path}
            onClick={() => setActiveTab(path)}
            className={`flex items-center gap-1.5 px-3 min-w-[120px] max-w-[200px] border-r border-[#21262d] cursor-pointer text-xs flex-shrink-0 ${
              activeTab === path
                ? "text-[#c9d1d9] border-b-2 border-b-[#58a6ff]"
                : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#e3b341] flex-shrink-0" />
            <span className="truncate flex-1">{name}</span>
            <button
              className="w-4 h-4 flex items-center justify-center rounded text-[11px] text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9] bg-none border-none cursor-pointer flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                const next = tabs.filter((t) => t !== path);
                setTabs(next);
                if (activeTab === path) setActiveTab(next[next.length - 1] ?? null);
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        onClick={() => setPanelOpen((p) => !p)}
        className={`ml-auto flex items-center gap-1.5 px-3 text-xs border-l border-[#21262d] bg-none cursor-pointer flex-shrink-0 ${
          panelOpen ? "text-[#58a6ff]" : "text-[#8b949e] hover:text-[#c9d1d9]"
        }`}
      >
        🤖 AI Review
      </button>
    </div>
  );

  return (
    <>
      <Shell
        rail={rail}
        sidebar={sidebar}
        titlebar={titlebar}
        main={<DiffViewer rawDiff={rawDiff} activeFile={activeTab} />}
        panel={
          <ReviewPanel
            analysis={analysis}
            onClose={() => setPanelOpen(false)}
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
  style,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className={`w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer border-none transition-colors ${
        active
          ? "text-[#58a6ff] bg-[#1f2937]"
          : "text-[#8b949e] bg-transparent hover:bg-[#21262d] hover:text-[#c9d1d9]"
      }`}
    >
      {children}
    </button>
  );
}
