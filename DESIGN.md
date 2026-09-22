# Stitch Design System Specification
**Project:** SIYA · 3D AI Career Guidance Mentor  
**Theme Name:** Neural Obsidian Glass (Dark Mode — Taste-Skill Aesthetic)  
**Version:** 2.0.0  
**Specification File:** `DESIGN.md`

---

## 1. System Overview & Taste-Skill Philosophy

The **SIYA Design System** merges a high-performance **3D WebGL stage** with a **restrained obsidian glassmorphism UI** engineered following the human-crafted, anti-slop guidelines of `Leonxlnx/taste-skill`.

### Core Design Pillars:
* **Anti-Slop Typography:** Modern geometric sans typography (`Plus Jakarta Sans`, `Outfit`, `Space Grotesk`) with optical tracking, tight heading kerning (`-0.02em`), and monospaced data clarity (`JetBrains Mono`).
* **Disciplined Palette:** Dark obsidian neutral void (`#09090b` / `hsl(240 10% 3.9%)`) anchored by a single high-contrast electric sky accent (`#00f0ff` / `hsl(190 100% 55%)`) and subtle violet/emerald status accents. No chaotic neon gradients.
* **Frosted Glass Materiality:** Ultra-crisp blur (`backdrop-filter: blur(24px) saturate(180%)`), fine 1px translucent border (`rgba(255, 255, 255, 0.08)`), and top-edge specular highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.12)`).
* **Tactile Micro-Interactions:** Universal interactive tactile feedback (`:active { transform: scale(0.98); }`), silky cubic-bezier transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), and smooth spring physics.
* **3D Stage Preservation:** Zero changes to 3D meshes (Siya avatar, 3D office room, executive chair, lighting, or skeletal animations).

---

## 2. Color Palette & Tokens

### 2.1 Dynamic Theme Seed Anchors
* `--hue-a`: `190` (Primary Accent — Electric Sky / Cyan)
* `--hue-b`: `270` (Secondary Accent — Deep Iris / Violet)

### 2.2 Core Palette Tokens

| Token | CSS Variable | Hex / HSL Equivalent | Role & Usage |
| :--- | :--- | :--- | :--- |
| **Primary Accent** | `--accent` | `hsl(190 100% 55%)` (`#00e5ff`) | Primary call-to-action, active highlights, focus rings |
| **Primary Soft** | `--accent-soft` | `hsl(190 100% 55% / 0.12)` | Button hover fills, subtle badge backgrounds |
| **Primary Line** | `--accent-line` | `hsl(190 100% 65% / 0.36)` | Active borders, glowing separators |
| **Primary Glow** | `--accent-glow` | `hsl(190 100% 55% / 0.28)` | Elevation halos, focus rim glow |
| **Secondary Accent** | `--accent-2` | `hsl(270 95% 68%)` (`#a855f7`) | Secondary highlights, discovery modes |
| **Secondary Soft** | `--accent-2-soft` | `hsl(270 95% 68% / 0.12)` | Secondary badge fills, chip backgrounds |
| **Secondary Glow** | `--accent-2-glow` | `hsl(270 95% 65% / 0.25)` | Ambient highlights |

### 2.3 Substrate & Neutral Backgrounds

| Token | CSS Variable | Value | Role |
| :--- | :--- | :--- | :--- |
| **Deep Void (Base 0)** | `--bg-0` | `hsl(240 10% 3.9%)` (`#09090b`) | Master canvas background, page substrate |
| **Substrate 1** | `--bg-1` | `hsl(240 6% 7%)` (`#111113`) | Drawer panels, modals, backdrop card |
| **Substrate 2** | `--bg-2` | `hsl(240 5% 10%)` (`#18181b`) | Inset cards, editor surfaces, active panels |
| **Substrate 3** | `--bg-3` | `hsl(240 4% 14%)` (`#222226`) | Elevated dialogs, toolbars |

### 2.4 Glassmorphism Tokens

