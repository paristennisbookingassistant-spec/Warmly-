"use client";

/**
 * Goals — gamified visual with sample data (Phase 3a per Warmly redesign).
 *
 * Per the May 5 strategic decision: ship the gamified UI now with hardcoded
 * sample data so the demo feels complete. Real backend wiring (streaks
 * derived from real activity, quests generated from real opportunities,
 * level computed from interaction count) is deferred to V2.
 *
 * When V2 lands, replace SAMPLE_DATA with values from useGoals() / a new
 * useStreak() hook. The visual layer should not need to change.
 *
 * Reference: docs/design/v2/project/src/goals.jsx
 */

// ---------------------------------------------------------------------------
// Sample data (replace with real wiring in V2)
// ---------------------------------------------------------------------------

const SAMPLE_DATA = {
  weekOf: "Week of May 5",
  today: 1, // 0=Mon → 6=Sun
  weekDays: ["M", "T", "W", "T", "F", "S", "S"] as const,
  weekStreak: [true, true, false, false, false, false, false], // 2/7 so far this week
  streakCount: 12,
  personalBest: 14,

  weekly: [
    {
      name: "Conversations",
      current: 4,
      target: 5,
      hint: "1 more to hit your weekly rhythm",
      met: false,
    },
    {
      name: "Reach-outs",
      current: 3,
      target: 3,
      hint: "Met. Anything beyond is bonus.",
      met: true,
    },
    {
      name: "Coffees",
      current: 1,
      target: 2,
      hint: "1 booked for Friday with Amélie",
      met: false,
    },
  ],

  level: {
    num: "III",
    name: "Connector",
    quote:
      "You don't keep score, but you remember who said what — and that's the rare thing.",
    progress: 64, // % to next level
    current: 87,
    next: 120,
    nextName: "Anchor",
  },

  habits: [
    {
      name: "Daily check-in",
      sub: "Open Warmly",
      cells: [3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3],
      total: 21,
      unit: "days",
    },
    {
      name: "Logged a touch",
      sub: "Coffee, call, msg",
      cells: [2, 3, 1, 2, 3, 2, 3, 0, 2, 3, 2, 3, 2, 1, 2, 3, 2, 3, 2, 3, 2],
      total: 17,
      unit: "of 21",
    },
    {
      name: "Followed a nudge",
      sub: "Acted on suggestion",
      cells: [1, 2, 0, 2, 1, 3, 2, 1, 0, 2, 1, 2, 3, 1, 0, 2, 1, 3, 2, 2, 1],
      total: 14,
      unit: "of 21",
    },
    {
      name: "Asked an intro",
      sub: "From an existing contact",
      cells: [0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 0, 1],
      total: 5,
      unit: "this month",
    },
  ],

  quests: [
    {
      tag: "This week",
      title: "Reconnect with someone you haven't seen in 90+ days",
      body: "Marie Chen, Tomas Volkov and 4 others are due. Pick one — Warmly drafts the message.",
      progress: 0,
      target: 1,
      cta: "See suggestions",
      done: false,
    },
    {
      tag: "Quiet wins",
      title: "Send 3 thank-yous after coffees",
      body: "A short thank-you within 24h doubles the chance someone remembers you. You're at 1/3 this month.",
      progress: 1,
      target: 3,
      cta: "Draft one",
      done: false,
    },
    {
      tag: "Network depth",
      title: "Add a second connection from your INSEAD MBA cohort",
      body: "Right now 17% of your contacts are from school. Diversifying reduces the 'echo' in suggestions.",
      progress: 1,
      target: 2,
      cta: "Browse cohort",
      done: false,
    },
    {
      tag: "Done",
      title: "Logged 5 conversations this week",
      body: "On a Wednesday — earliest you've hit it in 6 weeks. Streak preserved.",
      progress: 5,
      target: 5,
      cta: null,
      done: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FlameIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 2-3 6a6 6 0 0 0 12 0c0-6-6-11-6-11z" />
    </svg>
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}

function ArrowRightIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Conic-gradient progress ring. The inner mask creates the donut effect.
 */
function ProgressRing({
  pct,
  met = false,
  size = 80,
}: {
  pct: number;
  met?: boolean;
  size?: number;
}) {
  const color = met ? "var(--good)" : "var(--accent)";
  return (
    <div
      className="relative rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${pct}%, var(--surface-2) ${pct}% 100%)`,
      }}
    >
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: 8,
          background: "var(--surface)",
          boxShadow: "inset 0 0 0 1px var(--line-soft)",
        }}
      >
        <span
          className="font-mono text-[14px] tabular-nums font-medium"
          style={{ color: met ? "var(--good)" : "var(--ink)" }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

/**
 * 21-cell heatmap row showing 3 weeks of habit activity. Cell intensity
 * (0-3) maps to opacity of the accent color.
 */
function HeatmapRow({
  habit,
}: {
  habit: (typeof SAMPLE_DATA.habits)[number];
}) {
  return (
    <div
      className="grid items-center gap-4 py-3"
      style={{
        gridTemplateColumns: "minmax(180px, 220px) 1fr 80px",
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      <div>
        <div className="text-[13px] font-medium text-ink">{habit.name}</div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
          {habit.sub}
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(21, 1fr)" }}>
        {habit.cells.map((level, i) => (
          <div
            key={i}
            title={`Day ${i + 1} · level ${level}`}
            className="aspect-square rounded-[2px] transition-colors"
            style={{
              background:
                level === 0
                  ? "var(--surface-2)"
                  : level === 1
                  ? "color-mix(in oklch, var(--accent) 28%, var(--bg-sunk))"
                  : level === 2
                  ? "color-mix(in oklch, var(--accent) 55%, var(--bg-sunk))"
                  : "var(--accent)",
            }}
          />
        ))}
      </div>
      <div className="text-right">
        <div
          className="font-display italic text-[22px] leading-none"
          style={{ color: "var(--ink)" }}
        >
          {habit.total}
        </div>
        <div className="text-[10.5px] mt-1" style={{ color: "var(--ink-4)" }}>
          {habit.unit}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  const d = SAMPLE_DATA;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
          {/* Header — title + streak card */}
          <header className="grid gap-8 items-end" style={{ gridTemplateColumns: "1fr auto" }}>
            <div className="max-w-xl">
              <p
                className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-3"
                style={{ color: "var(--ink-3)" }}
              >
                Goals · {d.weekOf}
              </p>
              <h1 className="font-display italic text-[40px] leading-[1.05] tracking-tight text-ink">
                Keep tending.
              </h1>
              <p
                className="text-[14px] mt-3 leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                Networks decay.{" "}
                <span className="font-medium" style={{ color: "var(--ink)" }}>
                  Warmly
                </span>{" "}
                keeps a quiet score — not to nag you, but so you can see the
                shape of your effort. {d.weekStreak.filter(Boolean).length}{" "}
                {d.weekStreak.filter(Boolean).length === 1 ? "day" : "days"} in,
                you&rsquo;re on pace.
              </p>
            </div>

            {/* Streak card */}
            <div
              className="flex items-start gap-4 rounded-xl px-5 py-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                }}
              >
                <FlameIcon size={20} />
              </div>
              <div>
                <div className="font-display italic text-[28px] leading-none text-ink">
                  {d.streakCount}
                  <span
                    className="font-sans not-italic text-[12.5px] ml-2"
                    style={{ color: "var(--ink-3)" }}
                  >
                    day streak
                  </span>
                </div>
                <div
                  className="text-[11px] mt-1.5"
                  style={{ color: "var(--ink-4)" }}
                >
                  Personal best · {d.personalBest}
                </div>
                <div className="flex gap-1 mt-2">
                  {d.weekDays.map((dayName, i) => {
                    const on = d.weekStreak[i];
                    const today = i === d.today;
                    return (
                      <div
                        key={i}
                        title={dayName}
                        className="w-3 h-3 rounded-full transition-colors"
                        style={{
                          background: on
                            ? "var(--accent)"
                            : "var(--surface-2)",
                          boxShadow: today
                            ? `0 0 0 2px var(--accent-soft)`
                            : `inset 0 0 0 1px var(--line-soft)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          {/* Weekly targets — 3 ring cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {d.weekly.map((w) => {
              const pct = Math.min(100, Math.round((w.current / w.target) * 100));
              return (
                <div
                  key={w.name}
                  className="rounded-xl p-5 flex items-center gap-4"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    boxShadow: "var(--shadow-1)",
                  }}
                >
                  <ProgressRing pct={pct} met={w.met} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10.5px] uppercase tracking-[0.12em] font-medium"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {w.name}
                    </div>
                    <div className="font-display italic text-[26px] leading-none mt-1 text-ink">
                      {w.current}
                      <span
                        className="font-sans not-italic text-[12px] ml-2"
                        style={{ color: "var(--ink-3)" }}
                      >
                        of {w.target}
                        {w.met ? " · met" : ""}
                      </span>
                    </div>
                    <div
                      className="text-[11.5px] mt-2 leading-relaxed"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {w.hint}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Level / identity */}
          <section
            className="rounded-xl p-6 flex items-center gap-6"
            style={{
              background: "var(--bg-sunk)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div
                className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Networking level
              </div>
              <div className="text-[18px] text-ink">
                Level {d.level.num} ·{" "}
                <span className="font-display italic text-[22px]">
                  {d.level.name}
                </span>
              </div>
              <div
                className="font-display italic text-[16px] leading-relaxed mt-3"
                style={{ color: "var(--ink-2)" }}
              >
                &ldquo;{d.level.quote}&rdquo;
              </div>
              <div
                className="h-1.5 rounded-full mt-4 overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full rounded-full progress-fill"
                  style={{
                    background: "var(--accent)",
                    width: `${d.level.progress}%`,
                  }}
                />
              </div>
              <div
                className="flex items-center justify-between mt-2 text-[11.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                <span>
                  {d.level.current} / {d.level.next} touches → Level IV ·{" "}
                  {d.level.nextName}
                </span>
                <span>{d.level.next - d.level.current} to go</span>
              </div>
            </div>
            <div
              className="font-display italic text-[64px] leading-none flex-shrink-0 px-6"
              style={{ color: "var(--accent)" }}
            >
              {d.level.num}
            </div>
          </section>

          {/* Habits heatmap */}
          <section>
            <h2 className="font-display italic text-[24px] text-ink leading-tight tracking-tight">
              Habits, last three weeks.
            </h2>
            <p
              className="text-[13px] mt-2 leading-relaxed max-w-2xl"
              style={{ color: "var(--ink-3)" }}
            >
              Each square is a day. Brighter means more activity. The point
              isn&rsquo;t to fill the grid — it&rsquo;s to notice when it goes
              pale.
            </p>
            <div
              className="mt-5 rounded-xl px-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              {d.habits.map((h, idx) => (
                <div key={h.name} style={idx === 0 ? { paddingTop: 4 } : undefined}>
                  <HeatmapRow habit={h} />
                </div>
              ))}
            </div>
          </section>

          {/* Quests */}
          <section>
            <h2 className="font-display italic text-[24px] text-ink leading-tight tracking-tight">
              Suggested next moves.
            </h2>
            <p
              className="text-[13px] mt-2 leading-relaxed max-w-2xl"
              style={{ color: "var(--ink-3)" }}
            >
              Small, specific, optional. Each one comes with a draft you can
              send in a click — or skip.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {d.quests.map((q, i) => {
                const pct = Math.round((q.progress / q.target) * 100);
                return (
                  <div
                    key={i}
                    className="rounded-xl p-5 flex flex-col"
                    style={{
                      background: q.done ? "var(--bg-sunk)" : "var(--surface)",
                      border: "1px solid var(--line)",
                      boxShadow: q.done ? "none" : "var(--shadow-1)",
                      opacity: q.done ? 0.85 : 1,
                    }}
                  >
                    <div
                      className="text-[10.5px] uppercase tracking-[0.12em] font-medium"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {q.tag}
                    </div>
                    <h3 className="text-[15px] font-medium text-ink mt-2 leading-snug">
                      {q.title}
                    </h3>
                    <p
                      className="text-[12.5px] mt-2 leading-relaxed flex-1"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {q.body}
                    </p>
                    <div
                      className="h-1 rounded-full mt-4 overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <div
                        className="h-full rounded-full progress-fill"
                        style={{
                          background: q.done ? "var(--good)" : "var(--accent)",
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between mt-3 text-[11.5px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <span>
                        {q.progress} / {q.target}
                      </span>
                      {q.cta && (
                        <button
                          className="inline-flex items-center gap-1 hover:text-ink transition-colors font-medium"
                          style={{ color: "var(--accent-ink)" }}
                        >
                          {q.cta} <ArrowRightIcon />
                        </button>
                      )}
                      {q.done && (
                        <span
                          className="inline-flex items-center gap-1 font-medium"
                          style={{ color: "var(--good)" }}
                        >
                          <CheckIcon /> Complete
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* V2 note */}
          <p
            className="text-[10.5px] text-center pt-4"
            style={{ color: "var(--ink-4)" }}
          >
            Showing sample data — real streaks, habits, and quests will wire
            up to your actual activity in the next release.
          </p>
        </div>
      </div>
    </div>
  );
}
