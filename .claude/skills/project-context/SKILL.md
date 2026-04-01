---
name: project-context
description: Core context about the AI Networking Coach product — vision, architecture, key decisions. Load this skill when any agent needs to understand what we're building and why.
---

# AI Networking Coach — Project Context

## Product Vision
An AI-powered networking coach that guides professionals through: Discover (find contacts) → Strategize (craft outreach) → Prepare (meeting prep with company intel) → Maintain (follow-up coaching). Chat-first interface where users converse with an AI agent that accumulates context over time.

## Core Narrative
"Democratizing networking" — making networking accessible to everyone, not just the naturally gifted. The product is the great equalizer.

## Target Users
Primary: MBA/MiM students navigating career transitions (beachhead market).
Vision: Anyone building or maintaining a professional network.

## Key Architectural Decisions
1. **Chat-first**: Primary interaction is conversation, not dashboards. Three views: Chat (primary), Contacts (profile hub), Goals (progress).
2. **Session-per-contact**: Each contact gets a dedicated conversation thread. All outputs become artifacts linked to the contact's profile.
3. **6 artifact types**: connection_note, outreach_draft, meeting_prep (includes person briefing + company intel + discussion guide + coaching), meeting_notes, action_plan, follow_up_draft.
4. **Browser companion**: Chrome Extension (Manifest V3) reads LinkedIn DOM. Minimal UI — all rich features in web app. Orchestration in content script (not service worker).
5. **Model tiering**: Haiku for scoring/simple tasks. Sonnet for complex reasoning (meeting prep, coaching).
6. **Agent learning**: user_memory JSON field on Users table. Learns writing style from edit patterns, tracks artifact outcomes, surfaces proactive follow-up suggestions.
7. **Context management**: Rolling summarization every 15 messages. On resume: summary + last 5 messages + artifact metadata.
8. **Company intel**: Backend calls search API (Perplexity/SerpAPI), injects results into Claude prompt. Claude never browses web directly.
9. **Manual contact entry**: 3 methods — tell agent in chat, paste LinkedIn URL, extension bookmark button.

## Tech Stack
Next.js 14+ (App Router) + React + TypeScript + Tailwind → Supabase (Auth + PostgreSQL + Realtime) → Anthropic Claude API → Chrome Extension Manifest V3 → Vercel hosting.

## What This Prototype Must Achieve
A functioning, beautiful product that the founder (Liyang) can use daily and share with 1-5 testers. Must look polished enough for IVC competition judges. Not a hackathon demo — a real tool.
