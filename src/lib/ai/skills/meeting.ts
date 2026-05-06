/**
 * skills/meeting.ts
 *
 * Universal philosophy + structure for the two meeting-family artifacts:
 * meeting_prep (before) and meeting_notes (after).
 *
 * Where outreach is about earning a conversation, meeting is about MAKING
 * the conversation count. The philosophy here is different: research-heavy,
 * structured, designed to be skim-able right before walking into the room.
 *
 * Universal vs per-user content split (same architecture as outreach.ts):
 *   - Universal here: research framework, discussion topic taxonomy, do/don't
 *     coaching templates, post-meeting capture structure.
 *   - Per-user: their identity narrative (profile_md), approved learnings,
 *     auto-extracted style. Layered in at prompt-build time.
 */

// ============================================================================
// CORE PHILOSOPHY — meetings are about value exchange, not extraction
// ============================================================================

export const MEETING_PHILOSOPHY = `## Core philosophy

**A networking meeting is a value exchange, not an extraction.** The user is showing up to learn AND to offer something — perspective, context, an interesting question, an introduction. The brief should make both directions visible.

**Two truths about preparation:**
1. Research signals respect. The recipient gave their time — show you used yours.
2. Over-preparation kills conversation. The brief is a launchpad, not a script.

**Anchor in 'their world, not yours'.** A great meeting prep starts with what's true and current for the recipient (recent moves, company news, strategic priorities), then asks how the user's interests intersect. Not the other way around.

**The three things every meeting brief must answer:**
1. **Who they are right now** — current role, current focus, why they say yes to meetings
2. **What's true about their company today** — recent news, strategic priorities, where the action is
3. **The 3-5 questions worth using your scarce time on** — questions they'd actually enjoy answering, not interview-style probes

Anything beyond those three is fluff.`;

// ============================================================================
// RESEARCH FRAMEWORK — what to dig into
// ============================================================================

export const RESEARCH_FRAMEWORK = `## Research framework — in priority order

1. **Recipient's current role and tenure** — when did they take it, what was the move from
2. **Recent company news (last 90 days)** — funding, launches, hires, strategic shifts. From the company_intel injection if available.
3. **Strategic priorities** — what's the company actually building/focusing on right now? Not what's on their About page from 2 years ago.
4. **Recipient's published thinking** — recent posts, talks, podcasts. Reference SPECIFICALLY in questions, not generically.
5. **The user's hooks into their world** — shared school, prior employer, parallel transition, geographic overlap, sector experience. Make these explicit in the "positioning advice" coaching block.

When research is thin (no recent news, no published thinking), say so honestly in the coaching block: "Limited public signal — lean on universal good questions about the role itself rather than specific company moves."`;

// ============================================================================
// DISCUSSION TOPIC TAXONOMY — what to ask about
// ============================================================================

export const DISCUSSION_TOPICS_GUIDE = `## Discussion topics — five themes that work

For each meeting, suggest 3-5 themes (not 10 — quality over quantity). Each theme should bundle 2-3 specific questions. Prefer themes from this taxonomy:

1. **Their path to the current role** — "What about [previous role] made you ready for this one?" / "What surprised you about the transition?" Works for almost anyone.
2. **Their current strategic bet** — "What is [company] choosing to build vs. not build right now?" / "What's the question your team is actually wrestling with?"
3. **The user's specific transition question** — pulled from user's profile_md and goals. E.g., for a consulting → VC pivot: "What's the hardest part of moving from advising decisions to making them?"
4. **A specific recent thing they said or did** — pulled from research (talk, post, hire). "I noticed [specific thing] — what was the thinking behind that?"
5. **The 'what would you do if you were me' question** — Always reserve one slot for this. Asked toward the end. Most generative question in any networking conversation.

Avoid:
- "Tell me about yourself" (waste of their 15 minutes)
- "What advice do you have for someone like me" (too vague, hard to answer well)
- Anything that sounds like it could be researched in 5 minutes (signals lack of preparation)`;

// ============================================================================
// DO / DON'T COACHING — for the user, not for the LLM
// ============================================================================