| Token | CSS Variable | Value | Role |
| :--- | :--- | :--- | :--- |
| **Glass Base** | `--glass-bg` | `hsl(240 8% 9% / 0.68)` | Topbar, floating dock, drawer containers |
| **Glass Subtle** | `--glass-bg-2` | `hsl(240 8% 12% / 0.45)` | Nested cards, suggestions bar |
| **Glass Border** | `--glass-brd` | `hsl(0 0% 100% / 0.08)` | Standard card borders |
| **Glass Border Highlight**| `--glass-brd-hi`| `hsl(0 0% 100% / 0.16)` | Active card outlines, hovered buttons |
| **Glass Blur** | `--glass-blur` | `24px` | Background blur filter (`backdrop-filter`) |
| **Glass Shadow** | `--glass-shadow` | `0 24px 60px -18px hsl(0 0% 0% / 0.75), inset 0 1px 0 hsl(0 0% 100% / 0.12)` | Deep atmospheric elevation shadow |

### 2.5 Typography Ink Colors

| Token | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| **Ink 1 (Pure Text)** | `--ink` | `hsl(210 40% 98%)` (`#f8fafc`) | Primary titles, active labels, head copy |
| **Ink 2 (Body Text)** | `--ink-2` | `hsl(215 20% 80%)` (`#cbd5e1`) | Descriptions, chat messages, body copy |
| **Ink 3 (Muted Text)**| `--ink-3` | `hsl(215 14% 60%)` (`#94a3b8`) | Captions, hints, timestamps, inactive chips |
| **Ink 4 (Disabled)** | `--ink-4` | `hsl(215 12% 42%)` (`#64748b`) | Placeholders, subtle borders, inactive icons |

### 2.6 Status & Feedback Colors

| Status | CSS Token | Hex / HSL | Usage |
| :--- | :--- | :--- | :--- |
| **Success** | `--ok` | `hsl(152 76% 50%)` (`#10b981`) | Passing tests, ATS score >= 80%, verified badges |
| **Warning** | `--warn` | `hsl(38 96% 55%)` (`#f59e0b`) | Needs improvement, step reminder, pacing warnings |
| **Error / Critical** | `--err` | `hsl(354 86% 60%)` (`#ef4444`) | Failing test cases, validation errors, mic alert |

---

## 3. Typography Scale & Standards

### 3.1 Font Families
* **UI & Body Font (`--font-ui`):** `'Plus Jakarta Sans'`, `'Outfit'`, -apple-system, BlinkMacSystemFont, sans-serif
* **Display & Technical Font (`--font-dsp`):** `'Space Grotesk'`, `'Plus Jakarta Sans'`, sans-serif
* **Code / Monospace (`--font-code`):** `'JetBrains Mono'`, `'Fira Code'`, monospace

### 3.2 Typography Scale

| Style Level | Font Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display XL** | Space Grotesk | `32px` (`2rem`) | 700 | 1.15 | `-0.02em` | Loader brand, Arena results title |
| **Display LG** | Space Grotesk | `24px` (`1.5rem`) | 700 | 1.2 | `-0.015em`| Drawer titles, major section headers |
| **Heading 1** | Plus Jakarta Sans | `20px` (`1.25rem`)| 600 | 1.3 | `-0.01em` | Modal headers, feature card titles |
| **Heading 2** | Plus Jakarta Sans | `16px` (`1.0rem`) | 600 | 1.35 | `0em` | Card titles, subsection headings |
| **Subhead** | Plus Jakarta Sans | `14px` (`0.875rem`)| 500 | 1.4 | `0.01em` | Metadata titles, user profile handles |
| **Body Regular**| Plus Jakarta Sans | `13.5px` (`0.84rem`)| 400 | 1.55 | `0.01em` | Chat messages, narrative descriptions |
| **Body Small** | Plus Jakarta Sans | `12px` (`0.75rem`)| 400 | 1.45 | `0.015em` | Footnotes, helper hints, sub-labels |
| **Label / Tag** | Space Grotesk | `10px` (`0.625rem`)| 700 | 1.2 | `0.10em` | Uppercase badges, category chips, status |
| **Mono Code** | JetBrains Mono| `12px` (`0.75rem`)| 400 | 1.5 | `0em` | Code editors, API endpoints, benchmarks |

