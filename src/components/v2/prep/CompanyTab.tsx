"use client";

/**
 * components/v2/prep/CompanyTab.tsx
 * Tab 2 — Company: recent news items + strategic priorities list.
 * Renders defensively; all fields optional.
 */

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
        <h3 className="font-display text-ink leading-tight" style={{ fontSize: 18 }}>
          {label}
        </h3>
        <div className="flex-1 h-px" style={{ background: "#e5d8be" }} />
      </div>
      <div className="flex flex-col gap-2 pt-1">{children}</div>
    </div>
  );
}

export function CompanyTab({ content }: Props) {
  const intel = content.company_intel;
  const news = intel?.recent_news ?? [];
  const priorities = intel?.strategic_priorities ?? [];

  return (
    <div className="flex flex-col gap-8 fade-up">
      <PrepHeading>Company</PrepHeading>

      {/* Recent news */}
      <PrepBlock label="Recent news">
        {news.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {news.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border px-4 py-3 flex items-start gap-3"
                style={{ borderColor: "#e5d8be", background: "var(--surface)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]"
                  style={{ background: "#b87a4a" }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-[14px] leading-snug font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    {item.headline}
                  </span>
                  {item.date && (
                    <span className="font-mono-tag" style={{ color: "var(--ink-4)" }}>
                      {item.date}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
            No recent news found.
          </p>
        )}
      </PrepBlock>

      {/* Strategic priorities */}
      <PrepBlock label="Strategic priorities">
        {priorities.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {priorities.map((p, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span
                  className="font-mono-tag flex-shrink-0"
                  style={{ color: "#b87a4a", minWidth: 22 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-[14.5px] leading-[1.6]"
                  style={{ color: "var(--ink-2)" }}
                >
                  {p}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
            No strategic priorities identified.
          </p>
        )}
      </PrepBlock>
    </div>
  );
}
