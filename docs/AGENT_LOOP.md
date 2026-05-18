# Warmly — Three-Agent Development Loop

**Why this exists:** Every feature so far has had at least one "looks done but doesn't work" moment. The Bain saga was six iterations. The LinkedIn button "appeared but did nothing" was three iterations. The cost is each iteration burns ~30-45min of your time. A disciplined loop catches these before you see them.

---

## The three roles

### 1. Orchestrator (me — Claude Opus 4.7)

**Owns:** Strategic context, the product PRD, the feature backlog, the decision register, the visual tracker. Knows what we've built, why we built it, what comes next.

**Does:**
- Reads the user's request, frames it as a spec
- Validates the spec with the user (you) before any code is written
- Writes a clear brief for the developer agent (what to build, what NOT to touch, expected behavior, success criteria)
- Writes a clear brief for the tester agent (what to verify, with zero context about HOW it was built)
- Receives feedback from the tester
- Documents learnings in `PROJECT_MEMORY.md` so we don't make the same mistake twice
- Loops the dev/test cycle until the tester reports a clean pass
- Updates `STATUS.html` after each shipped feature

**Does NOT:**
- Write production code directly (in this loop — exceptions for tiny tweaks)
- Run tests itself (the tester does that to maintain independence)

### 2. Developer (sub-agent or me, depending on scope)

**Owns:** Implementation. Translates the orchestrator's brief into code.

**Does:**
- Reads the orchestrator's spec
- Writes / modifies code per the spec
- Runs local validations: `npx tsc --noEmit`, `npm run build`, extension build
- Commits with a clear message tied back to the feature
- Reports completion back to the orchestrator with: list of files changed, any deviations from the spec, anything that surprised them

