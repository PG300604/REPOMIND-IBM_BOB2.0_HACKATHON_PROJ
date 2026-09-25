"use client";

import { cn } from "@/lib/utils";

interface DiffViewerProps {
  rawDiff: string;
  activeFile: string | null;
}

function parseDiffSection(fullDiff: string, targetPath: string): string {
  const sections = fullDiff.split(/(?=^diff --git )/m);

  for (const section of sections) {
    const pathMatch = section.match(/^\+\+\+ b\/(.+)/m);
    if (!pathMatch) continue;
    const fp = pathMatch[1].trim();
    if (fp !== targetPath) continue;

    const lines = section.split("\n");
    const result: Array<{ type: "hunk" | "added" | "removed" | "context" | "header"; content: string; lineNum?: number }> = [];

    let addLine = 1;
    let remLine = 1;
    let inHunk = false;

    result.push({ type: "header", content: fp });

    for (const line of lines) {
      if (line.startsWith("@@")) {
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
        if (m) { remLine = parseInt(m[1]); addLine = parseInt(m[2]); }
        result.push({ type: "hunk", content: line });
        inHunk = true;
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        result.push({ type: "added", content: line.slice(1), lineNum: addLine++ });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        result.push({ type: "removed", content: line.slice(1), lineNum: remLine++ });
      } else if (
        inHunk &&
        !line.startsWith("diff ") &&
        !line.startsWith("index ") &&
        !line.startsWith("--- ") &&
        !line.startsWith("+++ ")
      ) {
        result.push({ type: "context", content: line, lineNum: addLine });
        addLine++; remLine++;
      }
    }

    return JSON.stringify(result);
  }
  return "";
}

export function DiffViewer({ rawDiff, activeFile }: DiffViewerProps) {
  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[#8b949e]">
        <div className="text-5xl">🛡️</div>
        <div className="text-xl font-semibold text-[#c9d1d9]">PR Risk Radar</div>
        <p className="text-sm text-center max-w-xs leading-relaxed">
          Analyze any GitHub pull request for risk, blast radius, and missing tests.
        </p>
        <p className="text-xs text-[#8b949e]">
          Press <kbd className="bg-[#21262d] border border-[#30363d] rounded px-1.5 py-0.5 font-mono text-[#c9d1d9]">N</kbd> to start
          &nbsp;·&nbsp;
          <kbd className="bg-[#21262d] border border-[#30363d] rounded px-1.5 py-0.5 font-mono text-[#c9d1d9]">B</kbd> to toggle review
        </p>
      </div>
    );
  }

  if (!rawDiff) {
    return (
      <div className="flex-1 overflow-y-auto p-10 font-mono text-xs text-[#484f58]">
        <div className="text-[#8b949e] text-sm mb-2">📄 {activeFile}</div>
        Diff was fetched from GitHub API — raw content not available for display.
        <br />
        <span className="text-[#484f58]">The AI review panel shows the full analysis.</span>
      </div>
    );
  }

  const parsed = parseDiffSection(rawDiff, activeFile);
  if (!parsed) {
    return (
      <div className="flex-1 p-10 font-mono text-xs text-[#484f58]">
        No diff content found for <strong className="text-[#8b949e]">{activeFile}</strong>.
      </div>
    );
  }

  const lines: Array<{ type: string; content: string; lineNum?: number }> = JSON.parse(parsed);

  return (
    <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        if (line.type === "header") {
          return (
            <div
              key={i}
              className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-[#161b22] border-y border-[#21262d] text-xs text-[#8b949e]"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="#8b949e">
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Z" />
              </svg>
              <span className="font-semibold text-[#c9d1d9]">{line.content}</span>
            </div>
          );
        }
        if (line.type === "hunk") {
          return (
            <div key={i} className="px-4 py-0.5 bg-[#1c2128] text-[#8b949e] border-y border-[#21262d] text-[11px] select-none">
              {line.content}
            </div>
          );
        }
        if (line.type === "added") {
          return (
            <div key={i} className="flex hover:brightness-110 bg-[#0f2d1a]">
              <span className="w-12 text-right px-2 py-0 text-[11px] text-[#3fb950] bg-[#0d2e1b] border-r border-[#21262d] select-none flex-shrink-0">{line.lineNum}</span>
              <span className="px-4 text-[#aff0c0] whitespace-pre flex-1 before:content-['+'] before:text-[#3fb950] before:mr-2.5">{line.content}</span>
            </div>
          );
        }
        if (line.type === "removed") {
          return (
            <div key={i} className="flex hover:brightness-110 bg-[#2d0f0f]">
              <span className="w-12 text-right px-2 py-0 text-[11px] text-[#f85149] bg-[#2e0e0e] border-r border-[#21262d] select-none flex-shrink-0">{line.lineNum}</span>
              <span className="px-4 text-[#f4a5a5] whitespace-pre flex-1 before:content-['-'] before:text-[#f85149] before:mr-2.5">{line.content}</span>
            </div>
          );
        }
        // context
        return (
          <div key={i} className="flex text-[#8b949e]">
            <span className="w-12 text-right px-2 py-0 text-[11px] border-r border-[#21262d] select-none flex-shrink-0">{line.lineNum}</span>
            <span className="px-4 whitespace-pre flex-1 before:content-['_'] before:mr-2.5">{line.content}</span>
          </div>
        );
      })}
    </div>
  );
}
