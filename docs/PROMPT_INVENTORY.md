# Prompt Inventory

> **Purpose:** every place an LLM prompt is constructed in Warmly, what it does, what feature it powers, when it fires, and how to change it. The map exists so you can change a prompt with confidence — knowing where it lives, what depends on it, and what tests to run.
>
> **Scope:** all production prompts. Tests, dev scripts, and the gstack skill that lives in your home directory are out of scope.
>
> **Updated:** May 6, 2026 (Session 8 wrap-up).

---

## The 8 prompt sites

| # | File | Function | LLM call? | Triggers when |
|---|------|----------|-----------|---------------|
| 1 | `src/lib/ai/scoring.ts` | `buildScoringPrompt` | ✅ MiniMax | Every contact create / re-score |
| 2 | `src/lib/ai/coaching.ts` | `buildCoachingSystemPrompt` + `buildCoachingUserPrompt` | ✅ MiniMax | Every chat message — UNLESS an artifact is triggered (then skipped, see #8) |
| 3 | `src/lib/ai/generation.ts` | `buildSystemPrompt` + `buildGenerationPrompts` | ✅ MiniMax | Artifact creation (6 types, all share one template) |
| 4 | `src/lib/ai/context.ts` | `summarizeConversation` | ✅ MiniMax | Conversation hits 15-message threshold |
| 5 | `src/lib/ai/context.ts` | `extractStylePreferences` | ✅ MiniMax | User edits an artifact and saves with non-zero `user_edit_distance` |
| 6 | `src/app/api/discovery/extract/route.ts` | inline | ✅ MiniMax | Each profile during a discovery run |
| 7 | `src/app/api/discovery/resolve-company/route.ts` | inline | ✅ MiniMax | Step 1 of discovery (company → LinkedIn URL) |
| 8 | `src/app/api/conversations/[id]/messages/route.ts` | `ARTIFACT_INTRO` | ❌ Deterministic | Replaces coaching reply when artifact triggered (see Session 8 fix) |

---

## 1. Contact Scoring — `lib/ai/scoring.ts`

**Function:** `scoreContact(input)` calls `buildScoringPrompt(input)` to construct user prompt; uses inline `SCORING_SYSTEM_PROMPT` constant for system prompt.

**What it does:** evaluates a contact against the user's profile across 6 weighted criteria, returns a 1-10 overall score, a tier (1/2/3), per-criterion scores, recommendation reason, and suggested outreach hook.

**Inputs:**
- `user_profile` — `career_history`, `education`, `goals`, `networking_preferences`
- `contact_profile` — `name`, `current_title`, `company`, `career_history`, `education`, `location`, `profile_snapshot`
- `rubric` — the 6-criterion array from `src/types/ai.ts` `SCORING_RUBRIC`

**Output schema (JSON):**
```json
{
  "overall_score": 7.5,
  "tier": 1,
  "scores": {
    "career_path_similarity": 8,
    "shared_background": 9,
    "seniority_relevance": 7,
    "industry_match": 8,
    "accessibility_signals": 6,
    "recency": 7
  },
  "recommendation_reason": "one-sentence why",
  "suggested_hook": "the strongest outreach angle"
}
```

**Tier mapping:** `score >= 7.5` → 1, `5–7.4` → 2, `<5` → 3.

**Triggered by:**
- `POST /api/contacts` — every contact create (auto-score)
- `PUT /api/contacts/[id]` — re-score on profile data change
- `POST /api/ai/score` — manual re-score endpoint

**Cost:** ~1 call per contact saved. Fast (Haiku-tier MiniMax). ~500 input tokens, ~200 output tokens.

**Where it surfaces in product:** ContactCard tier badge + score, ContactDetail right sidebar's "Why this match" + "Coach's take" cards, ContactList "Fit" column.

**Tuning levers:**
- The 6 criteria + weights live in `src/types/ai.ts` `SCORING_RUBRIC`
- The system prompt's "tier mapping" thresholds are stable but could be tuned
- The "no hallucination" instruction at the bottom is critical — keep it

---

## 2. Coaching Reply — `lib/ai/coaching.ts`

**Function:** `processCoachingMessage(request)` calls both `buildCoachingSystemPrompt` and `buildCoachingUserPrompt`.

**What it does:** generates the agent's chat reply. Detects whether the user message is "strategic" (uses Sonnet-tier budget) or factual (uses Haiku-tier budget). Reads `user_memory.learned_patterns.successful_hooks` to bias replies toward the user's voice over time.

**Inputs (CoachingRequest):**
- `context.user_profile`, `context.user_memory`, `context.conversation_summary`, `context.recent_messages`, `context.contact_profile`
- `user_message` — the latest user input

**Output (CoachingResponse):**
- `agent_message` — the chat reply text
- `trigger_artifact` — `ArtifactType | undefined` (kept for backward compat; the route does its own keyword detection now)
- `model_used`, `tokens_input`, `tokens_output`

**Triggered by:**
- `POST /api/conversations/[id]/messages` — every user message **except** when the route's pre-check `detectArtifactTrigger()` returns a type AND the conversation has a contact. In that case, coaching is **skipped** (Session 8 fix) — the deterministic intro from `ARTIFACT_INTRO` is used instead.

**Cost:** 1 call per non-artifact-triggering chat message. Sonnet-tier budget when `isStrategicCoachingRequest(message)` is true.

**Strategic keywords (route to Sonnet):** "strategy", "approach", "advice", "recommend", "should i", "how do i", "prepare", "negotiate", "career", "position", "networking", "outreach plan".

**Tuning levers:**
- The `memorySection` block is the voice-matching hook — currently only reads `successful_hooks`. Could be extended to read `writing_style.tone` and `learned_patterns.best_performing_tone`.
- The `isStrategicCoachingRequest` keyword list determines model tier.
- The system prompt's "warm, direct, actionable" language sets the agent personality.

---

## 3. Artifact Generation — `lib/ai/generation.ts`

**Function:** `generateArtifact(request)` calls `buildGenerationPrompts` which calls `buildSystemPrompt(artifactType, userMemory)`.

**What it does:** generates one of 6 structured artifact types as JSON. **Currently all 6 types share the same system prompt template** — only the JSON schema differs per type.

**Artifact types and their schemas:**

| Type | Schema |
|------|--------|
| `connection_note` | `{ message, hook, char_count }` (≤300 chars) |
| `outreach_draft` | `{ message, tone, hook, channel, char_count, subject? }` |
| `meeting_prep` | `{ person_summary, company_intel, discussion_themes, coaching }` |
| `meeting_notes` | `{ key_takeaways, next_steps, user_raw_notes }` |
| `action_plan` | `{ actions[], coaching_note }` |
| `follow_up_draft` | `{ message, reference_to_meeting, timing_suggestion, channel, tone }` |

**Inputs (GenerationRequest):**
- `artifact_type`
- `context` — full bundle: `user_profile`, `user_memory`, `contact_profile`, `conversation_summary`, `recent_messages`, `artifact_metadata`, `company_intel_raw` (only for `meeting_prep`)
- `user_instructions` — the original user message that triggered the artifact

**Output:** structured JSON matching the requested schema.

**Triggered by:**
- `POST /api/conversations/[id]/messages` when `detectArtifactTrigger()` matches AND `contact` exists (Session 8 fix path)

**Cost:** 1 call per artifact. Sonnet-tier for `meeting_prep` and (optionally) `follow_up_draft` with meeting context; Haiku-tier for the rest. Plus 1 web search call to Perplexity/SerpAPI for `meeting_prep` to fetch company intel.

**Voice-matching hook:** `userMemory.writing_style` is appended to the system prompt as `## User Writing Style (adapt to this)`. Reads `tone`, `avoids`, `preferred_hooks`, `message_length_preference`. Updated by prompt #5 (`extractStylePreferences`) on every edit.

**The big gap (resolved in this session):** `outreach_draft`, `connection_note`, and `follow_up_draft` deserve a much richer prompt — peer-level sense-checking philosophy, anti-AI gates, connection-points priority, the 2-step approach. Currently they get the same generic prompt as `meeting_notes`. The new `buildSystemPrompt` splits per artifact-type family (see commit `<this commit>`).

---

## 4. Conversation Summarization — `lib/ai/context.ts`

**Function:** `summarizeConversation(request)`.

**What it does:** rolling summarization to keep long conversations within context window limits. Returns a structured JSON summary that's stored on the `conversations.summary` JSON column and prepended to future LLM calls.

**Output schema:**
```json
{
  "key_decisions": ["..."],
  "user_preferences_expressed": ["..."],
  "artifacts_produced": [{"type": "...", "status": "...", "id": "..."}],
  "open_questions": ["..."],
  "relationship_stage_changes": ["..."]
}
```

**Triggered by:** every 15 messages on a conversation (`SUMMARIZATION_THRESHOLD`). Fires async (`void triggerSummarization(...)`) so the chat reply isn't blocked.

**Cost:** ~1 call per 15 messages on a conversation. Haiku-tier.

**Existing summary handling:** if a summary already exists, the prompt sends it as "Existing summary to merge into" — the model should preserve prior state and integrate new messages, not overwrite.

---

## 5. Style Preference Extraction — `lib/ai/context.ts`

**Function:** `extractStylePreferences(request)`. **This is the self-improvement loop's heart.**

**What it does:** compares the original AI draft against the user's edited version, infers style preferences (tone, length, hooks, vocab they avoid), updates `users.user_memory` JSON, returns the new memory + a one-line learning summary.

**Inputs:**
- `original_draft` — the AI-generated text
- `edited_version` — what the user kept after editing
- `current_memory` — the existing `user_memory` JSON

**Output:**
```json
{
  "updated_memory": { /* full user_memory with deltas applied */ },
  "learning_summary": "User prefers shorter openers and avoids 'reach out' phrasing"
}
```

**Triggered by:**
- `PUT /api/artifacts/[id]` when the request body includes BOTH `content` (changed) AND `user_edit_distance` (non-zero). Fires async (`void triggerStyleLearning(...)`) so the save isn't blocked.
- `ArtifactDrawer` sends `user_edit_distance` automatically when the user clicks "Save changes" after editing the primary text field.
- "Mark as sent" with no edits → `user_edit_distance = 0` → no style learning fires (correct: nothing to learn).

**Cost:** ~1 call per edit-and-save. Haiku-tier.

**Where the learned style flows back to product:** prompt #2 (coaching reply) and prompt #3 (artifact generation) both inject `user_memory.writing_style` into their system prompts. So every accepted edit makes the next draft slightly more "you."

**The voice-matching architecture per PRD Section 5.9:**
- Layer 1 (working today): explicit user memory from edit patterns ✓
- Layer 2 (partially): outcome memory from artifact `status` and `artifact_outcome`. Not yet feeding back into prompts — extension.
- Layer 3 (deferred): proactive intelligence from contact timeline scanning. v2 work.

**Verified firing today:** `triggerStyleLearning` is called from `PUT /api/artifacts/[id]` when both content and `user_edit_distance` are present in the request body. `ArtifactDrawer.handleSaveEdit` computes the distance as `Math.abs(editValue.length - primaryText.length)` and includes it in the PUT body. Loop is wired correctly.

---

## 6. LinkedIn Profile Extraction — `app/api/discovery/extract/route.ts`

**Inline prompt** (no helper function — it's a single-route concern).

**What it does:** takes raw text scraped from a LinkedIn profile page (via the Chrome extension's CDP scrolling) and returns structured profile data.

**Input:** `pageText` (truncated to 8000 chars), optional `linkedinUrl`.

**Output (Zod-validated):**
```json
{
  "name": "...",
  "headline": "...",
  "location": "...",
  "experiences": [{"title": "...", "company": "...", "duration": "..."}],
  "educations": [{"school": "...", "degree": "...", "dates": "..."}]
}
```

**Triggered by:** Chrome extension's content script during a discovery run, after CDP-driven scroll loads the full profile.

**Cost:** ~$0.002/profile (per Session 7 logs). Up to 25 profiles per discovery session. ~2 LLM calls per session worst case (retry on empty response).

**Reliability features:**
- 2-attempt retry loop with 2s delay (handles MiniMax sometimes returning empty content when reasoning tokens consume the budget)
- Strips `<think>...</think>` blocks before parsing
- Fallback: if Zod validation fails, returns raw LLM output with a warning flag
- Prompt explicitly tells the model to ignore work-mode labels ("On-site", "Remote"), descriptions, and "Show all" UI strings — context the LLM understands but a regex parser couldn't

---

## 7. Company URL Disambiguation — `app/api/discovery/resolve-company/route.ts`

**Inline prompt** (single-route concern).

**What it does:** given a company name and the text content of a LinkedIn search results page, picks the best-matching company URL. The fallback path when slug-guessing fails.

**Input:** `companyName`, `searchResultsText` (10–10000 chars).

**Output:** `{ companyUrl, companyName, reasoning }`. URL is `null` if no match.

**Triggered by:** Chrome extension during the company resolution step of a discovery run, when slug-guess (e.g. `linkedin.com/company/parloa`) fails to produce a valid company page.

**Cost:** at most 1 call per discovery session (only fires when slug-guess fails).

**Why an LLM:** the user might say "Parloa" but the right URL might be `parloa-ai`, `parloagmbh`, or similar. An LLM understands context (descriptions, URLs together) where regex doesn't.

---

## 8. Deterministic Artifact Intro — `app/api/conversations/[id]/messages/route.ts`

**Not an LLM call.** A deterministic short reply that replaces the coaching call when an artifact is triggered. Documented here because it's a "prompt" in the broader sense — a prepared text shown to the user.

**Why deterministic, not LLM:** see Session 8 of `PROJECT_MEMORY.md`. The original architecture ran coaching + generation in parallel and they produced conflicting drafts. Replacing the coaching call with a fixed reply guarantees the artifact card is the single source of truth.

**`ARTIFACT_INTRO` map:**

| Type | Reply (with `{name}` interpolated) |
|------|------|
| `connection_note` | "Drafted a connection note for {name} — opening it now. Review, edit if it doesn't sound like you, then send." |
| `outreach_draft` | "Drafted your outreach to {name} — opening it now. Tweak anything that feels off, then mark it as sent when you've actually sent it." |
| `meeting_prep` | "Prepared the briefing for your meeting with {name} — opening it now. Skim the discussion topics and questions before you walk in." |
| `meeting_notes` | "Captured your notes from the conversation with {name} — opening it now. Add anything I missed before finalizing." |
| `action_plan` | "Mapped out the next steps with {name} — opening it now. Adjust the timing if anything's unrealistic." |
| `follow_up_draft` | "Drafted your follow-up to {name} — opening it now. Make it sound like you, then mark as sent." |

**Fallback:** `ARTIFACT_FALLBACK_FAILURE(name)` when artifact generation fails — "I tried to draft something for {name} but the generation failed — try again in a moment."

**Tuning levers:** these strings ARE the agent's voice on every artifact-triggering message. Worth iterating with real users — current copy is "warm, direct, actionable" but could be more distinctly Liyang's voice.

---

## Per-feature prompt map (reverse lookup)

When a feature has a quality issue, this points to which prompt to inspect.

| Feature | Prompts involved |
|---------|------------------|
| Contact tier + score appearing on cards | #1 |
| "Why this contact matters" + "Suggested outreach hook" copy | #1 |
| Chat reply when no artifact is generated | #2 |
| Chat reply when an artifact IS generated | #8 (deterministic) |
| Outreach draft / connection note / follow-up content | #3 |
| Meeting prep structured sections | #3 + web search |
| Action plan when/what items | #3 |
| Long conversation continuity | #4 |
| AI drafts gradually matching user's voice | #5 (writes) + #2 + #3 (read) |
| Discovery: LinkedIn profile data | #6 |
| Discovery: company URL guessing | #7 |

---

## Cost reference (rough, MiniMax-M2.7-highspeed pricing)

| Workflow | Calls | Approx cost |
|----------|-------|-------------|
| Save 1 contact | 1 score | ~$0.001 |
| 1 chat message (conversational) | 1 coaching | ~$0.002 |
| 1 chat message → artifact | 1 generate (no coaching) | ~$0.003 |
| Edit + save 1 artifact | 1 style extract | ~$0.001 |
| Long conversation (15 msgs) | + 1 summarize | ~$0.002 |
| Discovery run (25 profiles) | 25 extracts + maybe 1 resolve | ~$0.05 |

**Per-user-month rough estimate (PRD Section 5.4.1):** €2.50 with current MiniMax tier, expected to fall to €0.80 by year 5 with model improvements + caching.

---

## Open quality questions

These are the spots where a human review pass would likely improve quality. Tracked here so we don't lose them.

1. **Generic outreach prompt.** Currently `outreach_draft`, `connection_note`, `follow_up_draft` share the same generic generation prompt as `meeting_notes`. The gstack `/outreach-messages` skill has a much richer voice + philosophy that should be ported. **Status: addressed in this session — see new per-family prompt builder.**

2. **`extractStylePreferences` instruction is thin.** Says only "analyze the differences and return updated user_memory." Could be more specific: "if user shortened the opener by >50%, update `message_length_preference`. If user removed phrases like 'I came across', add them to `avoids`." More structure → faster learning.

3. **`summarizeConversation` may drift on long conversations.** No test for compression quality. Worth adding.

4. **Anti-hallucination is the only "no" rule across prompts.** Could add: "no specific dates, dollar amounts, or quotes that aren't in the input data." Especially for `outreach_draft` where the LLM sometimes invents specific deal names.

5. **No prompt versioning.** When we change a prompt, we lose the ability to A/B test. Consider tagging each `userMemory` learning with the prompt version that produced the original draft. Future work.

---

## How to change a prompt safely

1. **Find it via the table at top.** Note the file path and function name.
2. **Read existing tests:** `tests/lib/scoring.test.ts`, `tests/lib/generation.test.ts`, `tests/lib/context.test.ts` cover #1, #3, #4, #5. Conversations and discovery routes have integration tests in `tests/api/`.
3. **Change the prompt.** Run `npx vitest run` — tests should still pass (they assert on output structure, not exact content).
4. **Smoke test by hand:** preview deploy, run the affected feature, check the output shape and quality.
5. **If style/voice change:** open at least 5 historical artifacts to see if the new prompt would produce noticeably better output for past inputs.
6. **Commit with a "prompt:" prefix** so we can grep history for prompt changes specifically. (Convention going forward.)
