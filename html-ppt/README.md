# html-ppt — HTML PPT Studio

Author: **lewis** &lt;sudolewis@gmail.com&gt;
License: MIT

A self-contained AgentSkill for producing professional HTML presentations
("slides", "decks", "keynotes", 演讲稿, 幻灯片) in many styles, layouts, and
animations — all driven by tasteful, hand-tuned templates.

- 24 themes (`assets/themes/*.css`)
- 30 page layouts (`templates/single-page/*.html`)
- 25 named animations (`assets/animations/animations.css`)
- Keyboard-driven runtime with presenter mode, theme cycling, overview grid
- Zero build: pure static HTML/CSS/JS, CDN deps only (Noto Sans SC, Inter,
  JetBrains Mono, highlight.js, chart.js)
- Showcase decks for every theme / layout / animation
- Headless-Chrome PNG renderer script

## Quick start

```bash
# scaffold a new deck
./scripts/new-deck.sh my-talk

# render a template to PNG
./scripts/render.sh templates/theme-showcase.html
```

Open `templates/theme-showcase.html` / `templates/layout-showcase.html` /
`templates/animation-showcase.html` in Chrome to browse the whole catalog.

See `SKILL.md` for the agent-facing usage guide and `references/` for the
full theme / layout / animation catalogs.
