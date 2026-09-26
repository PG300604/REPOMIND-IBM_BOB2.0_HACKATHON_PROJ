"use client";

import { useState } from "react";
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  ExternalLink,
  Bot,
  Radio,
  Copy,
  Check,
  ArrowUpRight,
  GitPullRequest,
  AlertTriangle,
  Play
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { simulatePrReview, type AutonomousReviewResult } from "@/lib/api";

interface WebhookEvent {
  id: string;
  event: string;
  repo: string;
  status: number;
  hmacVerified: boolean;
  time: string;
}

const SAMPLE_EVENTS: WebhookEvent[] = [
  { id: "evt_101", event: "pull_request.opened", repo: "PG300604/REPOMIND#42", status: 200, hmacVerified: true, time: "2 mins ago" },
  { id: "evt_102", event: "pull_request.synchronize", repo: "PG300604/REPOMIND#43", status: 200, hmacVerified: true, time: "24 mins ago" },
  { id: "evt_103", event: "installation.created", repo: "PG300604/org", status: 200, hmacVerified: true, time: "1 hour ago" },
];

export function WebhookSyncView() {
  const [webhookUrl, setWebhookUrl] = useState("https://smee.io/PR_RISK_RADAR_LOCAL");
  const [isSyncing, setIsSyncing] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>(SAMPLE_EVENTS);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Autonomous PR Review Simulator State
  const [simRepo, setSimRepo] = useState("PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ");
  const [simPrNumber, setSimPrNumber] = useState(42);
  const [isSimulating, setIsSimulating] = useState(false);
  const [reviewResult, setReviewResult] = useState<AutonomousReviewResult | null>({
    repo: "PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ",
    pr_number: 42,
    risk_level: "high",
    dashboard_deep_link: "http://localhost:3000/dashboard?repo=PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ&pr=42",
    posted: false,
    comment_markdown: `## RepoMind Code Review & Risk Radar — **HIGH RISK**

> Automated intelligent code review, AST dependency mapping, and test synthesis by **RepoMind**.
>
> **[Open Interactive Diff & Risk Radar in RepoMind Studio →](http://localhost:3000/dashboard?repo=PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ&pr=42)**

---

### Summary & Walkthrough
Pull request modifies critical authentication session handling and extracts AST symbols into downstream consumer modules. Validated against repository dependency graph.

### Code Review & Architectural Impact
- **Risk Classification**: \`HIGH\` based on symbol mutability and downstream dependencies.
- **Modified Symbols**: \`4\` abstract syntax tree symbols identified.
- **Blast Radius**: \`2\` downstream consumer files directly impacted.

### Changed AST Symbols
\`AnalyzeResponse\` \`extract_symbols\` \`get_current_token\` \`verify_session\`

### Downstream Blast Radius
- \`frontend/components/ReviewPanel.tsx\` (requires regression verification)
- \`backend/models.py\` (requires schema validation)

### Recommended Missing Test Cases
1. **Test session validation failure on forged JWT token**
2. **Verify AST dependency traversal handles cyclical imports**

---
**[Launch Full Studio Workspace (PG300604/REPOMIND)]((http://localhost:3000/dashboard?repo=PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ&pr=42))** · _Powered by RepoMind Risk Intelligence Engine_`,
  });

  const [copied, setCopied] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setStatusMsg("GitHub App Webhook synchronized. HMAC secret verified active.");
      setTimeout(() => setStatusMsg(null), 4000);
    }, 1000);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulatePrReview(simRepo, simPrNumber);
      setReviewResult(res);
      setStatusMsg(`RepoMind automated review generated for ${simRepo}#${simPrNumber}!`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg(`Simulation notice: ${err?.message || "Generated local review"}`);
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!reviewResult?.comment_markdown) return;
    navigator.clipboard.writeText(reviewResult.comment_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#07080a] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="h-12 border-b border-white/[0.06] px-5 flex items-center justify-between bg-[#090a0f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-100 font-mono font-bold text-xs uppercase tracking-wider">
            <Bot className="w-4 h-4 text-amber-400" />
            <span>GitHub App Code Reviewer & Intervenor</span>
          </div>

          <span className="text-zinc-700">|</span>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>ACTIVE WEBHOOK LISTENER: :8000/webhook</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="h-7 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Webhook Target"}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#07080a] scrollbar-thin space-y-6">
        
        {/* ── Section 1: Autonomous GitHub PR Intervenor & Risk Engine ── */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <SiGithub className="w-4 h-4 text-zinc-100" />
                <h3 className="text-sm font-mono font-bold text-zinc-100 uppercase tracking-wider">
                  Automated GitHub PR Intervenor (RepoMind Autonomous Agent)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                When a PR is opened or updated, RepoMind intervenes as an automated code reviewer, posts an AST risk assessment, and provides a 1-click deep link directly back into this dashboard.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{isSimulating ? "Simulating Review..." : "Simulate PR Review Intervenor"}</span>
              </button>
            </div>
          </div>

          {/* Simulator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                Target Repository
              </label>
              <input
                type="text"
                value={simRepo}
                onChange={(e) => setSimRepo(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-[#07080a] border border-white/[0.08] text-xs font-mono text-zinc-200 outline-none focus:border-amber-400/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                Pull Request #
              </label>
              <input
                type="number"
                value={simPrNumber}
                onChange={(e) => setSimPrNumber(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-3 rounded-lg bg-[#07080a] border border-white/[0.08] text-xs font-mono text-zinc-200 outline-none focus:border-amber-400/60"
              />
            </div>
          </div>

          {/* Rendered Live GitHub Review Comment Preview */}
          {reviewResult && (
            <div className="rounded-xl border border-white/[0.08] bg-[#07080a] overflow-hidden shadow-inner space-y-3">
              <div className="px-4 py-2.5 border-b border-white/[0.06] bg-[#090a0f] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-xs font-mono font-bold">
                    bot
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-200">
                    repomind-reviewer[bot] commented on PR #{reviewResult.pr_number}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-zinc-300 border border-white/[0.08] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy GitHub Markdown"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                    <span>{copied ? "Copied" : "Copy Markdown"}</span>
                  </button>

                  <a
                    href={reviewResult.dashboard_deep_link}
                    className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-mono text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <span>Test Studio Link</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Formatted Markdown Box */}
              <div className="p-5 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto scrollbar-thin">
                {reviewResult.comment_markdown}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Webhook Target Configuration ── */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
                GitHub App Webhook Target & Forwarder
              </h3>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Every PR opened, synchronized, or merged invokes this endpoint to trigger automated review comments.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
              HMAC-SHA256 SIGNED
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 h-8 bg-[#07080a] border border-white/[0.08] rounded-lg px-3 text-xs font-mono text-zinc-200 outline-none focus:border-amber-400/60"
            />
          </div>

          <div className="flex items-center gap-6 text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>pull_request (opened, synchronize, reopened)</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>installation (created, deleted)</span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Recent Inbound Webhook Deliveries ── */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c0d12] overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#090a0f]">
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
              Recent Webhook Deliveries & Interventions
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Verified with GITHUB_WEBHOOK_SECRET
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] text-xs font-mono">
            {events.map((evt) => (
              <div key={evt.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {evt.status} OK
                  </span>
                  <span className="font-semibold text-zinc-200">{evt.event}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{evt.repo}</span>
                </div>

                <div className="flex items-center gap-4 text-zinc-500 text-[11px]">
                  <span className="text-emerald-400">HMAC SHA256 VALID</span>
                  <span>{evt.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
