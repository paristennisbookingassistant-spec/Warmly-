import type { Plan } from "@/types/meeting";

export default function EmptyState({
  plan,
  onStartLive,
  onUpload,
}: {
  plan: Plan;
  onStartLive: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="max-w-[840px] mx-auto px-8 pt-16 pb-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <p
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--ink-3)" }}
        >
          Meetings · new
        </p>
        <h1
          className="font-display italic text-[52px] leading-[1.02] tracking-tight mb-4"
          style={{ color: "var(--ink)" }}
        >
          A second memory for every call.
        </h1>
        <p
          className="text-[15px] leading-relaxed max-w-[560px] mx-auto"
          style={{ color: "var(--ink-2)" }}
        >
          When you finish a meeting, the most important thing isn&rsquo;t what
          was said, it&rsquo;s what you&rsquo;ll do about it. The coach
          captures the call, finds the actions, and remembers them so you
          don&rsquo;t have to.
        </p>
      </div>

      {/* Two paths */}
      <div className="flex items-center gap-4 mb-12">
        <PathButton
          glyph={
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: "var(--bad)" }}
            />
          }
          title="Capture live"
          body="Hit record at the start of a call. The coach listens, transcribes, and writes the recap the second you hang up."
          cta="Start a recording →"
          onClick={onStartLive}
        />
        <span
          className="font-display italic text-[14px] flex-shrink-0"
          style={{ color: "var(--ink-3)" }}
        >
          or
        </span>
        <PathButton
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
          title="Upload after"
          body="Already finished the call? Drop in an audio or video file. You'll have a recap in about a minute."
          cta="Upload a recording →"
          onClick={onUpload}
        />
      </div>

      {/* How it works */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <h4
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-4"
          style={{ color: "var(--ink-3)" }}
        >
          How it works
        </h4>
        <ol className="space-y-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          <li>
            <strong style={{ color: "var(--ink)" }}>Record or upload</strong>
            {" — "}
            any meeting, any platform, any length up to {plan.freeMinutesCap}{" "}
            minutes per month on the free plan.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>The coach reads it</strong>
            {" — "}
            pulls a clean summary, the action items, the people mentioned, and
            the topics covered.
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>Everything threads back</strong>
            {" — "}
            actions land in the contact&rsquo;s profile and the chat session.
            Mentions become new contacts you can choose to track.
          </li>
        </ol>
      </div>

      {/* Consent */}
      <p
        className="mt-6 text-center text-[12px] leading-relaxed max-w-[640px] mx-auto"
        style={{ color: "var(--ink-3)" }}
      >
        Recording other people on a call may be regulated where you live.
        We&rsquo;ll show a clear indicator when capture is on, and you&rsquo;re
        responsible for getting consent in your jurisdiction.
      </p>
    </div>
  );
}

function PathButton({
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
      className="flex-1 text-left p-6 rounded-xl transition-all hover:translate-y-[-2px]"
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
