"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Step schema
// ---------------------------------------------------------------------------

type Option = { k: string; label: string; hint: string };

interface Step {
  agentMsg: string;
  field: string;
  label: string;
  placeholder?: string;
  quickPicks?: string[];
  multiline?: boolean;
  uploadOk?: boolean;
  options?: Option[];
  multi?: boolean;
  custom?: "extension";
}

const STEPS: Step[] = [
  {
    agentMsg:
      "Hi. Before we start working together, let me get to know you, and you can get to know me. This should take about 4 minutes.\n\nFirst thing, what should I go by? Most users give their coach a name so that when I show up in reminders or drafts, it feels like a person, not a tool.",
    field: "agentName",
    label: "Coach name",
    placeholder: "e.g. Ada, Orbit, Nori…",
    quickPicks: ["Ada", "Nori", "Orbit", "Warmly"],
  },
  {
    agentMsg:
      "Nice. So, who am I working with? I'll start from your own career story. You can paste a CV or a bio, or just tell me the shape of it.",
    field: "about",
    label: "About you",
    placeholder: "Or drop your CV / LinkedIn / cover letter…",
    multiline: true,
    uploadOk: true,
  },
  {
    agentMsg:
      "Good. Now, what are you networking for? Be as specific as you can. 'I want a growth VC role in Europe' is more useful to me than 'I want to explore'.",
    field: "goal",
    label: "Networking goal",
    placeholder: "What outcome are you reaching for?",
    multiline: true,
  },
  {
    agentMsg:
      "How do you prefer to communicate? This tunes every message I draft for you.",
    field: "style",
    label: "Communication style",
    options: [
      { k: "warm", label: "Warm & personal", hint: "First names, some humour, like writing to a friend" },
      { k: "professional", label: "Polished & professional", hint: "Formal, precise, zero emoji" },
      { k: "concise", label: "Concise & direct", hint: "Short sentences, no filler" },
      { k: "adaptive", label: "Adapt to each recipient", hint: "I'll read the contact and match" },
    ],
  },
  {
    agentMsg:
      "Where is your network weakest? I'll weight discovery toward what's missing.",
    field: "gaps",
    label: "Weak spots in your network",
    options: [
      { k: "industry", label: "Target industry", hint: "You don't know people in the space you want to enter" },
      { k: "seniority", label: "Senior people", hint: "Your peers are mostly at your level" },
      { k: "geography", label: "A target geography", hint: "You're strong at home, weak abroad" },
      { k: "type", label: "A specific role type", hint: "e.g. investors, founders, platform roles" },
    ],
    multi: true,
  },
  {
    agentMsg:
      "Last thing, the Chrome extension. This is how I help you find people on LinkedIn. It runs in your own browser, reads only what you can already see, and never sends messages on its own. Takes 30 seconds.",
    field: "extension",
    label: "Chrome extension",
    custom: "extension",
  },
];

// ---------------------------------------------------------------------------
// Types for answers
// ---------------------------------------------------------------------------

type Answers = {
  agentName?: string;
  about?: string;
  goal?: string;
  style?: Option;
  gaps?: string[];
  extension?: { label: string };
};

type TranscriptEntry = { from: "agent" | "user"; text: string };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface OnboardingProps {
  onDone: () => void;
  onSkip?: () => void;
}

