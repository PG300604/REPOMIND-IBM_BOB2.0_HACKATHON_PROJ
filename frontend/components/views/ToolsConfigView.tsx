"use client";

import { useState } from "react";
import { 
  Wrench, 
  Cpu, 
  Sliders, 
  HelpCircle, 
  ShieldCheck, 
  Check, 
  Save, 
  Key, 
  Terminal,
  BookOpen,
  Keyboard
} from "lucide-react";

export function ToolsConfigView() {
  const [model, setModel] = useState("ibm_granite");
  const [riskTolerance, setRiskTolerance] = useState("balanced");
  const [scanDepth, setScanDepth] = useState("3");
  const [autoComment, setAutoComment] = useState("high_medium");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-zinc-300 select-none overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="h-12 border-b border-white/[0.08] px-4 flex items-center justify-between bg-[#12141c]/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Tools, Model Configuration & Studio Guide</span>
          </div>

          <span className="text-zinc-600">|</span>

          <span className="text-xs font-mono text-zinc-400">
            ACTIVE PROFILE: IBM BOB 2.0 HACKATHON EDITION
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="h-7 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? "Settings Saved" : "Save Preferences"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings & Guide Body */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#08090d] scrollbar-thin space-y-6">
        
        {/* Model & AI Settings Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* AI Model Selection */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12141c]/90 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-100 uppercase tracking-wider mb-4">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Primary Risk Reasoning Engine</span>
            </div>

            <div className="space-y-2.5">
              <label 
                onClick={() => setModel("ibm_granite")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  model === "ibm_granite"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-zinc-100"
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                }`}
              >
                <input 
                  type="radio" 
                  name="model" 
                  checked={model === "ibm_granite"} 
                  onChange={() => setModel("ibm_granite")} 
                  className="mt-0.5 accent-indigo-500" 
                />
                <div>
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>IBM watsonx.ai Granite 3.0 (8B Instruct)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      RECOMMENDED
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    IBM Granite enterprise code reasoning with zero data retention.
                  </div>
                </div>
              </label>

              <label 
                onClick={() => setModel("groq_llama")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  model === "groq_llama"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-zinc-100"
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                }`}
              >
                <input 
                  type="radio" 
                  name="model" 
                  checked={model === "groq_llama"} 
                  onChange={() => setModel("groq_llama")} 
                  className="mt-0.5 accent-indigo-500" 
                />
                <div>
                  <div className="text-xs font-semibold">Groq LLaMA-3 (8B 8192)</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Ultra-fast 800+ tokens/sec inference; free tier with no credit card.
                  </div>
                </div>
              </label>

              <label 
                onClick={() => setModel("gemini_flash")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  model === "gemini_flash"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-zinc-100"
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04]"
                }`}
              >
                <input 
                  type="radio" 
                  name="model" 
                  checked={model === "gemini_flash"} 
                  onChange={() => setModel("gemini_flash")} 
                  className="mt-0.5 accent-indigo-500" 
                />
                <div>
                  <div className="text-xs font-semibold">Google Gemini 1.5 Flash</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    High context window fallback for diffs over 100k characters.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Analysis & Risk Sensitivity Rules */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12141c]/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-100 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Risk Tolerance & AST Depth</span>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                RISK EVALUATION PROFILE
              </label>
              <select
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                className="w-full h-8 bg-[#181a24] border border-white/[0.08] rounded-md px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="strict">Strict (Flags private signature mutations as HIGH)</option>
                <option value="balanced">Balanced (Evaluates transitive consumer blast radius)</option>
                <option value="permissive">Permissive (Only flags breaking exported interfaces)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                AST DEPENDENT RECURSION DEPTH
              </label>
              <select
                value={scanDepth}
                onChange={(e) => setScanDepth(e.target.value)}
                className="w-full h-8 bg-[#181a24] border border-white/[0.08] rounded-md px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="1">1 Hop (Direct consumers only)</option>
                <option value="3">3 Hops (Recommended: direct + secondary consumers)</option>
                <option value="5">5 Hops (Deep repository graph traversal)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                AUTOMATED GITHUB PR COMMENT DISPATCH
              </label>
              <select
                value={autoComment}
                onChange={(e) => setAutoComment(e.target.value)}
                className="w-full h-8 bg-[#181a24] border border-white/[0.08] rounded-md px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="high">Post comment on HIGH risk PRs only</option>
                <option value="high_medium">Post comment on HIGH & MEDIUM risk PRs</option>
                <option value="all">Post comment on ALL analyzed pull requests</option>
              </select>
            </div>
          </div>

        </div>

        {/* Studio Guide & Walkthrough Card */}
        <div className="max-w-4xl mx-auto rounded-xl border border-white/[0.08] bg-[#12141c]/90 p-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-100 uppercase tracking-wider mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>How to Use RepoMind Studio (Step-by-Step Guide)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="font-mono text-amber-400 font-bold mb-1">01 · BROWSE CODEBASE</div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Click the <strong>Page Code</strong> tab in the rail to explore the repository file tree like VS Code. Click any file to open it in a tab.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="font-mono text-amber-400 font-bold mb-1">02 · ANALYZE PULL REQUESTS</div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Click <strong>Analyze PR</strong> at the bottom of the sidebar or press <kbd className="font-mono px-1 py-0.5 rounded bg-white/10">N</kbd>. Paste any public GitHub PR link or test diff.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="font-mono text-amber-400 font-bold mb-1">03 · BLAST RADIUS RADAR</div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Navigate to the <strong>Git Branches</strong> tab to see how modified symbols radiate into downstream consumers and cross-branch staging targets.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="font-mono text-amber-400 font-bold mb-1">04 · SYNTHESIZE DOCUMENTATION</div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Open the <strong>Catalog</strong> view to automatically generate API reference schemas, Architecture Decision Records (ADRs), or PR release notes.
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Cheatsheet */}
        <div className="max-w-4xl mx-auto rounded-xl border border-white/[0.08] bg-[#12141c]/90 p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-zinc-400" />
            <div>
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Keyboard Shortcuts
              </div>
              <div className="text-[11px] text-zinc-500">
                Speed navigation across the RepoMind studio.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-zinc-300">N</kbd>
              <span className="text-zinc-500 ml-1.5">Analyze PR</span>
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-zinc-300">B</kbd>
              <span className="text-zinc-500 ml-1.5">AI Review</span>
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-zinc-300">⌘ K</kbd>
              <span className="text-zinc-500 ml-1.5">Search Files</span>
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-zinc-300">Esc</kbd>
              <span className="text-zinc-500 ml-1.5">Close Modal</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