**Does NOT:**
- Decide on UX patterns or strategic direction (that's the orchestrator)
- Test the feature live (that's the tester)
- Mark anything as "shipped" — only the orchestrator does that

### 3. Tester (sub-agent via `/qa-only` skill)

**Owns:** Independent verification. Treats every feature with cold-read fresh eyes.

**Does:**
- Receives the orchestrator's brief — just the success criteria, NOT the implementation details
- Opens a headless browser session against the live URL (production Vercel)
- Walks through the user flow the feature is meant to enable
- Takes screenshots, records the actual behavior at each step
- Produces a structured report: passed / failed / notes per criterion
- If failed: includes precise repro steps, screenshots, and the specific behavior that diverged from the brief

**Does NOT:**
- Read the codebase (deliberate — keeps tests black-box)
- Fix bugs (`/qa-only`, not `/qa`)
- Make judgments about whether a bug is "intentional"

### 4. The user (you)

**Approves the spec before code is written.** This is the one human gate. After approval, the loop runs autonomously until the tester passes or the orchestrator decides we need a strategic re-think.

---

## The loop in detail

```
User request
    ↓
[Orchestrator] writes spec → presents to user → user approves
    ↓
[Orchestrator] briefs Developer with spec + constraints
    ↓
[Developer] implements → commits → reports back
    ↓
[Orchestrator] briefs Tester with success criteria only (no implementation hints)
    ↓
[Tester] runs headless browser → produces report
    ↓
PASS? → [Orchestrator] marks shipped + updates STATUS.html + PROJECT_MEMORY
FAIL? → [Orchestrator] documents the failure → briefs Developer with the specific fix → loop back
```

Max loop iterations before escalating to user: **3**. After 3 failed dev/test cycles, the orchestrator pauses, reports the pattern to the user, and asks for strategic input (e.g., "the third-party API isn't behaving as expected, here are three workarounds").

---

## The spec template

Every feature gets a spec like this before code is written. The orchestrator writes it, the user approves it.

```
## Feature: <name>

## User story
As a <role>, I want to <action>, so that <outcome>.

## Success criteria (the tester verifies these in order)
1. <Observable behavior 1>
2. <Observable behavior 2>
3. <Observable behavior 3>

## Out of scope
- <Thing we explicitly are NOT building this round>

## Files likely touched
- src/...
- extension/...
- supabase/migrations/...

## Risks the developer should be aware of
- <Pattern we've been burned on before>
- <Edge case to handle gracefully>

## Definition of done
The tester runs the success criteria. Every one passes. STATUS.html is updated.
```

---

## The developer brief template

```
You are implementing a feature for Warmly (AI networking coach).

## What to build
<spec body>

## What you have
- Project at: C:\Users\glygs\Documents\ai-networking-coach\.claude\worktrees\zen-robinson-233760
- CLAUDE.md at the repo root has coding conventions — read it first
- PROJECT_MEMORY.md has the history of past decisions/learnings — skim section 10 (recent)

## Constraints
- TypeScript strict mode, no `any` unless commented
- Tailwind for styling, no inline styles
- Zod for API input validation
- Match the existing Warmly brand (cream/sienna, Instrument Serif italic for accents)
- Extension code: never run long loops in service worker, orchestrate in content script

## Validation before reporting done
- npx tsc --noEmit passes
- npm run build passes (Next.js)
- cd extension && npm run build passes (if extension changes)
- For extension changes: also `cp -r dist/. C:\Users\glygs\Documents\ai-networking-coach\extension\dist\`

## Report back with
- Files changed (list)
- Commit hash
- Any deviation from the spec and why
- Anything that surprised you
```

---

## The tester brief template

```
You are an independent QA tester for the Warmly web app at https://ai-networking-coach.vercel.app.

You do NOT have access to the codebase. You have ONLY the success criteria below.
Run them against the live site in a headless browser. Report what you observe.

## Auth
Use the test user credentials at <env var or stored cookie>

## Success criteria
1. <criterion 1>
2. <criterion 2>
3. <criterion 3>

## Report format
For each criterion:
- PASS / FAIL
- Screenshot (if visual)
- If FAIL: precise repro steps + observed behavior + screenshot of the failure state

## Important
- Do NOT attempt to fix anything you find
- Do NOT read the codebase
- Do NOT assume context — if the criterion is ambiguous, mark it as "UNCLEAR" and explain why
- If the live URL is unreachable, return "BLOCKED: site down" and stop
```

---

## Tools we already have for this

This isn't theoretical — the primitives exist:

| Role | Tool / Skill | How to invoke |
|---|---|---|
| Orchestrator | This conversation with me | (already doing it) |
| Developer (sub-agent) | `Agent` tool with `general-purpose` or `backend` / `frontend` / `extension` subagent_type | `Agent({ subagent_type: "backend", prompt: "<spec>" })` |
| Tester | gstack `/qa-only` skill | `Skill({ skill: "qa-only", args: "<criteria>" })` |
| Browser test | gstack `/browse` skill | invoked by qa-only internally |

So all we need is the *discipline* to use them in the loop pattern. The tooling is already there.

---

## When to skip the loop

The loop has overhead (~15min per feature in orchestration). For trivial changes it's not worth it. Skip when:

- Documentation-only changes (typos, README updates)
- Pure refactors with no behavior change
- Tweaks to existing UI styling (color, spacing)
- Cleanup tasks (removing dead code)
- Any change <10 lines that doesn't touch user-facing behavior

USE the loop when:
- New features
- Bug fixes for user-reported issues (verify the bug is actually gone)
- Cross-system changes (extension + backend + frontend)
- Anything that touched a hot trap area (LinkedIn DOM, auth, AI prompts)

---

## First trial run

Once you approve Decision 11, the next feature we build runs through the full loop. CV upload is a good candidate because it's:
- Small enough to fit in one loop iteration
- User-facing (testable)
- Cross-system (frontend file picker + backend extraction + LLM rebuild of profile_md)

Expected timeline for the trial:
- Orchestrator writes spec: 5min
- User approves: 2min
- Developer agent implements: ~30min
- Tester agent verifies: ~10min
- Loop close (orchestrator updates docs): 5min

Total: ~50min, end-to-end, with verification baked in. If we tried to do this without the loop, the "loop overhead" gets replaced by you discovering the bug an hour later when you try the feature manually.

---

## Open questions for the orchestrator pattern

These are things I'd want to refine after the first 2-3 features run through:

1. **Sub-agent vs me-doing-it:** Should the orchestrator always spawn a separate dev agent, or sometimes do the implementation directly? My current bias: spawn a separate agent for features with >100 lines of new code; do it myself for smaller features. We'll calibrate after a few runs.
2. **Tester auth setup:** The tester needs to log in to the live app. We need to either set up a test account with stored cookies for the gstack browser, OR have the tester run in a logged-out state with limited verification surface. To be decided in the first run.
3. **What if the tester is wrong?** The tester reports a "fail" but actually the feature is working as designed and the tester misread the criterion. In this case, the orchestrator's job is to disambiguate — refine the criterion in the spec, not just override the tester.
