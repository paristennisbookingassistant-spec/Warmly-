"use client";

/**
 * components/v2/contacts/sort/SortQueueCard.tsx
 * Focused card for a single contact in the sort queue.
 * Shows: avatar, name, title @ company, AI suggestion chip.
 */

import type { Contact, RelationshipCategory } from "@/types/database";
import { Avatar } from "@/components/v2/primitives";
import { CATEGORY_LABEL } from "@/lib/crm/cadence";
import type { CategorySuggestion } from "@/lib/crm/suggestCategory";

// Tint per suggested category — used on the suggestion pill
const SUGGESTION_STYLE: Record<
  RelationshipCategory,
  { bg: string; fg: string; dot: string; border: string }
> = {
  nurturing:    { bg: "#dcebd9", fg: "#34553e", dot: "#5e8d6a", border: "#a8d5a2" },
  keep_warm:    { bg: "#dde6ee", fg: "#2f4d63", dot: "#4a6f87", border: "#a6bfcf" },
  inner_circle: { bg: "#ede9fe", fg: "#4c1d95", dot: "#7c3aed", border: "#c4b5fd" },
  dormant:      { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8", border: "#cbd5e1" },
};

interface SortQueueCardProps {
  contact: Contact;
  suggestion: CategorySuggestion | null;
  /** Key-prop-driven re-mount is handled by parent; this prop lets us do enter animation */
  animationKey: string;
}

export function SortQueueCard({
  contact,
  suggestion,
  animationKey,
}: SortQueueCardProps) {
  const displayTitle = [contact.current_title, contact.company]
    .filter(Boolean)
    .join(" · ");

  const s = suggestion ? SUGGESTION_STYLE[suggestion.category] : null;

  return (
    <div
      key={animationKey}
      className="w-full max-w-[480px] mx-auto animate-slide-up"
      style={{ animationDuration: "200ms" }}
    >
      <div
        className="rounded-2xl p-8 flex flex-col items-center text-center shadow-medium"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Avatar */}
        <div className="mb-5">
          <Avatar
            src={contact.avatar_url ?? contact.photo_url}
            name={contact.name}
            size={72}
          />
        </div>

        {/* Name */}
        <h2
          className="font-display mb-1 leading-tight"
          style={{ fontSize: 26, color: "var(--ink)", letterSpacing: "-0.01em" }}
        >
          {contact.name}
        </h2>

        {/* Title @ Company */}
        {displayTitle && (
          <p className="text-[13.5px] mb-6 leading-snug" style={{ color: "var(--ink-3)" }}>
            {displayTitle}
          </p>
        )}

        {/* AI Suggestion chip */}
        {suggestion && s ? (
          <div
            className="w-full rounded-xl px-4 py-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: s.dot }}
              />
              <span
                className="font-mono-tag"
                style={{ color: s.fg, opacity: 0.7 }}
              >
                AI suggestion
              </span>
            </div>
            <div
              className="text-[13.5px] font-semibold mb-0.5"
              style={{ color: s.fg }}
            >
              {CATEGORY_LABEL[suggestion.category]}
            </div>
            <div
              className="text-[12px] leading-snug"
              style={{ color: s.fg, opacity: 0.72 }}
            >
              {suggestion.reason}
            </div>
          </div>
        ) : (
          <div
            className="w-full rounded-xl px-4 py-3"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}
          >
            <p className="text-[12.5px]" style={{ color: "var(--ink-4)" }}>
              No suggestion available — choose a category below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
