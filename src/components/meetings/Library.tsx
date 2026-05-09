import Avatar from "@/components/ui/Avatar";
import SentimentDot from "./SentimentDot";
import type { Recording, Sentiment } from "@/types/meeting";

interface LibraryProps {
  recordings: Recording[];
  totalCount: number;
  sentimentFilter: Sentiment | "all";
  onFilterChange: (filter: Sentiment | "all") => void;
  onOpen: (id: string) => void;
}

const FILTERS: Array<Sentiment | "all"> = ["all", "warm", "neutral"];

export default function Library({
  recordings,
  totalCount,
  sentimentFilter,
  onFilterChange,
  onOpen,
}: LibraryProps) {
  return (
    <div>
      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
          style={{ color: "var(--ink-3)" }}
        >
          {recordings.length} of {totalCount} meetings
        </span>
        <div className="flex-1" />
        <div
          className="flex items-center gap-0 rounded-md p-0.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className="px-3 py-1 text-[11.5px] font-medium rounded transition-colors capitalize"
              style={{
                color: sentimentFilter === f ? "var(--ink)" : "var(--ink-3)",
                background: sentimentFilter === f ? "var(--bg)" : "transparent",
                boxShadow:
                  sentimentFilter === f
                    ? "0 1px 2px rgba(0,0,0,0.06)"
                    : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {recordings.map((r) => {
          const openActions = r.actions.filter((a) => !a.done).length;
          return (
            <button
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="w-full text-left flex items-start gap-4 px-4 py-4 rounded-lg transition-all hover:translate-y-[-1px]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line-soft)",
              }}
            >
              <Avatar name={r.contactName} size="md" />
              <div className="flex-1 min-w-0">
                {/* Top line: name · role · title */}
                <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                  <span
                    className="font-medium text-[13.5px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {r.contactName}
                  </span>
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {r.contactRole}
                  </span>
                  <span style={{ color: "var(--ink-4)" }}>·</span>
                  <span
                    className="font-display italic text-[14px]"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {r.title}
                  </span>
                </div>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5">
                  {r.topics.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--ink-2)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {r.topics.length > 3 && (
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: "var(--ink-3)" }}
                    >
                      +{r.topics.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Right column: meta */}
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                <div
                  className="font-mono text-[10.5px] uppercase tracking-wider"
                  style={{ color: "var(--ink-3)" }}
                >
                  {r.relativeDate}
                </div>
                <div
                  className="flex items-center gap-1.5 text-[11.5px]"
                  style={{ color: "var(--ink-2)" }}
                >
                  <SentimentDot sentiment={r.sentiment} />
                  {r.duration} · {r.medium}
                  {r.source === "upload" && (
                    <span style={{ color: "var(--ink-4)" }}>· uploaded</span>
                  )}
                </div>
                <div
                  className="text-[11px] font-medium"
                  style={{
                    color: openActions > 0 ? "var(--accent)" : "var(--good)",
                  }}
                >
                  {openActions > 0
                    ? `${openActions} open ↗`
                    : "All clear ✓"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {recordings.length === 0 && (
        <div
          className="text-center py-12 rounded-lg"
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            color: "var(--ink-3)",
          }}
        >
          <p className="text-[13px]">
            No meetings match this filter.
          </p>
        </div>
      )}
    </div>
  );
}
