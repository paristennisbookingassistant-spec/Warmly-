"use client";

/**
 * components/v2/prep/SnapshotTab.tsx
 * Tab 1 — Snapshot: person_summary + company description + do/don't coaching.
 * Renders defensively; any field may be absent.
 */

import { Icon } from "@/components/v2/icons";
import type { MeetingPrepContent } from "./types";

interface Props {
  content: MeetingPrepContent;
}

function PrepHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono-tag" style={{ color: "var(--ink-3)", letterSpacing: "0.12em" }}>
      {children}
    </div>
  );
}

function PrepBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <h3
          className="font-display text-ink leading-tight"
          style={{ fontSize: 18 }}
        >
          {label}
        </h3>
        <div className="flex-1 h-px" style={{ background: "#e5d8be" }} />
      </div>
      <div className="flex flex-col gap-2 pt-1">{children}</div>
    </div>
  );
}

function Callout({
  tone,
  label,
  items,
}: {
  tone: "sienna" | "warning";
  label: string;
  items: string[];
}) {
  const palette =
    tone === "sienna"
      ? { bg: "#fdf6e9", border: "#ebcfa0", label: "#7a4a25", icon: "#b87a4a" }
      : { bg: "#fbf3df", border: "#e7c98a", label: "#7a521a", icon: "#c8923a" };

  return (
    <div
      className="rounded-2xl border px-5 py-4 flex flex-col gap-3"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <div className="flex items-center gap-2">
        {tone === "warning" ? (
          <Icon.Alert size={13} style={{ color: palette.icon }} />
        ) : (
          <Icon.Sparkles size={13} style={{ color: palette.icon }} />
        )}
        <div
          className="font-mono-tag"
          style={{ color: palette.label, fontSize: 10 }}
        >
          {label}
        </div>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-baseline gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[6px]"
                style={{ background: palette.icon }}
              />
              <span className="text-[13.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
          Nothing flagged.
        </p>
      )}
    </div>
  );
}

export function SnapshotTab({ content }: Props) {
  const doList = content.coaching?.do_list ?? [];
  const dontList = content.coaching?.dont_list ?? [];
  const companyDesc = content.company_intel?.description;

  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>Snapshot</PrepHeading>

      {/* Person summary */}
      <PrepBlock label="Person">
        {content.person_summary ? (
          <p
            className="text-[14.5px] leading-[1.65]"
            style={{ color: "var(--ink-2)", maxWidth: 760 }}
          >
            {content.person_summary}
          </p>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
            No person summary available.
          </p>
        )}
      </PrepBlock>

      {/* Company description */}
      <PrepBlock label="Company">
        {companyDesc ? (
          <p
            className="text-[14.5px] leading-[1.65]"
            style={{ color: "var(--ink-2)", maxWidth: 760 }}
          >
            {companyDesc}
          </p>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
            No company description available.
          </p>
        )}
      </PrepBlock>

      {/* Do / Don't callouts */}
      <div className="grid grid-cols-2 gap-5 mt-1">
        <Callout tone="sienna" label="What to do" items={doList} />
        <Callout tone="warning" label="What NOT to do" items={dontList} />
      </div>
    </div>
  );
}
