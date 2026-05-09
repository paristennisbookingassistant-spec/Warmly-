"use client";

import { useEffect, useState } from "react";
import type { Plan } from "@/types/meeting";

type Mode = "pick" | "live" | "uploading";

export default function Capture({
  plan,
  onEnd,
}: {
  plan: Plan;
  onEnd: () => void;
}) {
  const [mode, setMode] = useState<Mode>("pick");
  const [elapsed, setElapsed] = useState(0);
  const [tick, setTick] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [waveform] = useState(() =>
    Array.from({ length: 80 }, () => Math.random() * 0.8 + 0.2)
  );

  // Live timer
  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Fake upload progress
  useEffect(() => {
    if (mode !== "uploading") return;
    const id = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setTimeout(onEnd, 600);
          return 100;
        }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(id);
  }, [mode, onEnd]);

  if (mode === "live") {
    const min = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const sec = (elapsed % 60).toString().padStart(2, "0");
    return (
      <div
        className="rounded-2xl px-8 py-10"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-10">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: "var(--bad)" }}
          />
          <span
            className="font-mono text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--bad)" }}
          >
            Recording
          </span>
          <span
            className="font-mono text-[14px] tabular-nums"
            style={{ color: "var(--ink)" }}
          >
            {min}:{sec}
          </span>
          <div className="flex-1" />
          <button
            className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{
              background: "var(--surface-2)",
              color: "var(--ink)",
              border: "1px solid var(--line-soft)",
            }}
          >
            Pause
          </button>
          <button
            onClick={onEnd}
            className="px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            End &amp; recap
          </button>
        </div>

        {/* Center */}
        <div className="text-center max-w-[480px] mx-auto mb-8">
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-3"
            style={{ color: "var(--ink-3)" }}
          >
            A meeting is being captured
          </p>
          <h2
            className="font-display italic text-[32px] leading-tight tracking-tight mb-3"
            style={{ color: "var(--ink)" }}
          >
            The coach is listening, quietly.
          </h2>
          <p
            className="text-[13.5px] leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            No on-screen prompts during the call. The recap, action items, and
            coach notes appear the moment you press{" "}
            <em className="font-display italic">End &amp; recap</em>.
          </p>
        </div>

        {/* Waveform */}
        <div className="flex items-end justify-center gap-[2px] h-20 mb-5">
          {waveform.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full transition-all"
              style={{
                height: `${Math.max(
                  6,
                  h * (0.5 + 0.5 * Math.sin((tick + i) * 0.35)) * 100
                )}%`,
                opacity: 0.4 + 0.6 * Math.abs(Math.sin((tick * 0.5 + i) * 0.18)),
                background: "var(--accent)",
              }}
            />
          ))}
        </div>

        {/* Auto-detect line */}
        <div
          className="text-center font-mono text-[10.5px] uppercase tracking-[0.14em] flex items-center justify-center gap-2"
          style={{ color: "var(--ink-3)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--good)" }}
          />
          <span>Two speakers detected</span>
          <span>·</span>
          <span>Audio quality, clear</span>
          <span>·</span>
          <span>
            {plan.freeMinutesCap - plan.freeMinutesUsed} free min remaining
            this month
          </span>
        </div>

        <p
          className="mt-8 pt-4 text-center text-[11.5px] leading-relaxed"
          style={{
            borderTop: "1px solid var(--line-soft)",
            color: "var(--ink-3)",
          }}
        >
          Capturing audio. Make sure everyone on the call has been told.
        </p>
      </div>
    );
  }

  if (mode === "uploading") {
    return (
      <div
        className="rounded-2xl px-8 py-12 text-center max-w-[560px] mx-auto"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <p
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--ink-3)" }}
        >
          Uploading &amp; transcribing
        </p>
        <h2
          className="font-display italic text-[28px] leading-tight tracking-tight mb-6"
          style={{ color: "var(--ink)" }}
        >
          Reading the recording…
        </h2>
        <div
          className="h-1.5 rounded-full overflow-hidden mb-6"
          style={{ background: "var(--line-soft)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${uploadProgress}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <div
          className="grid grid-cols-4 gap-2 mb-6 font-mono text-[10.5px] uppercase tracking-wider"
        >
          <Step on={uploadProgress > 5}>1 · Upload</Step>
          <Step on={uploadProgress > 35}>2 · Transcribe</Step>
          <Step on={uploadProgress > 70}>3 · Recap</Step>
          <Step on={uploadProgress >= 100}>4 · Surface actions</Step>
        </div>
        <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
          This usually takes about a minute. We&rsquo;ll drop you on the recap
          when it&rsquo;s ready.
        </p>
      </div>
    );
  }

  // Mode = pick
  return (
    <div className="max-w-[720px] mx-auto py-8">
      <div className="text-center mb-10">
        <p
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--ink-3)" }}
        >
          New capture
        </p>
        <h2
          className="font-display italic text-[36px] leading-tight tracking-tight mb-3"
          style={{ color: "var(--ink)" }}
        >
          Two ways in.
        </h2>
        <p
          className="text-[14px] leading-relaxed max-w-[480px] mx-auto"
          style={{ color: "var(--ink-2)" }}
        >
          Both produce the same recap, a clean summary, action items, and the
          coach&rsquo;s read on what to do next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PathCard
          glyph={
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: "var(--bad)" }}
            />
          }
          title="Capture live"
          body="Press record now. The coach stays out of the way during the call."
          cta="Start recording →"
          onClick={() => setMode("live")}
        />
        <PathCard
          glyph={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--ink-2)" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          }
          title="Upload a file"
          body="Drop an audio or video recording from any platform. Recap arrives in about a minute."
          cta="Choose a file →"
          onClick={() => setMode("uploading")}
        />
      </div>

      <p
        className="mt-8 text-center text-[12px] leading-relaxed"
        style={{ color: "var(--ink-3)" }}
      >
        Recording another person may be regulated in your jurisdiction. The
        coach will display a clear indicator while capture is active, getting
        consent is your responsibility.
      </p>
    </div>
  );
}

function Step({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div
      className="px-2 py-2 rounded-md transition-colors"
      style={{
        background: on ? "color-mix(in oklch, var(--accent) 12%, var(--surface))" : "var(--surface-2)",
        color: on ? "var(--accent)" : "var(--ink-4)",
      }}
    >
      {children}
    </div>
  );
}

function PathCard({
  glyph,
  title,
  body,
  cta,
  onClick,
}: {
  glyph: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-6 rounded-xl transition-all hover:translate-y-[-2px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line-soft)",
        }}
      >
        {glyph}
      </div>
      <h3
        className="font-display italic text-[22px] leading-tight tracking-tight mb-2"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] leading-relaxed mb-3"
        style={{ color: "var(--ink-2)" }}
      >
        {body}
      </p>
      <span
        className="font-mono text-[11px] uppercase tracking-wider"
        style={{ color: "var(--accent)" }}
      >
        {cta}
      </span>
    </button>
  );
}
