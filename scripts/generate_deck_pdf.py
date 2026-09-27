"""
RepoMind 2.0 — Hackathon PDF Slide Deck Generator
Generates a 16:9 widescreen presentation PDF using ReportLab with embedded screenshots.
"""

import os
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from PIL import Image

SLIDE_WIDTH = 1152  # 16 inches at 72 dpi
SLIDE_HEIGHT = 648  # 9 inches at 72 dpi

# Theme colors
BG_COLOR = HexColor("#0b0f17")
PANEL_BG = HexColor("#131a26")
PANEL_BORDER = HexColor("#232f42")
ACCENT_AMBER = HexColor("#f59e0b")
ACCENT_BLUE = HexColor("#38bdf8")
ACCENT_GREEN = HexColor("#10b981")
ACCENT_PURPLE = HexColor("#a855f7")
TEXT_WHITE = HexColor("#f8fafc")
TEXT_MUTED = HexColor("#94a3b8")
TEXT_DIM = HexColor("#64748b")

SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "screenshots")
OUTPUT_PDF = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "RepoMind_v2.0_Presentation.pdf")
DOWNLOADS_PDF = os.path.join(r"C:\Users\priya\Downloads", "RepoMind_v2.0_Presentation.pdf")


def draw_slide_template(c, category, title, slide_num, total_slides=12):
    """Draws header, footer, background, and accent lines."""
    # Background
    c.setFillColor(BG_COLOR)
    c.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, fill=True, stroke=False)

    # Top accent bar
    c.setFillColor(ACCENT_AMBER)
    c.rect(0, SLIDE_HEIGHT - 4, SLIDE_WIDTH, 4, fill=True, stroke=False)

    # Header category tag
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(48, SLIDE_HEIGHT - 38, category.upper())

    # Header title
    c.setFillColor(TEXT_WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(48, SLIDE_HEIGHT - 68, title)

    # Header divider
    c.setStrokeColor(PANEL_BORDER)
    c.setLineWidth(1)
    c.line(48, SLIDE_HEIGHT - 82, SLIDE_WIDTH - 48, SLIDE_HEIGHT - 82)

    # Footer
    c.line(48, 42, SLIDE_WIDTH - 48, 42)
    c.setFillColor(TEXT_DIM)
    c.setFont("Helvetica", 10)
    c.drawString(48, 24, "RepoMind 2.0 — Autonomous AI Code Review & AST Blast Radius Engine  |  IBM BOB 2.0 Hackathon 2026")
    c.drawRightString(SLIDE_WIDTH - 48, 24, f"Slide {slide_num} of {total_slides}")


def draw_card(c, x, y, w, h, bg=PANEL_BG, border=PANEL_BORDER, r=6):
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, r, fill=True, stroke=True)


def draw_image_fitted(c, img_filename, x, y, max_w, max_h):
    """Embeds an image scaled proportionally within a bounding box."""
    img_path = os.path.join(SCREENSHOTS_DIR, img_filename)
    if not os.path.exists(img_path):
        return

    with Image.open(img_path) as im:
        iw, ih = im.size

    scale = min(max_w / iw, max_h / ih)
    nw = iw * scale
    nh = ih * scale
    nx = x + (max_w - nw) / 2
    ny = y + (max_h - nh) / 2

    # Draw border card behind image
    draw_card(c, nx - 2, ny - 2, nw + 4, nh + 4, bg=HexColor("#0f172a"), border=HexColor("#334155"), r=4)
    c.drawImage(img_path, nx, ny, width=nw, height=nh, mask='auto')


