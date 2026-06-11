# Comment UI

_Started 2026-05-28 07:47 UTC_

---

## User

Apply comment

## Assistant

_[tool: grep]_

Let me look at the file to understand the context around this field.

_[tool: grep]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

The `workAuth` value is only ever displayed, never used in logic — safe to reframe. I'll change this field to "Where are you authorized to work?" with a country multi-select dropdown (authorization is naturally multi-valued). Let me build a reusable component and apply it in both onboarding and settings.

Let me check the Icon set and how `bg` data flows.

_[tool: read_file]_

_[tool: grep]_

Now there are two related comments — both ask for dropdown-from-a-list behaviour. I'll build one reusable picker dropdown and use it for: (1) work authorization → "Where are you authorized to work?" with a country list, and (2) the geography "+ more" → add cities from a list.

Let me look at the rest of shared.jsx and the Icon set.

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

I have everything I need. Let me read the settings screen's work-auth area and the data file so I update all usages consistently.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now I'll implement. First, add a `Picker` dropdown component plus shared city/country lists to shared.jsx.

_[tool: str_replace_edit]_

_[tool: grep]_

The `.picker-row` needs a hover style. Let me find the stylesheet.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now update the data model — `workAuth` becomes an array of authorized regions:

Now onboarding.jsx — update default, destructure `Picker`, and rewrite both fields:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Let me finish the settings.jsx updates first, then address the new LinkedIn comment.

_[tool: grep]_

Two more requests: clarify the LinkedIn connection copy, and remove all em-dashes across the UI. Let me look at the LinkedIn setup component.

_[tool: read_file]_

_[tool: grep]_

I'll reword step 2 to make the LinkedIn-sync intent explicit, then sweep em-dashes. Let me first count em-dashes across the UI.

_[tool: str_replace_edit]_

The em-dashes appear in many user-facing strings. Most code comments don't matter, but I'll clean the rendered text. Let me first update the LinkedIn step copy, then run a careful sweep.

_[tool: str_replace_edit]_

Now the placeholder em-dash in contacts.jsx — handle specially before the sweep:

_[tool: run_script]_

Now I'll sweep the remaining em-dashes from all rendered strings. Let me run a script across the data and screen files, replacing each with a comma (the natural de-em-dashing for this casual copy).

_[tool: grep]_

_[tool: grep]_

All remaining em-dashes are only in the uploads brief (not rendered). Let me confirm the code is clean and check for any double-comma artifacts in the js files.

_[tool: done]_

Only comments in the starter/shared files retain em-dashes — nothing user-facing. All four requests are done:

1. **Work authorization → "Where are you authorized to work?"** with a searchable country multi-select (onboarding + settings + data model).
2. **Geography "+ more"** now opens a searchable city dropdown.
3. **LinkedIn step** reworded to make the connect-and-sync-contacts intent explicit.
4. **Em-dashes removed** from all rendered UI copy.

Let me verify it loads cleanly.

_[tool: fork_verifier_agent]_

All four comment-driven changes are applied. Summary:

- **Work authorization** is now a "Where are you authorized to work?" country picker (multi-select, searchable, removable chips) in both onboarding and settings; the data model changed from a single string to an array.
- **Target geography "+ more"** now opens a searchable city dropdown that adds cities.
- **LinkedIn step** copy now states it connects your LinkedIn and syncs your contacts.
- **Em-dashes** stripped from all rendered copy (replaced with natural punctuation).

Verifier is running in the background.

## User

Verifier agent check completed

## Assistant

Verifier confirmed everything works. All four changes are live and clean.

