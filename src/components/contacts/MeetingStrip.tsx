"use client";

import { useRouter } from "next/navigation";
import type { Recording } from "@/types/meeting";

interface MeetingStripProps {
  meetings: Recording[];
  contactFirstName: string;
}

const SENTIMENT_COLOR = {
  warm: "var(--good)",
  neutral: "var(--ink-3)",
  cool: "var(--ink-4)",
} as const;

export default function MeetingStrip({
  meetings,
  contactFirstName,
}: MeetingStripProps) {
  const router = useRouter();

  if (meetings.length === 0) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 rounded-lg"
        style={{
          background: "var(--surface)",
          border: "1px dashed var(--line)",
        }}
      >
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--ink-2)" }}
          >
            No meetings recorded with {contactFirstName} yet.
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--ink-3)" }}
          >
            When you do, summaries and action items will land here automatically.
          </p>
        </div>
        <button
          onClick={() => router.push("/meetings")}
          className="px-3 py-1.5 rounded-md text-[12px] font-medium flex-shrink-0 transition-colors"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          Capture a call →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meetings.map((m) => {
        const open = m.actions.filter((a) => !a.done).length;
        const done = m.actions.length - open;
        const firstPara = (m.summaryRich ?? "")
          .split("\n\n")[0]
          .replace(/\*\*/g, "");
        const excerpt =
          firstPara.length > 220
            ? firstPara.slice(0, 218).trimEnd() + "…"
            : firstPara;

        return (
          <button
            key={m.id}
            onClick={() => router.push(`/meetings?id=${m.id}`)}
            className="w-full text-left px-4 py-3.5 rounded-lg transition-all hover:translate-y-[-1px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
            }}
          >
            {/* Top row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: SENTIMENT_COLOR[m.sentiment] }}
              />
              <span
                className="font-display italic text-[15px] leading-tight flex-1 truncate"
                style={{ color: "var(--ink)" }}
              >
                {m.title}
              </span>
              <span
                className="font-mono text-[10.5px] uppercase tracking-wider flex-shrink-0"
                style={{ color: "var(--ink-3)" }}
              >
                {m.relativeDate}
              </span>
            </div>

            {/* Excerpt */}
            <p
              className="text-[12.5px] leading-relaxed mb-2"
              style={{ color: "var(--ink-2)" }}
            >
              {excerpt}
            </p>

            {/* Foot */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px]">
              <Chip>{m.duration}</Chip>
              <Chip>{m.medium}</Chip>
              {m.source === "upload" && <Chip>uploaded</Chip>}
              <span style={{ color: "var(--ink-4)" }}>·</span>
              {open > 0 ? (
                <span
                  className="font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  {open} open action{open === 1 ? "" : "s"}
                </span>
              ) : (
                <span
                  className="font-medium"
                  style={{ color: "var(--good)" }}
                >
                  All actions clear
                </span>
              )}
              {done > 0 && open > 0 && (
                <span style={{ color: "var(--ink-3)" }}>· {done} done</span>
              )}
              <span className="flex-1" />
              <span
                className="font-mono uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                Open recap →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10.5px] font-mono uppercase tracking-wider"
      style={{
        background: "var(--surface-2)",
        color: "var(--ink-3)",
      }}
    >
      {children}
    </span>
  );
}
