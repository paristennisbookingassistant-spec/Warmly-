"use client";

import { useState, useEffect, Fragment, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import SentimentDot from "./SentimentDot";
import type { Recording, MeetingAction } from "@/types/meeting";

export default function Recap({ rec }: { rec: Recording }) {
  const router = useRouter();
  const [actions, setActions] = useState<MeetingAction[]>(rec.actions);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    setActions(rec.actions);
    setTranscriptOpen(false);
  }, [rec.id, rec.actions]);

  const toggle = (id: string) =>
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a))
    );

  const openCount = actions.filter((a) => !a.done).length;
  const total = actions.length;

  return (
    <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 280px" }}>
      {/* Main column */}
      <div>
        {/* Header */}
        <header
          className="flex items-start gap-4 pb-6 mb-6"
          style={{ borderBottom: "1px solid var(--line-soft)" }}
        >
          <Avatar name={rec.contactName} size="lg" />
          <div className="flex-1 min-w-0">
            <div
              className="flex items-center gap-2 text-[12px] mb-1"
              style={{ color: "var(--ink-3)" }}
            >
              <button
                onClick={() => router.push(`/contacts/${rec.contactId}`)}
                className="hover:underline transition-colors"
                style={{ color: "var(--ink-2)" }}
              >
                {rec.contactName}
              </button>
              <span>·</span>
              <span>{rec.contactRole}</span>
            </div>
            <h2
              className="font-display italic text-[28px] leading-tight tracking-tight mb-2"
              style={{ color: "var(--ink)" }}
            >
              {rec.title}
            </h2>
            <div
              className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[11.5px] font-mono uppercase tracking-wider"
              style={{ color: "var(--ink-3)" }}
            >
              <span>{rec.date}</span>
              <span>·</span>
              <span>{rec.duration}</span>
              <span>·</span>
              <span>
                {rec.medium} · {rec.location}
              </span>
              <span>·</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--surface)",
                  color: "var(--ink-2)",
                }}
              >
                <SentimentDot sentiment={rec.sentiment} size={6} />
                {rec.sentiment}
              </span>
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3
              className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ink-3)" }}
            >
              Summary
            </h3>
            <span
              className="text-[11.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              {total - openCount} of {total} actions complete
            </span>
          </div>
          <div
            className="space-y-4 text-[14.5px] leading-[1.65]"
            style={{ color: "var(--ink)" }}
          >
            {renderRichSummary(rec.summaryRich, actions, toggle)}
          </div>
        </section>

        {/* Transcript */}
        <section>
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <span
              className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ink-2)" }}
            >
              <span
                className="inline-block transition-transform"
                style={{
                  transform: transcriptOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ›
              </span>
              Transcript
            </span>
            <span className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
              {rec.transcript.length > 0
                ? `${rec.transcript.length} segments · ${rec.duration}`
                : "Not available"}
            </span>
          </button>
          {transcriptOpen && rec.transcript.length > 0 && (
            <div
              className="mt-2 p-4 rounded-lg space-y-2.5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line-soft)",
              }}
            >
              {rec.transcript.map((seg, i) => {
                const isThem = seg.who === rec.contactName.split(" ")[0];
                return (
                  <div
                    key={i}
                    className="grid gap-3 text-[13px] leading-snug"
                    style={{ gridTemplateColumns: "44px 60px 1fr" }}
                  >
                    <span
                      className="font-mono text-[10.5px] tabular-nums"
                      style={{ color: "var(--ink-4)" }}
                    >
                      {seg.t}
                    </span>
                    <span
                      className="font-medium text-[11.5px]"
                      style={{
                        color: isThem ? "var(--accent)" : "var(--ink-2)",
                      }}
                    >
                      {seg.who}
                    </span>
                    <span style={{ color: "var(--ink-2)" }}>{seg.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Side column */}
      <aside className="space-y-6">
        <SideBlock label="Topics covered">
          <div className="flex flex-wrap gap-1.5">
            {rec.topics.map((t) => (
              <span
                key={t}
                className="text-[11.5px] px-2 py-0.5 rounded-md"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--ink-2)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </SideBlock>

        {rec.mentions.length > 0 && (
          <SideBlock label="Mentioned">
            <div className="space-y-2">
              {rec.mentions.map((m, i) => (
                <div key={i} className="text-[12.5px] leading-snug">
                  {m.contactId ? (
                    <button
                      onClick={() => router.push(`/contacts/${m.contactId}`)}
                      className="font-medium hover:underline transition-colors"
                      style={{ color: "var(--ink)" }}
                    >
                      {m.name} ↗
                    </button>
                  ) : (
                    <span
                      className="font-medium"
                      style={{ color: "var(--ink)" }}
                    >
                      {m.name}
                    </span>
                  )}
                  <span
                    className="block mt-0.5"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {m.reason}
                  </span>
                </div>
              ))}
            </div>
          </SideBlock>
        )}

        <SideBlock label="Coach's read" emphasis>
          <p
            className="text-[13px] leading-relaxed italic font-display"
            style={{ color: "var(--ink-2)" }}
          >
            {rec.coachNotes}
          </p>
        </SideBlock>
      </aside>
    </div>
  );
}

function SideBlock({
  label,
  emphasis,
  children,
}: {
  label: string;
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: emphasis ? "var(--surface)" : "transparent",
        border: emphasis
          ? "1px solid var(--line-soft)"
          : "none",
      }}
    >
      <h4
        className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-2.5"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </h4>
      {children}
    </div>
  );
}

function renderRichSummary(
  text: string,
  actions: MeetingAction[],
  onToggle: (id: string) => void
): ReactNode {
  const paragraphs = text.split("\n\n");
  let actionIdx = 0;

  return paragraphs.map((para, pi) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={pi}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            const phrase = part.slice(2, -2);
            const a = actions[actionIdx];
            actionIdx += 1;
            if (!a)
              return (
                <strong
                  key={i}
                  className="font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {phrase}
                </strong>
              );
            return (
              <span
                key={i}
                className="inline-flex items-baseline gap-1.5 px-1.5 py-0.5 rounded -mx-0.5 transition-colors"
                style={{
                  background: a.done
                    ? "color-mix(in oklch, var(--good) 8%, var(--surface))"
                    : "color-mix(in oklch, var(--accent) 8%, var(--surface))",
                  textDecoration: a.done ? "line-through" : "none",
                  textDecorationColor: "var(--ink-4)",
                  color: a.done ? "var(--ink-3)" : "var(--ink)",
                }}
              >
                <input
                  type="checkbox"
                  checked={a.done}
                  onChange={() => onToggle(a.id)}
                  className="cursor-pointer translate-y-[1px]"
                  aria-label={`Mark complete: ${phrase}`}
                />
                <span className="font-medium">{phrase}</span>
                <span
                  className="font-mono text-[10.5px] uppercase tracking-wider ml-1"
                  style={{ color: "var(--ink-3)" }}
                >
                  {a.due}
                </span>
              </span>
            );
          }
          return <Fragment key={i}>{part}</Fragment>;
        })}
      </p>
    );
  });
}
