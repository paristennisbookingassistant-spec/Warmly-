/**
 * components/v2/contacts/EducationList.tsx
 * Renders education_v2 (LinkedInEducationEntry[]) as a clean list.
 */

import type { LinkedInEducationEntry } from "@/types/database";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

interface EducationListProps {
  education: LinkedInEducationEntry[];
}

// Extract a 4-digit year from a LinkedIn date string ("2024", "2024-06",
// "Present", ...). Avoid `new Date`, which yields NaN on values like "Present".
function year(d: string | null): string | null {
  if (!d) return null;
  const m = /(\d{4})/.exec(d);
  return m ? m[1] : null;
}

function formatDateRange(start: string | null, end: string | null): string {
  const s = year(start);
  const e = year(end);
  if (s && e) return `${s} – ${e}`;
  if (e) return `Graduated ${e}`;
  if (s) return `From ${s}`;
  return "";
}

export function EducationList({ education }: EducationListProps) {
  if (education.length === 0) {
    return (
      <div>
        <SectionLabel className="mb-3">Education</SectionLabel>
        <p className="text-[13px] text-ink-4">No education data available.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel className="mb-4">Education</SectionLabel>
      <div className="flex flex-col gap-3">
        {education.map((e, i) => {
          const isInsead = /insead/i.test(e.school);
          return (
            <div
              key={i}
              className="flex gap-3 p-3.5 rounded-xl"
              style={{
                background: isInsead ? "#fbf6ec" : "#f9f3e7",
                border: `1px solid ${isInsead ? "#ebdfc4" : "#e5d8be"}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: isInsead ? "#f3e2cd" : "#ece2d0", color: isInsead ? "#b87a4a" : "#6b5e4a" }}
              >
                <Icon.Book size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-ink leading-tight">{e.school}</div>
                {(e.degree || e.fieldOfStudy) && (
                  <div className="text-[12.5px] text-ink-2 mt-0.5">
                    {[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="text-[11.5px] text-ink-4 mt-0.5">
                  {formatDateRange(e.dateRange.start, e.dateRange.end)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