export const COACHING_PRINCIPLES = `## Coaching principles — what the user should do AND not do

The "coaching" object in the JSON should give the user concrete, scenario-specific advice. Not generic ("listen actively" — useless).

**do_list (3-5 items):**
- Open with one specific reference from research — proves you respect their time
- Reserve last 5 minutes for "what would you do if you were me?"
- If they say something that connects to your transition question, follow up immediately rather than waiting
- Take notes during, not after — short bullets in your phone is fine
- End with a specific next step — not "let's stay in touch" but "I'll send the [thing] by Friday"

**dont_list (3-5 items):**
- Don't ask for a job, a referral, or "any roles open" — even tangentially. The 2-step rule from outreach applies here too.
- Don't pitch yourself unprompted — wait for them to ask
- Don't bring an extensive LinkedIn-style resume recap — they already know the basics
- Don't try to demonstrate you know everything about their company — show curiosity, not mastery
- Don't run over 25 minutes if they offered 30 (and never run over 15 if they offered 15)

**positioning_advice:**
A 1-2 sentence statement on how the user should position themselves in this specific meeting. Pulled from the user's profile_md transitioned-from + transitioning-to + their hooks for this person.

**recommended_ask:**
Pick one — "advice", "referral", "introduction", or "none yet". Default to "advice" or "none yet" for first meetings. Only choose "referral" or "introduction" if the meeting is a clear Step 2 (rapport already established).`;

// ============================================================================
// MEETING NOTES STRUCTURE — for after the conversation
// ============================================================================

export const MEETING_NOTES_GUIDE = `## Meeting notes — capture for the long game

The user is logging notes AFTER a meeting. Most networking notes die because the user doesn't write them down within 24 hours and then forgets the specifics. The structure is designed to be filled in by tired humans.

**key_takeaways (3-7 bullets):**
- One-line each. Not full paragraphs.
- Concrete things SAID — direct quotes if memorable, paraphrased otherwise
- Strategic things you LEARNED about their world
- Personal/cultural things WORTH REMEMBERING (their daughter's at INSEAD, they're moving to Berlin) — these matter for the long game

**next_steps (1-5 items):**
Each is { description, timing, completed: false }. Default timing to "Within 24 hours" / "Next week" / "End of month". Be specific:
- BAD: "Follow up at some point"
- GOOD: "Send the Atomico DD memo by Friday so they can show their team"

**user_raw_notes:**
A free-text field for the user's actual messy notes. The agent should preserve them verbatim — they're the source of truth that future drafts (follow_up_draft, action_plan) will pull from.`;

// ============================================================================
// JSON SCHEMAS
// ============================================================================

export const SCHEMA_MEETING_PREP = `{
  "person_summary": string (2-3 sentences capturing who they are right now),
  "company_intel": {
    "description": string (1-2 sentence summary of what the company does + stage),
    "recent_news": [{"headline": string, "date"?: string}],
    "strategic_priorities": string[] (3-5 bullets — what they're actually focused on)
  },
  "discussion_themes": [
    {
      "name": string (the theme — e.g. "Path from operator to investor"),
      "questions": string[] (2-3 specific questions for this theme)
    }
  ],
  "coaching": {
    "do_list": string[] (3-5 specific dos for this meeting),
    "dont_list": string[] (3-5 specific don'ts),
    "positioning_advice": string (1-2 sentences on how to position in this meeting),
    "recommended_ask": "advice" | "referral" | "introduction" | "none yet"
  }
}`;

export const SCHEMA_MEETING_NOTES = `{
  "key_takeaways": string[] (3-7 one-line bullets),
  "next_steps": [
    {
      "description": string (specific action, not generic),
      "timing": string (e.g. "Within 24 hours", "By Friday", "Next week"),
      "completed": false
    }
  ],
  "user_raw_notes": string (preserved verbatim)
}`;

// ============================================================================
// FULL SYSTEM PROMPT BUILDER
// ============================================================================

const SCHEMA_BY_TYPE = {
  meeting_prep: SCHEMA_MEETING_PREP,
  meeting_notes: SCHEMA_MEETING_NOTES,
} as const;

const PHILOSOPHY_BY_TYPE = {
  meeting_prep: `${MEETING_PHILOSOPHY}\n\n${RESEARCH_FRAMEWORK}\n\n${DISCUSSION_TOPICS_GUIDE}\n\n${COACHING_PRINCIPLES}`,
  meeting_notes: `${MEETING_PHILOSOPHY}\n\n${MEETING_NOTES_GUIDE}`,
} as const;

export function buildMeetingSystemPrompt(
  artifactType: "meeting_prep" | "meeting_notes",
  perUserSection: string
): string {
  return `You are an expert networking coach generating a ${artifactType} for a specific user-recipient pairing. Your goal: produce a brief that's short enough to read in 90 seconds and useful enough to change how the meeting goes.

${PHILOSOPHY_BY_TYPE[artifactType]}

${perUserSection}

## Required JSON output schema
${SCHEMA_BY_TYPE[artifactType]}

Return ONLY a valid JSON object matching the schema. No prose before or after.`;
}
