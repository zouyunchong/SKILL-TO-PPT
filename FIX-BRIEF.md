# Fix Brief · html-ppt v2

User feedback: current skill is weak. Fix these four problems HARD. Do not hand-wave.

Skill lives at `~/clawspace/html-ppt-skill`. Git is already initialized, SKILL.md + assets already exist. This is an **iteration**, keep what works, replace what's weak.

## Problem 1 — Theme showcase shows identical pages

Root cause: `templates/theme-showcase.html` builds 24 slides but they all inherit one `<link id="theme-link">`. When you arrow-through, every slide looks the same.

Fix: Each slide in theme-showcase must render **its own theme in isolation**. Do this with an **`<iframe srcdoc>` per slide**, where the iframe loads `assets/base.css` + the specific theme CSS + a small demo content block. That way slide N = theme N, guaranteed visually different. Rebuild the showcase so pressing → actually shows a new look each time. Do the same for any other "all themes in one deck" pattern.

Verify with headless chrome: render slide 1, slide 5, slide 12, slide 20 to PNG and confirm they look different.

## Problem 2 — Did not absorb user's existing deck styles

**REQUIRED**: deeply survey these decks, extract 6–10 distinct "full deck looks" and turn each into a named **full-deck template** under `templates/full-decks/<name>/index.html` with scoped CSS + demo content:

Sources (read-only, DO NOT copy content, extract style):

- `/Volumes/luluDrive/作品素材/视频/20260405-Karpathy-知识库/20260405 演示幻灯片【方向键版】.html`
- `/Volumes/luluDrive/作品素材/视频/20260405-Karpathy-知识库/20260405 架构图v2.html`
- `/Volumes/luluDrive/作品素材/视频/20260406-obsidian-claude/slides.html`
- `/Volumes/luluDrive/作品素材/视频/20260409-升级版知识库/presentation.html`
- `/Volumes/luluDrive/作品素材/视频/20260409-升级版知识库/小红书图文/v2-白底版/html源文件/slide_01_cover.html` (+ others in same dir)
- `/Volumes/luluDrive/作品素材/视频/20260412-AI测试与安全/html/xhs-ai-testing-safety-v2.html`
- `/Volumes/luluDrive/作品素材/视频/20260412-obsidian-skills/html/xhs-obsidian-skills.html`
- `/Volumes/luluDrive/作品素材/视频/20260413-graphify/ppt/graphify.html`
- `/Volumes/luluDrive/作品素材/视频/20260413-graphify/小红书图文/*.html`
- `/Volumes/luluDrive/作品素材/视频/20260414-hermes-agent/ppt/hermes-vs-openclaw.html`
- `/Volumes/luluDrive/作品素材/视频/20260414-hermes-agent/ppt/hermes-record.html`
- `/Volumes/luluDrive/作品素材/视频/20260414-hermes-agent/小红书图文/*.html`

For each, extract: background treatment, gradient usage, font pairing, card style, accent color, hero typography scale, footer pattern. Turn the strongest 8+ into **full-deck templates**, each a complete multi-slide deck with cover / section / content / code / chart / CTA / thanks. Give each a distinctive name and register it in `references/full-decks.md`. Suggested names (rename as you see fit after surveying):

- `xhs-white-editorial` — 小红书白底杂志风 (from 20260409 v2-白底版 + 20260412 xhs)
- `graphify-dark-graph` — 暗底 + 力导向知识图谱 (from 20260413 graphify)
- `knowledge-arch-blueprint` — 蓝图/架构图风 (from Karpathy 架构图v2)
- `hermes-cyber-terminal` — 终端/cyber (from hermes-record + hermes-vs-openclaw)
- `obsidian-claude-gradient` — 紫色渐变卡 (from 20260406)
- `testing-safety-alert` — 红/琥珀警示风 (from 20260412-AI测试与安全)
- `xhs-pastel-card` — 柔和马卡龙图文 (from several xhs decks)
- `dir-key-nav-minimal` — 方向键极简 (from Karpathy 方向键版)

