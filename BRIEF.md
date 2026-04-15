# Task: Build `html-ppt` AgentSkill

You are a world-class PPT/presentation designer. Build an AgentSkill named **`html-ppt`** (a.k.a. "HTML PPT Studio") that lets an agent produce professional HTML presentations in many styles, layouts, and animations — all driven by templates.

## Deliverables

A single skill directory at the current repo root (`~/clawspace/html-ppt-skill`), structured per the AgentSkills spec (consult the `skill-creator` skill at `~/Library/pnpm/global/5/.pnpm/openclaw@2026.4.1_@napi-rs+canvas@0.1.97/node_modules/openclaw/skills/skill-creator/SKILL.md` FIRST and follow it).

Must produce:

```
html-ppt/
  SKILL.md                         # concise dispatcher + usage rules
  references/
    themes.md                      # every theme catalog + when to use
    layouts.md                     # every page-layout catalog
    animations.md                  # every animation catalog with names
    authoring-guide.md             # how the agent authors a new deck
  assets/
    themes/                        # one CSS file per theme (see list below)
    layouts/                       # one HTML partial per layout type
    animations/                    # CSS/JS snippets per animation
    fonts.css                      # shared webfont imports
    base.css                       # reset + shared tokens
    runtime.js                     # keyboard nav, presenter mode, theme switcher
  templates/
    deck.html                      # main multi-slide deck template (reveal-like, keyboard nav)
    theme-showcase.html            # single deck that demos EVERY theme (slide per theme)
    animation-showcase.html        # single deck that demos EVERY animation (named)
    layout-showcase.html           # single deck that demos EVERY layout type
    single-page/                   # one-slide templates per layout, with demo data
      cover.html
      toc.html
      section-divider.html
      bullets.html
      two-column.html
      three-column.html
      big-quote.html
      stat-highlight.html
      kpi-grid.html
      table.html
      code.html
      diff.html
      terminal.html
      flow-diagram.html
      timeline.html
      roadmap.html
      mindmap.html
      comparison.html
      pros-cons.html
      todo-checklist.html
      gantt.html
      image-hero.html
      image-grid.html
      chart-bar.html
      chart-line.html
      chart-pie.html
      chart-radar.html
      arch-diagram.html
      process-steps.html
      cta.html
      thanks.html
  scripts/
    render.sh                      # headless chrome render a template to PNGs (uses /Applications/Google Chrome.app)
    new-deck.sh                    # scaffold new deck from templates/deck.html
  examples/
    demo-deck/                     # a complete working deck using several layouts + a chosen theme
  README.md                        # repo-level overview (separate from SKILL.md)
  LICENSE                          # MIT, author: lewis <sudolewis@gmail.com>
```

## Requirement detail

### 1. Themes (give each a clear name + description)

Cover AT LEAST these, each a separate CSS file in `assets/themes/`:

- `minimal-white`        — 极简白，克制高级
- `editorial-serif`      — 杂志风衬线，高级
- `soft-pastel`          — 柔和马卡龙
- `sharp-mono`           — 锐利黑白高对比
- `arctic-cool`          — 冷色调（蓝/青/石板灰）
- `sunset-warm`          — 暖色调（橘/珊瑚/琥珀）
- `catppuccin-latte`     — catppuccin 浅
- `catppuccin-mocha`     — catppuccin 深
- `dracula`              — dracula 深色
- `tokyo-night`
- `nord`
- `solarized-light`
- `gruvbox-dark`
- `rose-pine`
- `neo-brutalism`        — 厚描边、硬阴影、明黄
- `glassmorphism`        — 毛玻璃
- `bauhaus`              — 几何+原色
- `swiss-grid`           — 瑞士网格、Helvetica 感
- `terminal-green`       — 绿屏终端
- `xiaohongshu-white`    — 小红书白底高级感
- `rainbow-gradient`     — 彩虹渐变点缀（白底）
- `aurora`               — 极光渐变
- `blueprint`            — 蓝图工程
- `memphis-pop`          — 孟菲斯波普

Each theme defines CSS custom properties (color tokens, fonts, radii, shadows, accent gradients) consumed by `base.css` and every layout. Switching themes = swap one `<link>` or one `data-theme` attribute.

### 2. Layouts / page types

Must cover: cover, table of contents, section divider, bullets, two-column, three-column, big quote, stat highlight, KPI grid, table (data), code block (syntax-highlighted, use highlight.js via CDN), diff view, terminal/console, flowchart, timeline, roadmap, mindmap, comparison, pros/cons, TODO checklist, gantt, image hero, image grid, chart (bar/line/pie/radar — use chart.js via CDN), architecture diagram, process steps, CTA, thanks. One file per layout in `templates/single-page/` with realistic demo data so it's usable standalone.

