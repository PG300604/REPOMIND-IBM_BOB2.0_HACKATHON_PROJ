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
      ? "grid-cols-[48px_240px_1fr_320px]"
      : "grid-cols-[48px_0px_1fr_320px]"
    : sidebarOpen
    ? "grid-cols-[48px_240px_1fr]"
    : "grid-cols-[48px_0px_1fr]";

  const areas = panelOpen
    ? `"rail sidebar titlebar panel" "rail sidebar main panel" "rail sidebar statusbar panel"`
    : `"rail sidebar titlebar" "rail sidebar main" "rail sidebar statusbar"`;

  return (
    <div
      className={cn("grid h-screen w-screen", cols)}
      style={{
        gridTemplateAreas: areas,
        gridTemplateRows: "36px 1fr 24px",
      }}
    >
      <div style={{ gridArea: "rail" }}>{rail}</div>
      <div
        style={{ gridArea: "sidebar" }}
        className={cn(
          "overflow-hidden transition-all duration-200",
          !sidebarOpen && "w-0"
        )}
      >
        {sidebar}
      </div>
      <div style={{ gridArea: "titlebar" }}>{titlebar}</div>
      <div style={{ gridArea: "main" }} className="overflow-hidden flex flex-col">
        {main}
      </div>
      {panelOpen && <div style={{ gridArea: "panel" }}>{panel}</div>}
      <div style={{ gridArea: "statusbar" }}>{statusbar}</div>
    </div>
  );
}
