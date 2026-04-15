# Animations catalog

All animations live in `assets/animations/animations.css`. Apply them by
adding `class="anim-<name>"` OR `data-anim="<name>"` to any element
(`runtime.js` re-triggers `data-anim` elements whenever a slide becomes
active, so you get the entry effect every time you navigate onto the slide).

Open `templates/animation-showcase.html` to browse all of them — one slide
per animation, auto-playing on slide enter. Press **A** on any slide to cycle
a random animation on the current page.

## Directional fades

| name | effect | use for |
|---|---|---|
| `fade-up` | Translate from +32 px, fade. | Default for paragraph + card entry. |
| `fade-down` | Translate from -32 px, fade. | Headers / banners / callouts. |
| `fade-left` | Translate from -40 px. | Left column in a two-column layout. |
| `fade-right` | Translate from +40 px. | Right column in a two-column layout. |

## Dramatic entries

| name | effect | use for |
|---|---|---|
| `rise-in` | +60 px rise + blur-off. | Slide titles, hero headlines. |
| `drop-in` | -60 px drop + slight scale. | Banners, alert bars. |
| `zoom-pop` | Scale 0.6 → 1.04 → 1. | Buttons, stat numbers, CTAs. |
| `blur-in` | 18 px blur clears. | Cover page reveal. |
| `glitch-in` | Clip-path steps + jitter. | Tech / cyber / error states. |

## Text effects

| name | effect | use for |
|---|---|---|
| `typewriter` | Monospace-like type reveal. | One-liners, slogans. |
| `neon-glow` | Cyclic text-shadow pulse. | Terminal-green / dracula themes. |
| `shimmer-sweep` | White sheen passes across. | Metallic buttons, premium cards. |
| `gradient-flow` | Infinite horizontal gradient slide. | Brand wordmarks. |

## Lists & numbers

| name | effect | use for |
|---|---|---|
| `stagger-list` | Children rise-in one-by-one. | Any `<ul>` or `.grid`. |
| `counter-up` | Number ticks 0 → target. | KPI, stat-highlight pages. |

Counter markup:
```html
<span class="counter" data-to="1248">0</span>
```

## SVG / geometry

| name | effect | use for |
|---|---|---|
| `path-draw` | Strokes draw themselves. | Lines, arrows, diagrams. |
| `morph-shape` | Path `d` morph. | Background shapes. |

Put `class="anim-path-draw"` on `<svg>`; every path/line/circle inside gets drawn.

## 3D & perspective

| name | effect | use for |
|---|---|---|
| `parallax-tilt` | Hover → 3D tilt. | Hero cards, product shots. |
| `card-flip-3d` | Y-axis 90° flip. | Before/after reveal. |
| `cube-rotate-3d` | Rotate in from a cube side. | Section dividers. |
| `page-turn-3d` | Left-hinge page turn. | Editorial / story flows. |
| `perspective-zoom` | Pull from -400 Z. | Cover openings. |

## Ambient / continuous

| name | effect | use for |
|---|---|---|
| `marquee-scroll` | Infinite horizontal loop. | Client logo strips. |
| `kenburns` | 14 s slow zoom on images. | Hero backgrounds. |
| `confetti-burst` | Pseudo-element sparkle burst. | Thanks / win pages. |
| `spotlight` | Circular clip-path reveal. | Big reveal moments. |
| `ripple-reveal` | Corner-origin ripple reveal. | Section transitions. |

## Respecting motion preferences

All animations are disabled automatically when
`prefers-reduced-motion: reduce` is set. Do not override this.

## Tips

- Prefer `data-anim="..."` over `class="anim-..."` so that the runtime
  re-triggers the animation whenever the slide becomes active.
- Use at most 1-2 distinct animation types on a single slide. Mixing 5 looks
  messy.
- Stagger lists + a single hero entry = clean rhythm.
- For counter-up, pair with `stat-highlight.html` or `kpi-grid.html`.
