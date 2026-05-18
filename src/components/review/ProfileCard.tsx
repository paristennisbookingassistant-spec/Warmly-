"use client";

/**
 * ProfileCard — single card in the Tinder-style review deck.
 *
 * Shows the data a user needs to make a fast triage decision:
 *   - Photo
 *   - Name + tier badge
 *   - Headline
 *   - Current role + company
 *   - Education (shared schools highlighted)
 *   - Mutual connections (if available from profile_snapshot)
 *   - LLM rationale ("Picked because: ...")
 *   - Two action buttons (Skip / Save)
 *
 * The buttons are wired through the parent SwipeDeck — this component
 * is presentational. Animation is driven by a CSS class the parent
 * applies (slide-left / slide-right / slide-up).
 */

import type { Contact } from "@/types/database";

interface ProfileCardProps {
  contact: Contact;
  /** Which side the card is sliding out (when set). null = stationary. */
  exitDirection: "left" | "right" | "up" | null;
  /** Position in the deck, 1-indexed (e.g. "3 of 5") */
  position: number;
  /** Total contacts in this review session */
  total: number;
  onSkip: () => void;
  onSave: () => void;
}

// Schools we treat as "shared" with the typical user. Hardcoded for v1;
// later this could pull from users.education to match the actual user's
// schools dynamically.
const HIGHLIGHTED_SCHOOLS = ["INSEAD", "ESSEC", "ESCP", "HEC"];

export default function ProfileCard({
  contact,
  exitDirection,
  position,
  total,
  onSkip,
  onSave,
}: ProfileCardProps) {
  // Pick tier visual
  const tierLabel =
    contact.tier === 1 ? "Strong" : contact.tier === 2 ? "Good" : contact.tier === 3 ? "Adjacent" : null;
  const tierColor =
    contact.tier === 1
      ? "var(--accent)"
      : contact.tier === 2
      ? "color-mix(in oklch, var(--accent) 60%, var(--ink-3))"
      : "var(--ink-3)";

  // Education entries with INSEAD/ESSEC etc. highlighted
  const educationDisplay = (contact.education ?? []).slice(0, 3).map((edu, i) => {
    const isShared = HIGHLIGHTED_SCHOOLS.some((s) =>
      edu.school?.toUpperCase().includes(s)
    );
    return (
      <span
        key={`${edu.school}-${i}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] mr-1.5 mb-1"
        style={{
          background: isShared
            ? "color-mix(in oklch, var(--accent) 18%, transparent)"
            : "color-mix(in oklch, var(--ink) 6%, transparent)",
          color: isShared ? "var(--ink)" : "var(--ink-2)",
          border: isShared ? "1px solid var(--accent)" : "1px solid var(--line)",
          fontWeight: isShared ? 600 : 400,
        }}
      >
        {edu.school}
        {edu.year ? ` · ${edu.year}` : ""}
      </span>
    );
  });

  // Slide animation class
  const animationClass =
    exitDirection === "left"
      ? "translate-x-[-120%] opacity-0 rotate-[-6deg]"
      : exitDirection === "right"
      ? "translate-x-[120%] opacity-0 rotate-[6deg]"
      : exitDirection === "up"
      ? "translate-y-[-120%] opacity-0"
      : "translate-x-0 translate-y-0 opacity-100";

  // Snapshot mutuals (from extension's profile_snapshot if present)
  const mutuals =
    (contact.profile_snapshot as { mutual_connections?: number } | null)
      ?.mutual_connections ?? 0;

  return (
    <div
      className={`w-full max-w-[520px] mx-auto rounded-2xl shadow-sm transition-all duration-300 ease-out ${animationClass}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      {/* Progress strip */}
      <div className="px-6 pt-4 flex items-center justify-between">
        <span
          className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-3)" }}
        >
          {position} of {total}
        </span>
        {tierLabel && (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.12em] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in oklch, " + tierColor + " 14%, transparent)",
              color: tierColor,
            }}
          >
            {tierLabel}
          </span>
        )}
      </div>

      {/* Identity block */}
      <div className="px-6 pt-3 flex items-start gap-4">
        {contact.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.avatar_url}
            alt={contact.name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            style={{ border: "1px solid var(--line)" }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-[18px]"
            style={{
              background: "color-mix(in oklch, var(--accent) 14%, var(--surface))",
              color: "var(--accent)",
              border: "1px solid var(--line)",
            }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2
            className="font-display italic text-[26px] leading-tight tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            {contact.name}
          </h2>
          {(contact.current_title || contact.company) && (
            <p
              className="text-[13.5px] leading-snug mt-1"
              style={{ color: "var(--ink-2)" }}
            >
              {contact.current_title}
              {contact.current_title && contact.company ? " · " : ""}
              {contact.company}
            </p>
          )}
          {contact.location && (
            <p
              className="text-[12px] leading-snug mt-0.5"
              style={{ color: "var(--ink-3)" }}
            >
              📍 {contact.location}
            </p>
          )}
        </div>
      </div>

      {/* Education chips */}
      {educationDisplay.length > 0 && (
        <div className="px-6 pt-3 flex flex-wrap">{educationDisplay}</div>
      )}

      {/* Mutuals */}
      {mutuals > 0 && (
        <div
          className="px-6 pt-2 text-[12px]"
          style={{ color: "var(--ink-3)" }}
        >
          {mutuals} mutual {mutuals === 1 ? "connection" : "connections"}
        </div>
      )}

      {/* LLM rationale */}
      {contact.recommendation_reason && (
        <div
          className="px-6 mt-4 mx-6 py-3 rounded-lg"
          style={{
            background: "color-mix(in oklch, var(--accent) 6%, transparent)",
            borderLeft: "2px solid var(--accent)",
          }}
        >
          <div
            className="font-mono text-[9.5px] uppercase tracking-[0.12em] mb-1.5"
            style={{ color: "var(--ink-3)" }}
          >
            Why this contact
          </div>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {contact.recommendation_reason}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="mt-5 px-6 py-4 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--line-soft)" }}
      >
        <button
          onClick={onSkip}
          disabled={exitDirection !== null}
          className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "color-mix(in oklch, var(--ink) 5%, var(--surface))",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
          }}
        >
          ✕  Skip
        </button>
        <button
          onClick={onSave}
          disabled={exitDirection !== null}
          className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "color-mix(in oklch, var(--success, #2f7d4f) 75%, white)",
            color: "var(--ink)",
          }}
        >
          ♥  Save
        </button>
      </div>
    </div>
  );
}