Each full-deck template must be a SELF-CONTAINED folder under `templates/full-decks/<name>/` with `index.html`, `style.css` (scoped with `.tpl-<name>` prefix so two templates don't collide), optional `script.js`, and a README snippet describing the look.

## Problem 3 — Animations are too thin, all single-element

Current animations are mostly one-element CSS transitions. User wants **multi-element, particle, explosion, knowledge-graph** energy. Add a new layer:

Create `assets/animations/fx/` with each effect as a self-contained JS module (each has a `init(el, opts)` function). Each effect must work by adding `data-fx="<name>"` to a container. Runtime auto-inits on slide enter.

Mandatory effect set (all must be implemented, not stubs):

- **particle-burst** — canvas particles exploding from a point
- **confetti-cannon** — multi-directional confetti (colored rects + rotation)
- **firework** — rocket + explosion particles, loops
- **starfield** — scrolling starfield background
- **matrix-rain** — Matrix-style falling chars
- **knowledge-graph** — canvas force-directed graph (20-40 nodes, labeled edges, animated physics)
- **neural-net** — feedforward network with pulse signals traveling along edges
- **constellation** — points connected by lines when close (classic particles.js vibe)
- **orbit-ring** — concentric orbital dots, each at different speed
- **galaxy-swirl** — spiral particle galaxy
- **word-cascade** — words from a list rain down + pile up
- **letter-explode** — heading letters fly in from random directions
- **chain-react** — row of cards trigger each other domino-style
- **magnetic-field** — particles following an invisible magnetic curve
- **data-stream** — rows of scrolling numeric/hex data (cyber feel)
- **gradient-blob** — big blurred blobs morphing with SVG feTurbulence
- **sparkle-trail** — cursor trail of sparkles (slide-scoped)
- **shockwave** — expanding ring on slide enter
- **typewriter-multi** — multi-line typewriter with blinking cursors
- **counter-explosion** — stat counter that then bursts particles when it finishes

Plus keep the existing CSS anim set. Document each in `references/animations.md` with name + use case + how to enable (`data-fx="..."`).

Create `templates/animation-showcase.html` v2: one slide per effect (CSS + FX), each clearly labeled, auto-plays on enter, with a replay button.

## Problem 4 — Not enough themes / templates overall

Add these additional themes (each a CSS token file + verifiable distinct look):

- `cyberpunk-neon` — 黑底 + 霓虹粉/青/黄
- `y2k-chrome` — Y2K 镜面 + 渐变
- `retro-tv` — CRT 扫描线 + 暖黄
- `japanese-minimal` — 和风留白 + 朱红
- `vaporwave` — 蒸汽波粉紫
- `midcentury` — 中世纪现代 (mustard/teal/cream)
- `corporate-clean` — 企业 PPT 商务
- `academic-paper` — 学术白皮书 (Computer Modern)
- `news-broadcast` — 红白新闻图
- `pitch-deck-vc` — YC 风格投资路演
- `magazine-bold` — 杂志大字封面
- `engineering-whiteprint` — 白底蓝线工程图

Plus: add **full-deck templates** (beyond the 8 extracted above) for common scenarios:

- `pitch-deck` (problem → solution → market → traction → team → ask)
- `product-launch`
- `tech-sharing` (技术分享)
- `weekly-report`
- `xhs-post` (9-slide 小红书图文, 3:4)
- `course-module` (教学模块)

Each in `templates/full-decks/<name>/` with scoped CSS.

## Integration

- Update `SKILL.md` to list every theme, full-deck template, and fx animation with one-liners and trigger intent. Keep SKILL.md tight (<250 lines); long lists go in `references/`.
- Update `references/themes.md`, `references/animations.md`, and add `references/full-decks.md`.
- Update `templates/theme-showcase.html`, `templates/animation-showcase.html`, `templates/layout-showcase.html` to actually demonstrate the richer set. Theme showcase MUST use iframe isolation.
- Add `templates/full-decks-index.html` — a gallery deck where each slide is a live thumbnail (iframe) of a full-deck template so user can browse them.
- Verify with headless Chrome: render 6 representative slides from theme-showcase, 6 from animation-showcase (as PNGs under `scripts/verify-output/`) and confirm they look visibly different. Include this check in the final commit.

## Process

1. FIRST read the existing skill and figure out what to keep vs replace.
2. Survey the source decks (read only a handful of bytes per file — use head/grep). Do not try to load all of them at once.
3. Implement Problem 1 fix (iframe isolation) first and verify with headless chrome before moving on.
4. Then Problem 3 (FX animations) — each as its own file under `assets/animations/fx/<name>.js`. Write a tiny `fx-runtime.js` that scans `[data-fx]` on slide enter and calls the right `init`.
5. Then Problem 2 (full-deck templates extracted from videos) and Problem 4 (more themes + scenario templates).
6. Update docs + showcases.
7. Verify: run `scripts/render.sh` against the three showcases, dump PNGs, eyeball them (save to `scripts/verify-output/`).
8. Commit as author `lewis <sudolewis@gmail.com>` with message `fix: v2 — iframe theme isolation, 8 full-deck templates from source decks, 20 FX animations (particles/graph/fireworks), +12 themes`.
9. DO NOT push — orchestrator will push.

When COMPLETELY finished, run:

```
openclaw system event --text "Done: html-ppt v2 — $(ls templates/full-decks 2>/dev/null | wc -l | tr -d ' ') full decks, $(ls assets/themes | wc -l | tr -d ' ') themes, $(ls assets/animations/fx 2>/dev/null | wc -l | tr -d ' ') FX" --mode now
```

## Rules

- Be a senior designer. If something looks boring, fix it.
- Scoped CSS per full-deck template (`.tpl-<name> …`) so loading many in one page doesn't conflict.
- Pure static, CDN deps ok (chart.js, highlight.js, canvas-confetti optional but prefer hand-rolled canvas for the FX so they're learnable).
- Chinese + English both render cleanly (Noto Sans SC / Noto Serif SC imported in `assets/fonts.css`).
- Make the theme-showcase actually differ slide by slide. This is the one test I will run first.
