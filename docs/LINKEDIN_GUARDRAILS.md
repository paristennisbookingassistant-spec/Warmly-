# LinkedIn Safety Guardrails

**Read this before invoking any tool that touches LinkedIn (`/linkedin` skill, `tests/ext-tester.mjs`, gstack `/browse` on linkedin.com, or the Warmly extension itself).**

These rules apply to me (Claude), to any sub-agent I spawn, to the tester agent, and to any automated flow that operates on Liyang's LinkedIn account.

---

## Hard rules — NEVER without explicit user approval

These are not "ask if unsure." These are "STOP and wait" rules. If a flow would cause any of these, halt and surface the proposed action for user approval before proceeding.

### Communication actions
- ❌ NEVER send a LinkedIn message (DM)
- ❌ NEVER send an InMail
- ❌ NEVER send a connection request
- ❌ NEVER accept or reject an incoming connection request
- ❌ NEVER reply to a comment, message, or InMail
- ❌ NEVER click "Send" on any compose form, even if a draft was pre-filled by Warmly

### Posting actions
- ❌ NEVER create a post (text, photo, video, poll, document, article)
- ❌ NEVER share or repost someone else's content
- ❌ NEVER comment on a post
- ❌ NEVER like or react to a post, comment, or message
- ❌ NEVER click "Publish" on any draft

### Profile changes
- ❌ NEVER edit profile (name, headline, about, photo, banner, location, contact info)
- ❌ NEVER add or remove an experience entry
- ❌ NEVER add or remove an education entry
- ❌ NEVER add, endorse, or remove a skill
- ❌ NEVER request, accept, or write a recommendation
- ❌ NEVER change "Open to work" / "Hiring" badges

### Settings & account
- ❌ NEVER change account settings (privacy, notifications, visibility)
- ❌ NEVER change subscription, billing, or payment methods
- ❌ NEVER toggle "Open to" flags
- ❌ NEVER block, mute, or unfollow anyone
- ❌ NEVER sign out (would invalidate the session we depend on)

### Relationships
- ❌ NEVER remove a connection
- ❌ NEVER report a profile, post, or message
- ❌ NEVER click "Withdraw" on a pending connection request

---

## Allowed by default — read-only operations

These are fine to do without asking, as they don't change LinkedIn state from another user's perspective.

- ✅ View any profile
- ✅ View any post, comment, article
- ✅ View own message threads (read content, scroll history)
- ✅ Search people, companies, jobs, content
- ✅ View company pages, employee lists
- ✅ View own connections list
- ✅ Read incoming notifications (without acting on them)
- ✅ Download any data that LinkedIn renders publicly to logged-in users
- ✅ Take screenshots
- ✅ Navigate between pages
- ✅ Issue **data-fetch requests** that only READ data the user can already see —
  even when the HTTP method is POST. Some LinkedIn read endpoints (GraphQL
  queries, and SDUI pagination such as
  `POST /flagship-web/rsc-action/actions/pagination?sduiid=...profile.details.experience`)
  use POST to carry a query body. These are how LinkedIn's own UI loads a section
  when you scroll; they return data and change **nothing** on the account. The
  Warmly network sync uses these to read connections' experience/education. The
  test that matters is **state change**, not the HTTP verb (see below).

---

## Gray area — requires user approval, but predictable

These aren't strictly read-only but they don't broadcast to other LinkedIn users either. Still need approval the first time; can build a per-session approval for batch operations.

- ⚠️ Save a job posting (visible only to user, but mutates user's "saved jobs")
- ⚠️ Follow a company or hashtag (visible to others as "X follows Y")
- ⚠️ Mark a conversation as read
- ⚠️ Star/flag a conversation
- ⚠️ Use LinkedIn's search filters (changes URL but not LinkedIn-side state)
- ⚠️ Click any UI control that triggers a **state-changing** network POST (save,
  follow, mark-read, etc.). NOTE: a POST that only **reads** data (a GraphQL
  query or SDUI pagination fetch — see the Allowed section) is not in this gray
  area; the distinction is whether the request mutates account/relationship state.

If unsure whether something is a gray area: treat it as a hard rule, ask.

---

## When in doubt, the test

Ask: "If this action were visible to someone else (a connection, the recipient, the company), or if it changed something on Liyang's account that a third party could see — would Liyang want to be the one who pressed the button?"

**If yes → STOP. Ask.**

---

## What "approval" means concretely

For Claude to proceed with a hard-rule action, the user must EXPLICITLY type one of:
- "Yes send it"
- "Approve"
- "Go ahead"
- "Do it"
- Or equivalent unambiguous green light

Approval is **per-action**, not blanket. "Send this message to Paul" approves THIS message to THIS person ONCE. It does NOT approve future messages, even to the same person.

For the agent loop: the tester agent is **NEVER** authorized to perform hard-rule actions, full stop. The orchestrator only proposes; the user approves; the developer (or me directly) executes after approval.

---

## What if a hard-rule action is needed for testing?

Example: testing the "Draft reply with Warmly" feature requires the button to actually inject text into LinkedIn's compose box. That's NOT sending — that's pre-filling. Pre-filling is allowed because:
- Nothing is sent
- Nothing is visible to anyone else
- The user remains the one who decides whether to click Send

So the tester CAN:
- Click the Warmly button
- Verify text appears in the compose textarea
- Take a screenshot

The tester CANNOT:
- Click LinkedIn's Send button (even after the text is pre-filled)
- Click Send on any draft anywhere
- Submit any form that would broadcast

---

## Emergency stop

If during any automated flow I detect that an unintended action is about to fire (or has fired), I halt immediately, report what happened, and surface it for user review. No silent recovery, no retries.

---

## Acknowledgment

The user (Liyang) added these guardrails on May 14, 2026 with the directive: "you are not allowed to make any post, change to my profile, change to settings, sending messages, etc. without my approval."

This document is the operational expansion of that directive.
