# Design Brief

_Started 2026-05-20 05:06 UTC_

---

## User

Please focus on Claude Design brief part and help me design this

## Assistant

_[tool: read_file]_

_[tool: update_todos]_

I'll build the Warmly v2 clickable mock per your brief. The brief is locked, so I'll go straight to building rather than asking more questions. Let me set up the project structure.

_[tool: write_file]_

Now let me grab the tweaks panel starter and write the icons + data + shared primitives.

_[tool: copy_starter_component]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the main App with state routing.

_[tool: write_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me update HomeScreen to use the `greeting` prop and DiscoverScreen to use `showInviteBanner`:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me check the file loads cleanly.

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: done]_

Clean load. Let me ship it to the user.

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Built **Warmly v2** as a clickable mock per your brief. The full flow is live in your tab.

**Coverage** — all 11 screens reachable:
- Sign-up / Log in (toggle + "try sample data" shortcut to skip onboarding)
- Onboarding: drop-zones → CV-extracted + targets → processing animation
- Home with first-time / returning states (toggle in Tweaks)
- Discover grid, sorted by tier, with refine chips + ad-hoc search + invite teaser
- Contact Detail with state-dependent primary action and sticky action sidebar
- Draft Editor with 5 pre-canned French variants, shimmer-on-swap, version history + revert
- Contacts list with filter chips and follow-up flags
- Settings (Account / Profile / Materials)

**Live state** — Save flips status to Saved, Mark as met → Met, Save & sent → Contacted, all with toasts. Sidebar nav active state syncs with the route.

**Tweaks panel** exposes Home first-time toggle, greeting text, invite banner, and default draft language.

**Brand locked** — cream `#f4ede0`, sienna `#b87a4a`, dark sidebar `#1f1b16`, Instrument Serif italic wordmark with the sienna dot, Inter body, JetBrains Mono for section labels.

**Caveats** — auth/login is visual only (any field clicks through); the "Pick up" card routes to Mathieu's detail page (he has the pending draft); free-text draft refinement uses simple keyword routing ("paris"/"formal"/"short"/"ask") to pick from the canned variants. If you want me to add language variants for Anna's drafts in English, expand the seed beyond the 8 contacts, or push variations as a design canvas alongside the prototype, just say.

