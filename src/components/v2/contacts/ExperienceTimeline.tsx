/**
 * components/v2/contacts/ExperienceTimeline.tsx
 * Renders a contact's experience (LinkedInExperienceEntry[]) as a vertical timeline.
 */

import type { LinkedInExperienceEntry } from "@/types/database";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

interface ExperienceTimelineProps {
  experience: LinkedInExperienceEntry[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// LinkedIn dates arrive as human strings ("2021-06", "2024", "Present", "").
// Prettify YYYY-MM / YYYY explicitly and fall back to the raw string —
// never run them through `new Date`, which yields "Invalid Date" on "Present".
function prettyDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const ym = /^(\d{4})-(\d{2})$/.exec(d);
  if (ym) {
    const m = Number(ym[2]);
    if (m >= 1 && m <= 12) return `${MONTHS[m - 1]} ${ym[1]}`;
  }
  return d; // already display-ready (e.g. "2024", "Present") or unknown format
}

function formatDateRange(start: string | null, end: string | null): string {
  const s = prettyDate(start);
  const e = end ? prettyDate(end) : "Present";
  if (!s && !e) return "";
  if (!s) return e ?? "";
  return `${s} – ${e}`;
}

export function ExperienceTimeline({ experience }: ExperienceTimelineProps) {
  if (experience.length === 0) {
    return (
      <div>
        <SectionLabel className="mb-3">Experience</SectionLabel>
        <p className="text-[13px] text-ink-4">No experience data available.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel className="mb-4">Experience</SectionLabel>
      <div className="relative">
        {/* vertical line */}
        <div
          className="absolute left-[15px] top-3 bottom-3 w-px"
          style={{ background: "#e5d8be" }}
        />
        <div className="flex flex-col gap-5">
          {experience.map((e, i) => (
            <div key={i} className="flex gap-4 relative">
              {/* dot */}
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: "#f3e2cd", color: "#b87a4a" }}
              >
                <Icon.Briefcase size={13} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[13.5px] font-medium text-ink leading-tight">{e.title}</div>
                <div className="text-[12.5px] text-ink-2 mt-0.5">{e.company}</div>
                <div className="text-[11.5px] text-ink-4 mt-0.5">
                  {formatDateRange(e.dateRange.start, e.dateRange.end)}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
                {e.description && (
                  <p className="text-[12.5px] text-ink-3 mt-1.5 leading-relaxed">{e.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
