"use client";

import { cn } from "@/lib/utils";

interface ShellProps {
  rail: React.ReactNode;
  sidebar: React.ReactNode;
  titlebar: React.ReactNode;
  main: React.ReactNode;
  panel: React.ReactNode;
  statusbar: React.ReactNode;
  panelOpen: boolean;
  sidebarOpen: boolean;
}

export function Shell({
  rail,
  sidebar,
  titlebar,
  main,
  panel,
  statusbar,
  panelOpen,
  sidebarOpen,
}: ShellProps) {
  const cols = panelOpen
    ? sidebarOpen
      ? "grid-cols-[50px_270px_1fr_360px]"
      : "grid-cols-[50px_0px_1fr_360px]"
    : sidebarOpen
    ? "grid-cols-[50px_270px_1fr]"
    : "grid-cols-[50px_0px_1fr]";

  const areas = panelOpen
    ? `"rail sidebar titlebar panel" "rail sidebar main panel" "rail sidebar statusbar panel"`
    : `"rail sidebar titlebar" "rail sidebar main" "rail sidebar statusbar"`;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#07080a] text-zinc-100 font-sans select-none">
      {/* ── IDE Grid Structure ── */}
      <div
        className={cn(
          "grid h-full w-full bg-[#07080a] text-zinc-200 transition-all duration-150 overflow-hidden",
          cols
        )}
        style={{
          gridTemplateAreas: areas,
          gridTemplateRows: "38px 1fr 26px",
        }}
      >
        {/* Left Rail / Activity Bar */}
        <div style={{ gridArea: "rail" }} className="h-full overflow-hidden bg-[#07080a] border-r border-white/[0.06]">
          {rail}
        </div>

        {/* Collapsible Left Sidebar */}
        <div
          style={{ gridArea: "sidebar" }}
          className={cn(
            "overflow-hidden transition-all duration-150 bg-[#090a0f] border-r border-white/[0.06]",
            !sidebarOpen && "w-0 border-r-0"
          )}
        >
          {sidebar}
        </div>

        {/* Editor Tabs & Titlebar */}
        <div style={{ gridArea: "titlebar" }} className="border-b border-white/[0.06] bg-[#090a0f] overflow-hidden">
          {titlebar}
        </div>

        {/* Main Central Workspace / Editor / Tool Canvas */}
        <div style={{ gridArea: "main" }} className="overflow-hidden flex flex-col bg-[#0c0d12]">
          {main}
        </div>

        {/* Right Collapsible AI Review Panel */}
        {panelOpen && (
          <div style={{ gridArea: "panel" }} className="border-l border-white/[0.06] bg-[#090a0f] overflow-hidden">
            {panel}
          </div>
        )}

        {/* Bottom Status Bar */}
        <div style={{ gridArea: "statusbar" }} className="border-t border-white/[0.06] bg-[#07080a] overflow-hidden">
          {statusbar}
        </div>
      </div>
    </div>
  );
}
