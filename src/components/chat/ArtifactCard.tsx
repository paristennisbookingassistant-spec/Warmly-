"use client";

/**
 * ArtifactCard
 *
 * Compact preview of an AI-generated artifact (outreach draft, meeting prep,
 * follow-up, etc.) shown inline in the chat stream. Click anywhere on the card
 * to open the artifact in the right-side ArtifactDrawer where it can be
 * reviewed, edited, and marked as used/sent.
 *
 * The card itself does NOT mutate the artifact — all editing flows through the
 * drawer. This keeps the chat stream clean and aligns with the design ref at
 * docs/design/v2/project/src/chat.jsx (ArtifactCard).
 */

import type { Artifact } from "@/types/database";

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen?: (artifact: Artifact) => void;
}

const TYPE_LABEL: Record<string, string> = {
  connection_note: "Connection note",
  outreach_draft: "Outreach draft",
  meeting_prep: "Meeting prep",
  meeting_notes: "Meeting notes",
  action_plan: "Action plan",
  follow_up_draft: "Follow-up draft",
};

const TYPE_GLYPH: Record<string, string> = {
  connection_note: "C",
  outreach_draft: "O",
  meeting_prep: "P",
  meeting_notes: "N",
  action_plan: "A",
  follow_up_draft: "F",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  finalized: "Final",
  sent: "Sent",
  archived: "Archived",
};

function getPreviewText(artifact: Artifact): string {
  const c = artifact.content;
  if (typeof c.message === "string") return c.message;
  if (typeof c.person_summary === "string") return c.person_summary;
  if (typeof c.summary === "string") return c.summary;
  if (Array.isArray(c.key_takeaways) && c.key_takeaways.length > 0) {
    return (c.key_takeaways as string[]).slice(0, 2).join(" · ");
  }
  if (Array.isArray(c.actions) && c.actions.length > 0) {
    return (c.actions as Array<{ description: string }>)
      .slice(0, 2)
      .map((a) => a.description)
      .join(" · ");
  }
  if (Array.isArray(c.discussion_topics) && c.discussion_topics.length > 0) {
    return (c.discussion_topics as string[]).slice(0, 2).join(" · ");
  }
  return "Open to view full content";
}

function getTitle(artifact: Artifact): string {
  const c = artifact.content;
  if (typeof c.title === "string" && c.title.length > 0) return c.title;
  if (typeof c.subject === "string" && c.subject.length > 0) return c.subject;
  return TYPE_LABEL[artifact.type] ?? artifact.type;
}

export default function ArtifactCard({ artifact, onOpen }: ArtifactCardProps) {
  const typeLabel = TYPE_LABEL[artifact.type] ?? artifact.type;
  const glyph = TYPE_GLYPH[artifact.type] ?? "A";
  const statusLabel = STATUS_LABEL[artifact.status] ?? artifact.status;
  const isSent = artifact.status === "sent" || artifact.status === "finalized";
  const previewText = getPreviewText(artifact);
  const title = getTitle(artifact);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(artifact)}
      className="w-full text-left rounded-lg p-3.5 transition-all duration-150 hover:-translate-y-px group"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type glyph */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-semibold"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-ink)",
          }}
        >
          {glyph}
        </div>

        <div className="flex-1 min-w-0">
          {/* Type label + status */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium">
              {typeLabel}
            </span>
            {isSent && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-[14px] font-medium text-ink leading-snug truncate">
            {title}
          </div>

          {/* Preview snippet */}
          <p className="text-[12.5px] text-ink-3 mt-1 leading-relaxed line-clamp-2">
            {previewText}
          </p>

          {/* Open affordance */}
          <div className="mt-2 text-[11.5px] text-accent-ink font-medium opacity-80 group-hover:opacity-100 transition-opacity">
            Open in full ↗
          </div>
        </div>
      </div>
    </button>
  );
}
