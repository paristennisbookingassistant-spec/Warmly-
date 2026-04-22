# AI Networking Coach — Design System

## Inspired by: ElevenLabs (restrained elegance, warm minimalism)

## Visual Theme
Near-white canvas with warm undertones. Surfaces barely exist — multi-layered shadows at sub-0.1 opacity create depth without weight. Typography does the heavy lifting. The feel is premium, confident, spacious — like a high-end CRM, not a dashboard.

## Color Palette

### Surfaces
- **Canvas:** `#fafafa` — primary background
- **Card:** `#ffffff` — elevated surfaces
- **Warm Stone:** `rgba(245, 242, 239, 0.8)` — subtle warm tint for secondary surfaces
- **Sidebar:** `#111111` — near-black sidebar

### Text
- **Primary:** `#171717` — headings, names
- **Secondary:** `#525252` — body text, descriptions
- **Tertiary:** `#a3a3a3` — metadata, timestamps, muted labels

### Interactive
- **Accent:** `#2563eb` — links, active states, primary buttons
- **Accent Hover:** `#1d4ed8` — hover state
- **Success:** `#059669` — completed, positive
- **Warning:** `#d97706` — attention, in-progress
- **Danger:** `#dc2626` — errors, destructive

### Borders & Shadows
- **Border Subtle:** `rgba(0, 0, 0, 0.06)` — card borders, dividers
- **Border Medium:** `rgba(0, 0, 0, 0.1)` — inputs, stronger separation
- **Shadow Soft:** `0 1px 2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04)` — cards
- **Shadow Medium:** `0 4px 12px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)` — modals, dropdowns
- **Shadow Warm:** `0 4px 16px rgba(78, 50, 23, 0.04)` — warm accent shadow for CTAs

## Typography

### Font Stack
- **Display/Body:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- **Mono:** "Geist Mono", ui-monospace, SFMono-Regular, monospace

### Scale
| Role | Size | Weight | Letter Spacing | Line Height |
|------|------|--------|----------------|-------------|
| Display | 28px | 600 | -0.8px | 1.15 |
| Heading 1 | 22px | 600 | -0.5px | 1.2 |
| Heading 2 | 18px | 600 | -0.3px | 1.3 |
| Heading 3 | 15px | 600 | normal | 1.4 |
| Body | 14px | 400 | 0.1px | 1.6 |
| Body Medium | 14px | 500 | 0.1px | 1.6 |
| Caption | 13px | 400 | 0.1px | 1.5 |
| Micro | 11px | 500 | 0.3px | 1.3 |

## Component Patterns

### Buttons
- **Primary:** bg `#171717`, text white, rounded-full (pill), px-5 py-2
- **Secondary:** bg white, text `#171717`, border `rgba(0,0,0,0.1)`, shadow-soft, rounded-full
- **Ghost:** bg transparent, text `#525252`, hover bg `rgba(0,0,0,0.04)`, rounded-lg
- **Danger:** bg white, text `#dc2626`, border `rgba(220,38,38,0.2)`, hover bg `#fef2f2`
- **All buttons:** transition-all duration-150, font-weight 500

### Cards
- bg white, border `rgba(0,0,0,0.06)`, rounded-xl (12px), shadow-soft
- Padding: 20-24px
- Hover: shadow-medium, transition 200ms

### Inputs
- bg white, border `rgba(0,0,0,0.1)`, rounded-lg (8px)
- Focus: ring-2 ring-blue-500/20, border-blue-500
- Padding: 10px 14px
- Font: 14px, weight 400

### Sidebar
- bg `#111111`, text `#a3a3a3`
- Active item: text white, bg `rgba(255,255,255,0.08)`
- Hover: bg `rgba(255,255,255,0.04)`
- Border-right: none (clean edge)

### Badges/Tags
- Rounded-full, px-2.5 py-0.5, text 11px weight 500
- Tier A: bg `#ecfdf5` text `#059669`
- Tier B: bg `#eff6ff` text `#2563eb`
- Tier C: bg `#fef3c7` text `#d97706`

## Spacing
- Base: 4px
- Common: 4, 8, 12, 16, 20, 24, 32, 48px
- Card gap: 12-16px
- Section gap: 32-48px
- Page padding: 24-32px

## Transitions
- Hover: 150ms ease
- Expand/collapse: 200ms ease-out
- Page transitions: 300ms ease