Extract typography/spacing/alignment patterns from the existing decks at `/Volumes/luluDrive/作品素材/视频/**/*.html` (especially `20260409-升级版知识库/presentation.html`, `20260413-graphify/ppt/graphify.html`, `20260414-hermes-agent/ppt/*.html`, and the 小红书图文 folders). Do NOT copy content; extract typographic rhythm, spacing, gradient treatments, card patterns, footer patterns.

### 3. Animations (each named, listed in `references/animations.md`)

Provide CSS + (where needed) minimal JS (no heavy deps). Each animation should be applied by adding a class like `data-anim="rise-in"` or `class="anim-rise-in"`. At least:

- `fade-up`, `fade-down`, `fade-left`, `fade-right`
- `rise-in`, `drop-in`, `zoom-pop`, `blur-in`, `glitch-in`
- `typewriter`
- `neon-glow`, `shimmer-sweep`, `gradient-flow`
- `stagger-list` (children appear one by one)
- `counter-up` (numbers tick up)
- `path-draw` (SVG line draw)
- `parallax-tilt` (3D on hover/enter)
- `card-flip-3d`
- `cube-rotate-3d`
- `page-turn-3d`
- `perspective-zoom`
- `marquee-scroll`
- `kenburns`
- `confetti-burst` (on slide enter)
- `spotlight` (radial reveal)
- `morph-shape` (SVG morph)
- `ripple-reveal`

Give each a one-line description + recommended use case.

### 4. Runtime

`assets/runtime.js` must support:

- ← → / space / PgUp PgDn / Home End navigation
- `F` fullscreen, `S` speaker notes overlay, `O` slide overview grid
- `T` cycle themes (reads all theme CSS file names from a data attr)
- `A` cycle a demo animation on current slide
- URL hash `#/3` deep-link to slide 3
- Progress bar
- Works with zero build — pure static HTML/CSS/JS, CDN deps OK

### 5. Showcase decks

- `templates/theme-showcase.html` — one deck, one slide per theme, switchable via `T`. Each slide shows the theme name + a sample layout using that theme so user can eyeball it.
- `templates/animation-showcase.html` — one slide per animation, each auto-plays on enter, with the animation name and description visible.
- `templates/layout-showcase.html` — one slide per layout type with filled demo data.

### 6. Demo data

Everything should render with built-in demo data (fake KPIs, sample code, sample chart data, sample flow) so the user can open any template and immediately see it working.

### 7. SKILL.md rules

- Frontmatter: `name: html-ppt`, strong `description` with trigger keywords (presentation, PPT, slides, keynote, deck, 演讲稿, 幻灯片, reveal, html presentation, 小红书图文).
- Short body: when to use, how to start (`scripts/new-deck.sh <name>`), how to pick a theme, how to pick layouts, how to add animations, how to render to PNG (`scripts/render.sh <file>`).
- Link into `references/*.md` for detail; keep SKILL.md under ~200 lines.

### 8. render.sh

Use headless Chrome:
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 --screenshot=out.png "file://$PWD/$1"
```
Support multi-slide capture by navigating `#/N` or by extracting each `.slide` region.

### 9. Author & License

`LICENSE` = MIT, Copyright (c) 2026 lewis <sudolewis@gmail.com>. `README.md` header shows author lewis <sudolewis@gmail.com>.

## Process

1. FIRST read `~/Library/pnpm/global/5/.pnpm/openclaw@2026.4.1_@napi-rs+canvas@0.1.97/node_modules/openclaw/skills/skill-creator/SKILL.md` and follow its conventions.
2. Survey the source decks under `/Volumes/luluDrive/作品素材/视频/` (read-only, just for inspiration). Take notes on typography, spacing, card styles.
3. Build the skill directory described above. Prefer small, composable CSS token files. Keep each theme CSS short (< 200 lines) — just token overrides.
4. Make sure every template renders correctly in Chrome (you can test with `scripts/render.sh` on a few samples).
5. Write a concise SKILL.md + rich references/*.md.
6. Init git (already initialized in this dir), commit everything as author `lewis <sudolewis@gmail.com>`, with a good message.
7. DO NOT push or create the GitHub repo — the user's orchestrator will handle that.

## Constraints

- Pure static HTML/CSS/JS. CDN deps allowed: highlight.js, chart.js, a webfont loader. No build step.
- Target browser: Chrome / Chromium 120+.
- Chinese + English content both supported (import Noto Sans SC).
- Keep each file focused; avoid giant monoliths.
- Be opinionated and tasteful. You're a senior designer.

When COMPLETELY finished, run:
```
openclaw system event --text "Done: html-ppt skill built — $(ls templates/single-page | wc -l | tr -d ' ') layouts, $(ls assets/themes | wc -l | tr -d ' ') themes" --mode now
```