export default function Onboarding({ onDone, onSkip }: OnboardingProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    { from: "agent", text: STEPS[0].agentMsg },
  ]);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [transcript]);

  const step = STEPS[stepIdx];
  const pct = Math.round((stepIdx / STEPS.length) * 100);

  function submit(value: string | string[] | Option | { label: string }) {
    let label: string;
    if (Array.isArray(value)) {
      label =
        value
          .map(
            (v) => step.options?.find((o) => o.k === v)?.label ?? v
          )
          .join(", ") || "—";
    } else if (typeof value === "object") {
      label = (value as { label: string }).label;
    } else {
      label = String(value);
    }

    setAnswers((a) => ({ ...a, [step.field]: value as never }));
    const next: TranscriptEntry[] = [
      ...transcript,
      { from: "user", text: label || "—" },
    ];

    if (stepIdx < STEPS.length - 1) {
      next.push({ from: "agent", text: STEPS[stepIdx + 1].agentMsg });
      setTranscript(next);
      setStepIdx(stepIdx + 1);
      setDraft("");
      setMulti([]);
    } else {
      const farewell = `Perfect. I've got what I need to start. Meet your coach, ${
        answers.agentName ?? "Warmly"
      }.`;
      setTranscript([...next, { from: "agent", text: farewell }]);
      const merged: Answers = { ...answers, [step.field]: value as never };
      // Local cache so we can show the user what they entered if needed.
      try {
        localStorage.setItem("warmly.onboarding.answers", JSON.stringify(merged));
      } catch {
        // ignore
      }
      // Server: build profile_md from the answers so the coach actually has
      // memory on the very next chat turn. Fire-and-forget; we don't block
      // the transition into the app on the LLM call (which can take a few
      // seconds). The bootstrap path in the messages route also covers us
      // if this request happens to fail.
      void fetch("/api/users/me/onboarding-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).catch((err) => {
        console.error("onboarding-complete POST failed:", err);
      });
      setTimeout(onDone, 1200);
    }
  }

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        background: "var(--bg)",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
      }}
    >
      {/* LEFT — conversational flow */}
      <div className="flex flex-col overflow-hidden">
        {/* Top strip: progress bar + skip */}
        <div
          className="flex items-center gap-4 flex-shrink-0 px-6 pt-3 pb-2"
        >
          <div
            className="h-1 rounded-full overflow-hidden flex-1"
            style={{ background: "var(--line-soft)" }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors hover:opacity-80"
              style={{ color: "var(--ink-3)" }}
            >
              Skip for now →
            </button>
          )}
        </div>

        <div
          ref={streamRef}
          className="flex-1 overflow-y-auto px-10 py-10"
        >
          <div className="max-w-[640px] mx-auto">
            {/* Intro */}
            {stepIdx === 0 && (
              <div className="mb-8">
                <p
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-3"
                  style={{ color: "var(--ink-3)" }}
                >
                  Setup · 4 min
                </p>
                <h1
                  className="font-display italic text-[44px] leading-[1.05] tracking-tight mb-3"
                  style={{ color: "var(--ink)" }}
                >
                  Let&rsquo;s build your coach.
                </h1>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  Everything you tell me becomes part of my memory. You can
                  edit any of it later from Settings.
                </p>
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-4 mb-6">
              {transcript.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.from === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-medium"
                    style={{
                      background:
                        m.from === "agent" ? "var(--ink)" : "var(--surface-2)",
                      color: m.from === "agent" ? "var(--bg)" : "var(--ink-2)",
                    }}
                  >
                    {m.from === "agent" ? (
                      <span className="font-display italic text-[15px] -mt-0.5">
                        c
                      </span>
                    ) : (
                      "AM"
                    )}
                  </div>
                  <div
                    className="max-w-[480px] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed"
                    style={{
                      background:
                        m.from === "agent" ? "var(--surface)" : "var(--ink)",
                      color:
                        m.from === "agent" ? "var(--ink)" : "var(--bg)",
                      border:
                        m.from === "agent"
                          ? "1px solid var(--line-soft)"
                          : "none",
                      borderBottomLeftRadius:
                        m.from === "agent" ? "0.25rem" : undefined,
                      borderBottomRightRadius:
                        m.from === "user" ? "0.25rem" : undefined,
                    }}
                  >
                    {m.text.split("\n\n").map((p, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            {stepIdx < STEPS.length && (
              <div className="ml-10">
                {/* Single-select options */}
                {step.options && !step.multi && (
                  <div className="grid grid-cols-1 gap-2">
                    {step.options.map((o) => (
                      <button
                        key={o.k}
                        onClick={() => submit(o)}
                        className="text-left px-4 py-3 rounded-lg transition-all hover:translate-y-[-1px]"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div
                          className="font-medium text-[13.5px] mb-0.5"
                          style={{ color: "var(--ink)" }}
                        >
                          {o.label}
                        </div>
                        <div
                          className="text-[12px]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {o.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Multi-select options */}
                {step.options && step.multi && (
                  <>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      {step.options.map((o) => {
                        const on = multi.includes(o.k);
                        return (
                          <button
                            key={o.k}
                            onClick={() =>
                              setMulti((arr) =>
                                on ? arr.filter((x) => x !== o.k) : [...arr, o.k]
                              )
                            }
                            className="text-left px-4 py-3 rounded-lg transition-all"
                            style={{
                              background: on
                                ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                                : "var(--surface)",
                              border: on
                                ? "1px solid var(--accent)"
                                : "1px solid var(--line)",
                            }}
                          >
                            <div
                              className="font-medium text-[13.5px] mb-0.5 flex items-center gap-1.5"
                              style={{ color: "var(--ink)" }}
                            >
                              {o.label}
                              {on && (
                                <span style={{ color: "var(--accent)" }}>✓</span>
                              )}
                            </div>
                            <div
                              className="text-[12px]"
                              style={{ color: "var(--ink-3)" }}
                            >
                              {o.hint}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => submit([])}
                        className="px-3 py-1.5 rounded-md text-[12px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Skip
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => submit(multi)}
                        className="px-3.5 py-1.5 rounded-md text-[12.5px] font-medium"
                        style={{
                          background: "var(--ink)",
                          color: "var(--bg)",
                        }}
                      >
                        Continue →
                      </button>
                    </div>
                  </>
                )}

                {/* Extension custom step */}
                {step.custom === "extension" && (
                  <div
                    className="px-5 py-4 rounded-lg"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <ol
                      className="space-y-2 text-[13px] leading-relaxed mb-4"
                      style={{ color: "var(--ink-2)" }}
                    >
                      <li>
                        <strong style={{ color: "var(--ink)" }}>1.</strong>{" "}
                        Click below to open the Chrome Web Store
                      </li>
                      <li>
                        <strong style={{ color: "var(--ink)" }}>2.</strong>{" "}
                        Click &ldquo;Add to Chrome&rdquo;
                      </li>
                      <li>
                        <strong style={{ color: "var(--ink)" }}>3.</strong> Pin
                        the extension so you can reach it from LinkedIn
                      </li>
                    </ol>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => submit({ label: "Skip for now" })}
                        className="px-3 py-1.5 rounded-md text-[12px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Skip for now
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => submit({ label: "Installed · ready" })}
                        className="px-3.5 py-1.5 rounded-md text-[12.5px] font-medium"
                        style={{
                          background: "var(--ink)",
                          color: "var(--bg)",
                        }}
                      >
                        Add to Chrome ↗
                      </button>
                    </div>
                  </div>
                )}

                {/* Free-text step */}
                {!step.options && !step.custom && (
                  <>
                    {step.quickPicks && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {step.quickPicks.map((q) => (
                          <button
                            key={q}
                            onClick={() => setDraft(q)}
                            className="px-3 py-1 rounded-full text-[12px] transition-colors"
                            style={{
                              background:
                                draft === q ? "var(--ink)" : "var(--surface)",
                              color: draft === q ? "var(--bg)" : "var(--ink-2)",
                              border:
                                draft === q ? "none" : "1px solid var(--line)",
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                    <div
                      className="rounded-lg overflow-hidden"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {step.multiline ? (
                        <textarea
                          placeholder={step.placeholder}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none resize-none placeholder:text-ink-4"
                          style={{ color: "var(--ink)" }}
                        />
                      ) : (
                        <input
                          placeholder={step.placeholder}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none placeholder:text-ink-4"
                          style={{ color: "var(--ink)" }}
                        />
                      )}
                      <div
                        className="flex items-center gap-2 px-3 py-2"
                        style={{ borderTop: "1px solid var(--line-soft)" }}
                      >
                        {step.uploadOk && (
                          <button
                            disabled
                            className="px-2.5 py-1 rounded-md text-[11.5px] opacity-50 cursor-not-allowed"
                            style={{ color: "var(--ink-3)" }}
                          >
                            ⌘ Attach CV / cover letter
                          </button>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => submit(draft)}
                          disabled={!draft.trim()}
                          className="px-3.5 py-1.5 rounded-md text-[12.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background: "var(--ink)",
                            color: "var(--bg)",
                          }}
                        >
                          Continue →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — live memory preview */}
      <aside
        className="overflow-y-auto px-6 py-8 space-y-6"
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--line-soft)",
        }}
      >
        <div>
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-1"
            style={{ color: "var(--ink-3)" }}
          >
            Being written
          </p>
          <p
            className="font-mono text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            ~/memory/user.md
          </p>
        </div>

        <div
          className="rounded-lg p-4 font-mono text-[12.5px] leading-[1.7]"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line-soft)",
            color: "var(--ink-2)",
          }}
        >
          <div
            className="font-medium text-[13px] mb-3"
            style={{ color: "var(--ink)" }}
          >
            #{" "}
            {answers.agentName
              ? `${answers.agentName}'s memory of you`
              : "Your coach's memory"}
          </div>
          <UserMd answers={answers} />
        </div>

        <div>
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-1"
            style={{ color: "var(--ink-3)" }}
          >
            System
          </p>
          <p
            className="font-mono text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            ~/memory/agents.md
          </p>
        </div>

        <div
          className="rounded-lg p-4 font-mono text-[11.5px] leading-[1.6] space-y-1"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line-soft)",
            color: "var(--ink-3)",
          }}
        >
          <div>role: networking coach</div>
          <div>voice: {answers.style?.k ?? "—"}</div>
          <div>goals_priority: {answers.goal ? "defined" : "—"}</div>
          <div>
            network_gaps:{" "}
            {Array.isArray(answers.gaps) && answers.gaps.length > 0
              ? answers.gaps.join(", ")
              : "—"}
          </div>
          <div>extension: {answers.extension?.label ?? "—"}</div>
        </div>
      </aside>
    </div>
  );
}

function UserMd({ answers }: { answers: Answers }) {
  const rows: Array<[string, string]> = [];
  if (answers.about) rows.push(["## Background", answers.about]);
  if (answers.goal) rows.push(["## Current networking goal", answers.goal]);
  if (answers.style)
    rows.push([
      "## Communication style",
      `${answers.style.label} — ${answers.style.hint}`,
    ]);
  if (Array.isArray(answers.gaps) && answers.gaps.length > 0) {
    rows.push([
      "## Network gaps (weight discovery here)",
      answers.gaps.map((g) => `- ${g}`).join("\n"),
    ]);
  }

  if (rows.length === 0) {
    return (
      <div className="italic" style={{ color: "var(--ink-4)" }}>
        Your answers will appear here as we talk.
      </div>
    );
  }

  return (
    <>
      {rows.map(([h, b], i) => (
        <div key={i} className={i > 0 ? "mt-4" : ""}>
          <div
            className="font-medium mb-1"
            style={{ color: "var(--ink)" }}
          >
            {h}
          </div>
          <div className="whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
            {b}
          </div>
        </div>
      ))}
    </>
  );
}