def build_deck():
    c = canvas.Canvas(OUTPUT_PDF, pagesize=(SLIDE_WIDTH, SLIDE_HEIGHT))

    # =========================================================================
    # SLIDE 1: Title Slide
    # =========================================================================
    c.setFillColor(BG_COLOR)
    c.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, fill=True, stroke=False)
    
    # Decorative glow bands
    c.setFillColor(HexColor("#1e293b"))
    c.circle(SLIDE_WIDTH / 2, SLIDE_HEIGHT / 2, 380, fill=True, stroke=False)
    c.setFillColor(BG_COLOR)
    c.circle(SLIDE_WIDTH / 2, SLIDE_HEIGHT / 2, 370, fill=True, stroke=False)

    # Accent top banner
    c.setFillColor(ACCENT_AMBER)
    c.rect(0, SLIDE_HEIGHT - 6, SLIDE_WIDTH, 6, fill=True, stroke=False)

    # Badges
    c.setFillColor(HexColor("#1e293b"))
    c.setStrokeColor(ACCENT_AMBER)
    c.roundRect(SLIDE_WIDTH / 2 - 240, SLIDE_HEIGHT - 120, 480, 32, 16, fill=True, stroke=True)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(SLIDE_WIDTH / 2, SLIDE_HEIGHT - 100, "IBM BOB 2.0 HACKATHON  |  OFFICIAL RELEASE 2.0 (v2.0.0)")

    # Title
    c.setFillColor(TEXT_WHITE)
    c.setFont("Helvetica-Bold", 52)
    c.drawCentredString(SLIDE_WIDTH / 2, SLIDE_HEIGHT - 210, "RepoMind 2.0")

    # Subtitle
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(SLIDE_WIDTH / 2, SLIDE_HEIGHT - 250, "Autonomous AI Pull Request Reviewer & AST Blast Radius Engine")

    # Tagline
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 15)
    c.drawCentredString(SLIDE_WIDTH / 2, SLIDE_HEIGHT - 285, "Eliminate blind merges with AST dependency tracing, dual-tier fallback AI, and 1-click deep-link remediation.")

    # 4 Key Value Cards
    cards = [
        ("Official GitHub App", "repomind-reviewer[bot] with RS256 JWT installation tokens", ACCENT_BLUE),
        ("AST Blast Tracing", "Recursive symbol scanner reveals multi-hop consumer ripples", ACCENT_AMBER),
        ("Dual-Tier AI Pipeline", "Groq LLaMA-3.3 70B with auto-fallback to Gemini 2.5 Flash", ACCENT_GREEN),
        ("1-Click Studio Ingress", "Deep links trigger pre-loaded AI fixes in Obsidian IDE", ACCENT_PURPLE)
    ]
    cw = 245
    ch = 95
    start_x = (SLIDE_WIDTH - (4 * cw + 3 * 20)) / 2
    for i, (hd, sub, col) in enumerate(cards):
        cx = start_x + i * (cw + 20)
        cy = 135
        draw_card(c, cx, cy, cw, ch)
        c.setFillColor(col)
        c.rect(cx + 12, cy + ch - 18, 32, 3, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(cx + 12, cy + ch - 38, hd)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        words = sub.split(" ")
        line1 = " ".join(words[:4])
        line2 = " ".join(words[4:])
        c.drawString(cx + 12, cy + ch - 58, line1)
        c.drawString(cx + 12, cy + ch - 72, line2)

    # Footer note
    c.setFillColor(TEXT_DIM)
    c.setFont("Helvetica", 11)
    c.drawCentredString(SLIDE_WIDTH / 2, 55, "Created by Priyanshu Ghosh (@PG300604)  |  https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ")
    c.showPage()

    # =========================================================================
    # SLIDE 2: The Core Problem & Industry Dilemma
    # =========================================================================
    draw_slide_template(c, "The Problem", "3 Critical Flaws in Current Code Review Tools", 2)
    
    problems = [
        ("1. Blind to Downstream Side-Effects", 
         "Traditional PR bots only scan modified lines inside the git diff.",
         "When a function signature or class interface changes, callers in dozens of other files silently break.",
         "Diff-only analysis has ZERO context of project-wide transitive caller hierarchies.",
         HexColor("#ef4444")),
        ("2. Fragile Single-Provider AI Inferences",
         "Most review bots tie directly to a single LLM API key.",
         "API rate limits, sudden outages, or token throttling cause missed webhook deliveries.",
         "PR pipelines fail and block developer merges with zero automated failover mechanism.",
         HexColor("#f97316")),
        ("3. Truncated & Hallucinated Code Fixes",
         "Generic AI assistants return partial code snippets with lazy placeholders like '// ... existing code ...'.",
         "Applying incomplete stubs introduces syntax breakages, deleted logic, and broken imports.",
         "Developers waste hours cleaning up AI-generated hallucinations rather than accelerating merges.",
         HexColor("#eab308"))
    ]

    col_w = 330
    for i, (p_title, p1, p2, p3, p_col) in enumerate(problems):
        x = 48 + i * (col_w + 33)
        y = 110
        h = 420
        draw_card(c, x, y, col_w, h)
        
        # Color badge
        c.setFillColor(p_col)
        c.roundRect(x + 16, y + h - 36, 110, 20, 10, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + 71, y + h - 23, "CRITICAL RISK")

        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(x + 16, y + h - 68, p_title)

        # Bullets
        bullet_y = y + h - 110
        bullets = [p1, p2, p3]
        for b in bullets:
            c.setFillColor(p_col)
            c.circle(x + 22, bullet_y - 2, 4, fill=True, stroke=False)
            c.setFillColor(TEXT_MUTED)
            c.setFont("Helvetica", 12)
            # wrap text
            words = b.split()
            lines = []
            curr = []
            for w in words:
                curr.append(w)
                if len(" ".join(curr)) > 35:
                    lines.append(" ".join(curr[:-1]))
                    curr = [w]
            if curr:
                lines.append(" ".join(curr))
            
            for line in lines:
                c.drawString(x + 36, bullet_y, line)
                bullet_y -= 17
            bullet_y -= 14

    # Bottom comparison banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"), border=ACCENT_AMBER)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(64, 73, "REPO MIND ADVANTAGE:")
    c.setFillColor(TEXT_WHITE)
    c.setFont("Helvetica", 11)
    c.drawString(225, 73, "AST Multi-Hop Blast Tracing + Dual-Tier LLM Router (Groq + Gemini) + Pre-Commit Code Integrity Guardian")
    c.showPage()

    # =========================================================================
    # SLIDE 3: System Architecture Pipeline
    # =========================================================================
    draw_slide_template(c, "System Architecture", "End-to-End Autonomous Pipeline & Dual-Tier Engine", 3)

    # Left Column: Pipeline Stages
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(68, 495, "5-Stage Autonomous Execution Pipeline")

    stages = [
        ("Stage 1: Webhook Ingress & Verification", "GitHub triggers POST /webhook with pull_request event; verified via HMAC-SHA256 signature."),
        ("Stage 2: AST Static Symbol Extraction", "diff_parser.py extracts modified functions, classes, and types from unified diff chunks."),
        ("Stage 3: Multi-Hop Blast Radius Scan", "dependency_finder.py traverses repo files to map 1st-hop callers & 2nd-hop transitive ripples."),
        ("Stage 4: Dual-Tier AI Synthesis", "Groq LLaMA-3.3 70B generates risk metrics & 3 fix prompts; transparently fails over to Gemini 2.5 Flash."),
        ("Stage 5: Bot Comment & Deep Ingress", "repomind-reviewer[bot] comments via RS256 JWT installation tokens with 1-click Studio deep links.")
    ]

    sy = 455
    for st_title, st_desc in stages:
        c.setFillColor(ACCENT_BLUE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(68, sy, st_title)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(68, sy - 16, st_desc[:85])
        if len(st_desc) > 85:
            c.drawString(68, sy - 30, st_desc[85:])
        sy -= 65

    # Right Column: Visual Architecture Screenshot
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(604, 495, "Topological Node Architecture (Live Studio)")
    draw_image_fitted(c, "08_architecture_node_graph.png", 604, 130, 480, 345)

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Infrastructure: Next.js 16 (Vercel Edge)  |  FastAPI 2.0 (Render Cloud)  |  SQLite (SQLAlchemy Core)  |  Keep-Alive Cron")
    c.showPage()

    # =========================================================================
    # SLIDE 4: Real-World GitHub App Bot (repomind-reviewer[bot])
    # =========================================================================
    draw_slide_template(c, "Autonomous GitHub App", "Live Production Bot Verification on Pull Request #6", 4)

    # Left: Screenshot 03 (Autonomous review comment)
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "Live Autonomous Review (PR #6 Comment)")
    draw_image_fitted(c, "03_autonomous_review_comment.png", 64, 125, 488, 355)

    # Right: Technical Evidence & Highlights
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(604, 495, "Verified GitHub App Bot Authority")

    items = [
        ("Official Verified Identity", "Authenticated as repomind-reviewer[bot] using RS256 JWT installation tokens (ghs_...). Not personal PAT."),
        ("Risk Assessment Radar", "Calculated LOW RISK rating based on AST symbol mutability and zero downstream consumer impacts."),
        ("AST Modified Symbols", "Identified 0 breaking abstract syntax mutations in markdown diff chunks."),
        ("Downstream Blast Radius", "Scanned 1,641 indexed repository files; verified 0 dependent files broken."),
        ("Synthesized Regression Tests", "Generated 3 explicit test scenarios to validate badge URLs, HTTP status codes, and CI pipeline integrity.")
    ]

    iy = 450
    for h, desc in items:
        c.setFillColor(ACCENT_GREEN)
        c.circle(614, iy + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(626, iy, h)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(626, iy - 16, desc[:80])
        if len(desc) > 80:
            c.drawString(626, iy - 28, desc[80:])
        iy -= 56

    # Bottom link
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(64, 73, "VERIFIED LINK:")
    c.setFillColor(TEXT_WHITE)
    c.setFont("Helvetica", 10)
    c.drawString(170, 73, "https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/pull/6#issuecomment-5854011256")
    c.showPage()

    # =========================================================================
    # SLIDE 5: 1-Click AI Fix & Deep-Linked Remediation
    # =========================================================================
    draw_slide_template(c, "1-Click Remediation", "Deep-Linked Ingress from GitHub Comments to Studio IDE", 5)

    # Left: Screenshot 04 (Actions on GitHub)
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "GitHub Review: 3 Actionable Fix Deep Links")
    draw_image_fitted(c, "04_actionable_1click_fix_prompts.png", 64, 125, 488, 355)

    # Right: Screenshot 11 (AI Inline Diff & Accept Fix)
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(604, 498, "Studio IDE: Pre-loaded Prompt & Inline Unified Diff")
    draw_image_fitted(c, "11_ai_inline_diff_fix_generator.png", 604, 125, 488, 355)

    # Bottom banner explaining deep link
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"), border=ACCENT_BLUE)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(64, 73, "DEEP LINK PATTERN:")
    c.setFillColor(TEXT_WHITE)
    c.setFont("Helvetica", 10)
    c.drawString(210, 73, "http://localhost:3000/dashboard?repo={owner}/{repo}&pr={number}&action=fix&prompt={encoded_prompt}")
    c.showPage()

    # =========================================================================
    # SLIDE 6: AST Blast Radius & Domino Effect Simulator
    # =========================================================================
    draw_slide_template(c, "AST Blast Engine", "Visual Consequence Matrix & Multi-Hop Ripple Simulator", 6)

    # Left: Full visual screenshot of Domino Flow
    draw_card(c, 48, 110, 680, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "Interactive AST Blast Radius & Domino Consequence Simulator")
    draw_image_fitted(c, "09_ast_blast_radius_domino_flow.png", 64, 125, 648, 355)

    # Right: Technical Deep Dive
    draw_card(c, 744, 110, 360, 420)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(764, 495, "The 4-Hop Ripple Model")

    hops = [
        ("1. Ground Zero", "Origin function or class modification identified from diff additions/deletions."),
        ("2. Direct Callers", "Every file directly importing or executing the modified symbol."),
        ("3. Transitive Ripple", "2nd-hop consumers calling the direct callers across module boundaries."),
        ("4. System Impact", "Aggregated blast percentage, risk score, and downstream breaking danger.")
    ]

    hy = 445
    for hp, desc in hops:
        c.setFillColor(ACCENT_AMBER)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(764, hy, hp)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(764, hy - 16, desc[:50])
        if len(desc) > 50:
            c.drawString(764, hy - 28, desc[50:])
        hy -= 62

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Language Coverage: Python (ast module)  |  JavaScript & TypeScript (regex symbol tokenizer)  |  Recursive path resolution")
    c.showPage()

    # =========================================================================
    # SLIDE 7: Full Repository Security Audit & Code Integrity Guardian
    # =========================================================================
    draw_slide_template(c, "Security & Integrity", "Code Integrity Guardian & Multi-Model Security Audit", 7)

    # Left: Screenshot 13 (Full repo security audit report)
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(HexColor("#ef4444"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "Live Repository Security Audit Report (Health: 55/100)")
    draw_image_fitted(c, "13_full_repo_security_audit_report.png", 64, 125, 488, 355)

    # Right: Code Integrity Guardian Rules
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(604, 495, "Pre-Commit Code Integrity Guardian")

    guardian_rules = [
        ("Zero Truncation Guarantee", "Rejects all AI-generated code containing '...', '// rest of code', or placeholder stubs. Requires 100% complete files."),
        ("Pre-Commit AST Parsing", "Validates python code with ast.parse() before saving to ensure syntax correctness and clean execution."),
        ("Vulnerability Detection", "Audits unauthenticated backend routes, weak CSRF tokens, missing cookie security flags, and unsafe subprocess calls."),
        ("1-Click In-IDE Patching", "Every security vulnerability features an 'AI Write Fix' button with side-by-side diff preview and GitHub branch commit.")
    ]

    gy = 450
    for r_title, r_desc in guardian_rules:
        c.setFillColor(ACCENT_AMBER)
        c.circle(614, gy + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(626, gy, r_title)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(626, gy - 16, r_desc[:80])
        if len(r_desc) > 80:
            c.drawString(626, gy - 28, r_desc[80:])
        gy -= 65

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Audit Coverage: Auth Endpoints  |  CORS & CSRF Policies  |  AST Dependencies  |  UI Schemas & Error Boundaries")
    c.showPage()

    # =========================================================================
    # SLIDE 8: Living Architecture Blueprint & Documentation Catalog
    # =========================================================================
    draw_slide_template(c, "Living Knowledge Base", "AI-Generated System Manuals & API Schema Catalog", 8)

    # Left: Screenshot 14 (AI Documentation Catalog)
    draw_card(c, 48, 110, 620, 420)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "Live Generated 4-Chapter System Architecture Blueprint")
    draw_image_fitted(c, "14_ai_documentation_catalog.png", 64, 125, 588, 355)

    # Right: Catalog Capabilities
    draw_card(c, 684, 110, 420, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(704, 495, "Living Knowledge Base Features")

    cat_items = [
        ("Autonomous Manual Generation", "Inspects repository source code and synthesizes a comprehensive 4-chapter system manual in seconds."),
        ("Executive & Mission Mapping", "Documents primary problem domain, business objectives, architectural goals, and value propositions."),
        ("Endpoint & Schema Blueprint", "Maintains real-time schemas for all 20+ REST API endpoints and database models."),
        ("1-Click Markdown Export", "Developers can export full documentation (.md) to sync with project wikis or GitHub READMEs.")
    ]

    cy = 450
    for ct, cd in cat_items:
        c.setFillColor(ACCENT_GREEN)
        c.circle(714, cy + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(726, cy, ct)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(726, cy - 16, cd[:60])
        if len(cd) > 60:
            c.drawString(726, cy - 28, cd[60:])
        cy -= 65

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Self-Healing Documentation: Never goes out of date; updates automatically upon PR merge.")
    c.showPage()

    # =========================================================================
    # SLIDE 9: SQLite Telemetry & Model Operations Studio
    # =========================================================================
    draw_slide_template(c, "Telemetry & Operations", "SQLite Persistence Engine & Multi-Model Routing Studio", 9)

    # Left: Screenshot 15 (SQLite Telemetry)
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_PURPLE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(64, 498, "SQLite Telemetry Dashboard & 1-Click Vacuum")
    draw_image_fitted(c, "15_sqlite_telemetry_5stage_pipeline.png", 64, 125, 488, 355)

    # Right: Screenshot 16 (Tools & Model Configuration)
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(604, 498, "Tools Studio: Model Routing & AST Recursion Depth")
    draw_image_fitted(c, "16_tools_model_configuration.png", 604, 125, 488, 355)

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Multi-Model Flexibility: IBM watsonx.ai Granite 3.0  |  Groq LLaMA-3.3 70B  |  Google Gemini 2.5 Flash")
    c.showPage()

    # =========================================================================
    # SLIDE 10: IBM BOB Usage & watsonx.ai Statement
    # =========================================================================
    draw_slide_template(c, "IBM BOB Usage Statement", "Foundational Engineering via IBM BOB & watsonx.ai", 10)

    # Left Card: 60% Core Scaffolding
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(68, 495, "60% Core Engineering via IBM BOB")

    bob_points = [
        ("Full-Stack Scaffolding", "Generated initial FastAPI REST API structure and Next.js 16 (React 19) Obsidian Dark IDE studio."),
        ("Diff Parser & AST Algorithms", "Formulated the AST symbol extractor and initial recursive dependency scanner logic."),
        ("Database & Persistence Layer", "Designed SQLite schemas via SQLAlchemy for PR risk caching, user sessions, and audit logs."),
        ("IBM watsonx.ai Granite Integration", "Architected model routing schemas for IBM watsonx.ai Granite 3.0 (8B Instruct) as enterprise reasoning engine.")
    ]

    by = 450
    for bt, bd in bob_points:
        c.setFillColor(ACCENT_AMBER)
        c.circle(78, by + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(90, by, bt)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(90, by - 16, bd[:80])
        if len(bd) > 80:
            c.drawString(90, by - 28, bd[80:])
        by -= 65

    # Right Card: Credit Exhaustion & Final 40% Completion
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(604, 495, "Coin Exhaustion & Final 40% Delivery")

    fin_points = [
        ("100% Coin Exhaustion", "All allocated IBM BOB hackathon credits/coins were fully utilized to establish the complete 60% core foundation."),
        ("Production Continuity", "To meet the submission deadline, the remaining 40% was completed using auxiliary developer environments."),
        ("GitHub App RS256 Auth", "Finalized private key JWT token creation to allow repomind-reviewer[bot] to comment under official bot identity."),
        ("Deep Link Ingress & Release 2.0", "Engineered URL parameter parsing (?action=fix&prompt=...) and finalized Release 2.0.0 packaging.")
    ]

    fy = 450
    for ft, fd in fin_points:
        c.setFillColor(ACCENT_GREEN)
        c.circle(614, fy + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(626, fy, ft)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(626, fy - 16, fd[:80])
        if len(fd) > 80:
            c.drawString(626, fy - 28, fd[80:])
        fy -= 65

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "Synergy: IBM BOB generated the core codebase; specialized integration completed the production loop.")
    c.showPage()

    # =========================================================================
    # SLIDE 11: Tech Stack & Production Deployment
    # =========================================================================
    draw_slide_template(c, "Technology Stack", "Modern Enterprise Full-Stack Architecture", 11)

    tech_cards = [
        ("Frontend Studio", "Next.js 16.3 (Turbopack)\nReact 19.2\nTailwind CSS 4.x\nRadix UI Primitives\nLucide React Icons", ACCENT_BLUE),
        ("Backend Gateway", "FastAPI 2.0.0\nPython 3.12+\nUvicorn Async ASGI\nHTTPX Async Client\nPyJWT (RS256 & HS256)", ACCENT_GREEN),
        ("AI Inference Tier", "Groq LLaMA-3.3 70B (Primary)\nGoogle Gemini 2.5 Flash (Fallback)\nIBM watsonx.ai Granite 3.0\nZero-Downtime Fallback", ACCENT_AMBER),
        ("Storage & Cloud", "SQLite via SQLAlchemy Core\nVercel (Frontend Edge)\nRender (Backend API)\nGitHub Actions Keep-Alive", ACCENT_PURPLE)
    ]

    for i, (th, t_body, tc) in enumerate(tech_cards):
        tx = 48 + i * (255 + 24)
        ty = 110
        draw_card(c, tx, ty, 255, 420)
        
        c.setFillColor(tc)
        c.rect(tx + 16, ty + 420 - 18, 40, 3, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(tx + 16, ty + 420 - 45, th)

        lines = t_body.split("\n")
        ly = ty + 420 - 90
        for l in lines:
            c.setFillColor(tc)
            c.circle(tx + 22, ly + 4, 3, fill=True, stroke=False)
            c.setFillColor(TEXT_MUTED)
            c.setFont("Helvetica", 12)
            c.drawString(tx + 34, ly, l)
            ly -= 35

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"))
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(64, 73, "100% Pinned Bounds in requirements.txt and package.json. Zero legacy dependencies. 0 build errors.")
    c.showPage()

    # =========================================================================
    # SLIDE 12: Conclusion & Verifiable Deliverables
    # =========================================================================
    draw_slide_template(c, "Conclusion & Links", "RepoMind 2.0 — Ready for Production & Submission", 12)

    # Left: Summary Card
    draw_card(c, 48, 110, 520, 420)
    c.setFillColor(ACCENT_AMBER)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(68, 495, "Summary of Achievements")

    sum_points = [
        ("Release 2.0 Live", "Official v2.0.0 tagged and published on GitHub with complete release notes."),
        ("Verified Autonomous PR #6", "Live proof of repomind-reviewer[bot] analyzing diffs and commenting on PR #6."),
        ("1-Click Deep Remediation", "Full round-trip loop from GitHub review comments into the Studio IDE."),
        ("Multi-Hop AST Blast Tracing", "Eliminates blind merges by mapping transitive downstream ripples."),
        ("Resilient Zero-Downtime AI", "High-throughput primary inference with automated failover.")
    ]

    s_y = 450
    for st, sd in sum_points:
        c.setFillColor(ACCENT_GREEN)
        c.circle(78, s_y + 4, 4, fill=True, stroke=False)
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(90, s_y, st)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 10)
        c.drawString(90, s_y - 16, sd)
        s_y -= 58

    # Right: Direct Verifiable URLs Card
    draw_card(c, 584, 110, 520, 420)
    c.setFillColor(ACCENT_BLUE)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(604, 495, "Live Project Deliverables")

    links = [
        ("Live Studio IDE", "https://repomind-ibm-bob-2-0-hackathon-proj.vercel.app"),
        ("GitHub Repository", "https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ"),
        ("GitHub Release 2.0 (v2.0.0)", "https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/releases/tag/v2.0.0"),
        ("PR #6 Bot Review Proof", "https://github.com/PG300604/REPOMIND-IBM_BOB2.0_HACKATHON_PROJ/pull/6#issuecomment-5854011256"),
        ("GitHub App Listing", "https://github.com/apps/repomind-reviewer"),
        ("Submission Showcase & 16 Screenshots", "docs/HACKATHON_SUBMISSION.md")
    ]

    ly = 450
    for lt, lu in links:
        c.setFillColor(ACCENT_AMBER)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(604, ly, lt.upper())
        c.setFillColor(TEXT_WHITE)
        c.setFont("Helvetica", 10)
        c.drawString(604, ly - 14, lu)
        ly -= 48

    # Bottom banner
    draw_card(c, 48, 60, SLIDE_WIDTH - 96, 36, bg=HexColor("#1e293b"), border=ACCENT_GREEN)
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(SLIDE_WIDTH / 2, 73, "THANK YOU — BUILT FOR THE IBM BOB 2.0 HACKATHON 2026")
    c.showPage()

    c.save()
    print(f"Presentation PDF successfully generated: {OUTPUT_PDF}")

    # Copy to Downloads
    import shutil
    shutil.copy2(OUTPUT_PDF, DOWNLOADS_PDF)
    print(f"Copied to Downloads folder: {DOWNLOADS_PDF}")


if __name__ == "__main__":
    build_deck()