---

## 4. Spacing, Geometry & Radii

### 4.1 Corner Roundness Tokens (`--r-*`)
* `--r-xs`: `6px` — Micro tags, code inline blocks
* `--r-sm`: `10px` — Small chips, input controls, small icon buttons
* `--r-md`: `14px` — Bento cards, suggestions, message bubbles, alert boxes
* `--r-lg`: `18px` — Slide-out drawers, settings panel, dialogs
* `--r-xl`: `24px` — Topbar wrapper, modal containers
* `--r-pill`: `999px` — Action pills, search chips, status tags, avatars

---

## 5. Component Specifications

### 5.1 Topbar Navigation
* **Structure:** Fixed floating header, `height: 60px`, `backdrop-filter: blur(24px)`.
* **Left:** Brand logo with glowing emerald/cyan animated orb and title `SIYA · 3D AI Career Guidance Mentor`.
* **Right:** User auth chip, AI model status badge (`Gemini 2.5 Flash`), operational state chip (`Idle / Speaking / Listening / Thinking`), settings button, and fullscreen trigger.

### 5.2 Floating Dock
* **Position:** Fixed bottom center, pill geometry (`border-radius: 999px`), frosted glass styling.
* **Items:** Expression Editor (`Face`), Resume Intelligence (`Resume`), Mock Interview Arena (`Interview`), Career Discovery (`Discovery`), Chat (`Chat`).
* **Active State:** Glowing gradient background (`--accent-soft`), primary border highlight.

### 5.3 Bento Introduction & Message Cards
* **Geometry:** `border-radius: 16px`, `padding: 14px 16px`.
* **Top Accent:** 3px animated multi-color neon gradient bar (`#00e5ff` → `#a855f7` → `#10b981`).
* **Badge:** Pulsing status dot + uppercase label `3D AI CAREER GUIDANCE MENTOR · ACTIVE`.
* **Features Grid:** 2-column Bento grid highlighting key capabilities (Mock Interviews, Resume Intelligence, Career Discovery, 3D Voice).
* **Action Pills:** Primary accented chip buttons with tactile push feedback (`:active { transform: scale(0.98); }`).

### 5.4 Voice HUD
* **Layout:** Top-centered floating pill with animated audio visualizer wave.
* **States:** Live listening indicator, real-time interim speech transcription, and *Done* / *Cancel* controls.

### 5.5 Mock Interview Arena
* **Layout:** Split-pane IDE interface with technical problem statement, constraints, code editor with line numbers, live test-case runner, webcam verification PIP, voice answer toggle, and instant AI grading report.

---

## 6. Motion & Tactile Feedback Rules

* **Tactile Buttons:** `:active { transform: scale(0.98); transition: transform 0.08s cubic-bezier(0.16, 1, 0.3, 1); }`.
* **Hover Transitions:** All interactive elements feature smooth transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).
* **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, all transitions and animations instantly resolve in `0.001ms`.

---

## 7. Stitch MCP Machine-Readable Spec

```json
{
  "displayName": "SIYA Neural Obsidian Glass",
  "theme": {
    "colorMode": "DARK",
    "colorVariant": "FIDELITY",
    "customColor": "#00e5ff",
    "overridePrimaryColor": "#00e5ff",
    "overrideSecondaryColor": "#a855f7",
    "overrideTertiaryColor": "#10b981",
    "overrideNeutralColor": "#09090b",
    "bodyFont": "PLUS_JAKARTA_SANS",
    "headlineFont": "SPACE_GROTESK",
    "labelFont": "SPACE_GROTESK",
    "roundness": "ROUND_SIXTEEN"
  }
}
```
