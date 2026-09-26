"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import MoltenMetal from "@/components/MoltenMetal";
import LogoLoop from "@/components/LogoLoop";
import SpecularButton from "@/components/SpecularButton";
import { ArrowUpRight, ChevronRight, Terminal, ExternalLink } from "lucide-react";
import { SiReact, SiNextdotjs, SiTypescript, SiTailwindcss, SiPython, SiFastapi, SiSqlite, SiGithub } from "react-icons/si";

export default function LandingPage() {
  const router = useRouter();

  // Tech stack logos for LogoLoop and direct rendering
  const techLogos = [
    { node: <SiNextdotjs className="text-zinc-200" />, title: "Next.js 16", href: "https://nextjs.org" },
    { node: <SiReact className="text-sky-400" />, title: "React 19", href: "https://react.dev" },
    { node: <SiTypescript className="text-blue-400" />, title: "TypeScript", href: "https://www.typescriptlang.org" },
    { node: <SiPython className="text-yellow-400" />, title: "Python 3.12", href: "https://python.org" },
    { node: <SiFastapi className="text-emerald-400" />, title: "FastAPI", href: "https://fastapi.tiangolo.com" },
    { node: <SiSqlite className="text-green-400" />, title: "SQLite", href: "https://sqlite.org" },
    { node: <SiGithub className="text-zinc-100" />, title: "GitHub Repo", href: "https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ" },
    { node: <SiTailwindcss className="text-cyan-400" />, title: "Tailwind CSS", href: "https://tailwindcss.com" }
  ];

  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ── Top Navigation Bar ── */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 border-b border-white/[0.06] bg-[#07080a]/75 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono font-bold text-sm tracking-[0.2em] text-zinc-100 uppercase group-hover:text-amber-400 transition-colors">
              REPOMIND
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-6 sm:gap-8 text-xs font-mono text-zinc-400">
          <a href="https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors">
            <span>github</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
          </a>
          <SpecularButton
            size="sm"
            radius={20}
            tint="#4328eb"
            tintOpacity={0.2}
            textColor="#ffffff"
            lineColor="#f59e0b"
            baseColor="#333333"
            intensity={1.2}
            thickness={1.2}
            followMouse
            onClick={() => router.push("/dashboard")}
          >
            Launch Studio
          </SpecularButton>
        </nav>
      </header>

      {/* ── Hero Section with <MoltenMetal /> Interactive Background ── */}
      <section className="relative min-h-[82vh] pt-32 pb-16 flex flex-col items-center justify-center px-4 sm:px-8 overflow-hidden">
        {/* Full-width interactive liquid metal fluid canvas */}
        <div className="absolute inset-0 z-0 opacity-75 pointer-events-auto">
          <MoltenMetal
            color1="#4328eb"
            color2="#f59e0b"
            color3="#ffffff"
            speed={0.25}
            scale={3.6}
            detail={3}
            glow={2.2}
            coreSize={0.09}
            swirl={1.2}
            fold={-0.25}
            blackPoint={0.05}
            brightness={1.55}
            colorMode="molten"
            grain={true}
            grainIntensity={0.04}
            mouseInteraction={true}
            mouseStrength={0.35}
            opacity={0.95}
          />
        </div>
        {/* Soft radial vignette */}
        <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_35%,#07080a_90%)] pointer-events-none" />
        {/* Hero Content */}
        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center text-center px-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-zinc-100 leading-[1.05] mb-6">
            WHERE CODE MEETS<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
              INTELLIGENT RISK RADAR
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-10 font-normal">
            Eliminate blind pull request merges. RepoMind maps abstract syntax tree symbol dependencies, calculates downstream blast radiuses, and synthesizes missing tests automatically.
          </p>
          {/* Interactive Specular Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <SpecularButton
              size="lg"
              radius={24}
              tint="#f59e0b"
              tintOpacity={0.15}
              textColor="#ffffff"
              lineColor="#f59e0b"
              baseColor="#444444"
              intensity={1.3}
              shineSize={12}
              shineFade={35}
              thickness={1.4}
              speed={0.4}
              followMouse
              proximity={280}
              onClick={() => router.push("/dashboard")}
            >
              <span>ENTER REPOMIND STUDIO</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </SpecularButton>
          </div>
          {/* Tech Stack Logos */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {techLogos.map((item, idx) => (
              <a key={idx} href={item.href} title={item.title} className="text-2xl hover:opacity-80">
                {item.node}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
