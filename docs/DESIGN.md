# Warmly — Design System

> **Brand:** Warmly. Editorial, warm, deliberate. Reads like a luxury notebook, not a SaaS dashboard.
>
> **Reference:** Full HTML/CSS source of truth lives in `docs/design/v2/project/src/styles.css`. When in doubt, read the reference.

## Aesthetic

Warm bone canvas with cream/sienna accents. Typography drives personality: Instrument Serif italic for display moments (the wordmark, page titles, AI quotes), Geist sans for everything else. Surfaces barely exist — multi-layered shadows at sub-0.1 opacity create depth without weight. The feel is editorial, confident, considered — like a high-end personal CRM, not a generic SaaS.

## Color Palette (OKLch)

All colors use OKLch for perceptual uniformity. Tokens are exposed as CSS variables in `src/app/globals.css` and as Tailwind utility classes via `@theme`.

### Surfaces (warm bone palette — default)
- `--bg` `oklch(0.985 0.006 75)` — canvas
- `--bg-sunk` `oklch(0.965 0.008 75)` — secondary backgrounds
- `--surface` `oklch(1 0 0)` — elevated cards
- `--surface-2` `oklch(0.975 0.006 75)` — hover/sunken inserts
- `--line` `oklch(0.91 0.008 70)` — primary borders
- `--line-soft` `oklch(0.945 0.006 70)` — subtle dividers

### Ink scale (warm neutrals)
- `--ink` `oklch(0.22 0.012 60)` — primary text, headings
- `--ink-2` `oklch(0.38 0.012 60)` — body text
- `--ink-3` `oklch(0.55 0.012 60)` — secondary labels
- `--ink-4` `oklch(0.68 0.010 60)` — metadata, timestamps

### Accent (cream/sienna)
- `--accent` `oklch(0.60 0.13 45)` — primary accent (cream/tan)
- `--accent-soft` `oklch(0.94 0.035 55)` — accent backgrounds (selection, soft highlights)
- `--accent-ink` `oklch(0.38 0.10 45)` — accent foreground for soft accent backgrounds

### Status
- `--good` `oklch(0.62 0.09 155)` — success, healthy relationships
- `--warn` `oklch(0.72 0.11 75)` — warning, going stale
- `--bad` `oklch(0.60 0.13 30)` — danger, gone cold
- `--mute` `oklch(0.75 0.008 60)` — neutral, undefined

### Sidebar (dark variant)
The sidebar shell remains dark for contrast against the warm canvas. Tokens: `--sidebar-bg`, `--sidebar-line`, `--sidebar-ink`, `--sidebar-ink-2`, `--sidebar-ink-3`.

### Future palette swaps
The CSS supports `[data-palette="cream|taupe|bone|peach"]` on `<html>` for live palette swaps. Default is cream. We do not ship the Tweaks panel in production — it's a designer-only tool living in `docs/design/v2/`.

## Typography

### Stack
- **Display** (`--font-display`): Instrument Serif → Cormorant Garamond → Georgia
- **UI** (`--font-ui`, default `font-sans`): Geist → system stack
- **Mono** (`--font-mono`): Geist Mono → ui-monospace

Italic Instrument Serif is the brand voice. It carries the **Warmly** wordmark, all top-level page titles, contact names on the detail hero, and AI-quoted "hook" moments.

### Scale (rough — let context guide exact sizes)
- Display headings: 22–26px, italic, letter-spacing -0.01em
- Page titles (H1): 22px, semibold, sans
- Section headings (H3): 13–14px, semibold, uppercase tracking 0.08em (for `kicker`-style labels)
- Body: 13–14px, sans
- Metadata / micro: 10.5–12px, sans, `--ink-3` or `--ink-4`

### Discipline
- **Reserve serif italic for display only.** Never set body copy in serif — it's expensive on load and loses impact when overused.
- **Avoid all-caps in body text.** Use uppercase only for tracked-out section labels (10.5px, letter-spacing 0.12em).

## Spacing scale

`--space-1` through `--space-8`: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 px.

Use Tailwind's spacing utilities (`p-3`, `gap-4`, etc.) — they map to the same scale.

## Radii

- `--radius-sm` 6px — chips, dots, pills
- `--radius` 10px — buttons, cards, inputs
- `--radius-lg` 14px — large cards, modals

## Shadows

Three layers, all subtle:
- `--shadow-1` — card edge (`0 1px 0`)
- `--shadow-2` — resting card (used as `.shadow-soft`)
- `--shadow-3` — elevated card / drawer (used as `.shadow-medium`)

Heavy drop shadows are forbidden. Whisper-thin or nothing.

## Borders

1px `var(--line)` for primary divisions, 1px `var(--line-soft)` for subtle dividers. Inset borders via `box-shadow: inset 0 0 0 1px var(--line)` are the cleanest pattern (no layout shift).

## Animations

- `slideUp` — message entry, 200ms ease-out
- `fadeIn` — page transitions, 250ms ease-out
- `drawerSlideIn` — right-side drawer, 200ms cubic-bezier(0.4, 0, 0.2, 1)
- `skeletonPulse` — loading shimmer, 1.8s
- Hover lift on cards/buttons: 1px translateY, 120–160ms transition

## Component patterns

### Hook block
The signature pattern. Used for AI-quoted insights ("why this person · why now").
- Left border 2px `var(--accent)`
- 16px left padding
- Italic Instrument Serif body, 20px
- 10.5px tracked-out uppercase label above, in `--ink-3`

CSS classes: `.hook-block`, `.hook-block__label`, `.hook-block__body` (defined in `globals.css`).

### Stage track
5 horizontal nodes connected by lines: Discovered → Contacted → Connected → Met → Ongoing. Filled circles for done, accent ring for current, hollow for upcoming.

### Timeline
Career history and education as left-bordered columns with offset dots per item. First item is "current" (accent dot, fuller text). Subsequent items collapse to a faded one-line summary unless expanded.

### Artifact card → Drawer
Artifacts in chat appear as compact cards (single-letter type icon, label, title, preview, "Open in full ↗"). Clicking opens a right-side slide-in drawer (`.animate-drawer-in`) with the full content, edit mode, and a primary "Use this" action.

### Quick-action chips
Inline pill buttons above the chat send area: "Prep a meeting", "Paste LinkedIn", "Run discovery". 11px sans, `surface-2` background, `line-soft` inset border.

### Inline confirm
For destructive actions (delete session), the trash icon is replaced inline with `Cancel | Delete` buttons rather than a modal. Less interruptive.

## Iconography

Minimal stroke icons, 1.5px stroke, 24×24 viewBox. No fills, no shadows. The full set lives in `docs/design/v2/project/src/atoms.jsx` (Icon component). Port icons inline as needed — don't pull in an icon library.

## What we do NOT ship

- **Tweaks panel** — designer iteration tool. Stays in `docs/design/v2/`.
- **Type Lab view** — design exploration only. Not in nav, not routed.
- **⌘K Quick find** — placeholder in design, deferred to v2 of the product.
- **Multiple palette/density swaps** — cream + balanced is the production preset.

## Reference

The complete source-of-truth design lives at:
- `docs/design/v2/project/src/styles.css` — all CSS tokens and component styles
- `docs/design/v2/project/src/*.jsx` — view-by-view React-style mockups
- `docs/design/v2/project/screenshots/` — design iteration screenshots

When implementing a component, **read the matching `.jsx` file first**. The mockups encode interaction patterns (drawer slide-in, inline confirm, expand/collapse toggles) that aren't visible from screenshots alone.
