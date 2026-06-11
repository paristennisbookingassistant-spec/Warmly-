"use client";

/**
 * components/v2/prep/AgendaTab.tsx
 * Tab 4 — Agenda: a local template derived from the chosen duration.
 * Clearly labelled as a suggested template — not AI-generated.
 */

import type { DurationOption } from "./types";

interface AgendaBlock {
  range: string;
  title: string;
  body: string;
}

function buildAgenda(duration: DurationOption): AgendaBlock[] {
  switch (duration) {
    case "15":
      return [
        { range: "0–2 min",  title: "Warm-up",         body: "Quick thank-you + frame the conversation briefly." },
        { range: "2–8 min",  title: "Their world",     body: "Ask one open question about their current focus. Listen more than you talk." },
        { range: "8–12 min", title: "Your angle",      body: "Share your transition story concisely. One hook, no life story." },
        { range: "12–14 min", title: "The ask",        body: "Make your specific ask. Keep it actionable and low-friction." },
        { range: "14–15 min", title: "Close",          body: "Thank them, confirm next steps, and offer to follow up by email." },
      ];
    case "30":
      return [
        { range: "0–3 min",  title: "Warm-up",         body: "Set the frame: why you asked to meet, what you're hoping to learn." },
        { range: "3–12 min", title: "Their world",     body: "Let them talk. Open questions about role, company trajectory, recent priorities." },
        { range: "12–20 min", title: "Shared ground", body: "Find the overlap. Bring your transition story in naturally — tie it to what they've shared." },
        { range: "20–27 min", title: "The ask",        body: "Plant your specific ask or test. Don't rush this — you've earned the credibility." },
        { range: "27–30 min", title: "Close",          body: "Summarise the value exchange. Confirm next steps before you hang up." },
      ];
    case "45":
      return [
        { range: "0–5 min",  title: "Warm-up",         body: "Genuine rapport. Comment on something from their profile or a mutual." },
        { range: "5–18 min", title: "Their world",     body: "Explore their journey: what they optimise for, what surprised them, what they'd do differently." },
        { range: "18–30 min", title: "Shared ground", body: "Your story meets theirs. Seek validation on your thesis; invite honest pushback." },
        { range: "30–40 min", title: "The ask",        body: "Make your ask, discuss options, be responsive to what they suggest." },
        { range: "40–45 min", title: "Close",          body: "Agree on next steps. Offer to be useful in return." },
      ];
    case "60":
      return [
        { range: "0–5 min",  title: "Warm-up",         body: "Casual opener. Find a genuine shared thread to warm up on." },
        { range: "5–20 min", title: "Their world",     body: "Deep dive on their experience and perspective. Use your question bank — don't rush." },
        { range: "20–35 min", title: "Your story",     body: "Your transition narrative in full. Invite reactions and questions." },
        { range: "35–50 min", title: "Collaboration",  body: "Explore the value exchange: what you can offer, what you're looking for." },
        { range: "50–57 min", title: "The ask",        body: "Concrete, specific, low-friction. Make it easy to say yes." },
        { range: "57–60 min", title: "Close",          body: "Summarise, thank, confirm next steps." },
      ];
  }
}

interface Props {
  duration: DurationOption;
}

export function AgendaTab({ duration }: Props) {
  const blocks = buildAgenda(duration);

  return (
    <div className="flex flex-col gap-8 fade-up">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <div
          className="font-mono-tag"
          style={{ color: "var(--ink-3)", letterSpacing: "0.12em" }}
        >
          Agenda
        </div>
        <span style={{ color: "var(--ink-3)", fontSize: 13 }}>&middot; {duration} min</span>
        <span
          className="font-mono-tag ml-auto"
          style={{ color: "var(--ink-4)", fontSize: 9.5 }}
        >
          Template — edit freely
        </span>
      </div>

      {/* Tip banner */}
      <div
        className="rounded-xl border px-4 py-3 text-[13px] leading-relaxed"
        style={{
          borderColor: "#e5d8be",
          background: "#fdf6e9",
          color: "var(--ink-3)",
        }}
      >
        This is a suggested agenda based on your {duration}-minute slot. It&apos;s a
        starting point — adapt it to how the conversation actually unfolds.
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-5">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="grid gap-6 items-baseline"
            style={{ gridTemplateColumns: "110px 1fr" }}
          >
            <div
              className="font-mono-tag"
              style={{ color: "#b87a4a", fontSize: 11 }}
            >
              {b.range}
            </div>
            <div>
              <div
                className="text-[15px] font-medium mb-1"
                style={{ color: "var(--ink)" }}
              >
                {b.title}
              </div>
              <p
                className="text-[13.5px] leading-[1.6]"
                style={{ color: "var(--ink-2)", maxWidth: 620 }}
              >
                {b.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tone reminder */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ borderColor: "#e5d8be", background: "var(--surface)" }}
      >
        <div
          className="font-mono-tag mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Tone reminder
        </div>
        <p
          className="text-[14px] leading-[1.65] italic"
          style={{ color: "var(--ink-2)", maxWidth: 720 }}
        >
          Stay genuinely curious. You&apos;re here to learn from them — not to pitch.
          The best networking conversations feel like two smart people exploring a problem
          together. Let them talk 60% of the time.
        </p>
      </div>
    </div>
  );
}
