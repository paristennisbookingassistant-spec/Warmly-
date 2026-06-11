/**
 * components/v2/contacts/ArtifactsTimeline.tsx
 * Shows outreach_draft and meeting_notes artifacts as a simple timeline list.
 */

import type { Artifact, ArtifactType, ArtifactStatus } from "@/types/database";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

const TYPE_LABELS: Partial<Record<ArtifactType, string>> = {
  outreach_draft: "Outreach draft",
  connection_note: "Connection note",
  meeting_prep: "Meeting prep",
  meeting_notes: "Meeting notes",
  action_plan: "Action plan",
  follow_up_draft: "Follow-up draft",
};

const STATUS_STYLES: Record<ArtifactStatus, { label: string; bg: string; fg: string }> = {
  draft:     { label: "Draft",     bg: "#f3e2cd", fg: "#7a4a25" },
  finalized: { label: "Finalized", bg: "#dcebd9", fg: "#34553e" },
  sent:      { label: "Sent",      bg: "#dde6ee", fg: "#2f4d63" },
  archived:  { label: "Archived",  bg: "#ece2d0", fg: "#6b5e4a" },
};

interface ArtifactsTimelineProps {
  artifacts: Artifact[];
}

export function ArtifactsTimeline({ artifacts }: ArtifactsTimelineProps) {
  const relevant = artifacts.filter(
    (a) => a.type === "outreach_draft" || a.type === "meeting_notes" || a.type === "follow_up_draft" || a.type === "connection_note"
  );

  return (
    <div className="my-7">
      <SectionLabel className="mb-3">Drafts & meeting notes ({relevant.length})</SectionLabel>
      {relevant.length === 0 ? (
        <div className="text-[13px] text-ink-4">No drafts or meeting notes yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {relevant.map((a) => {
            const typeLabel = TYPE_LABELS[a.type] ?? a.type;
            const statusStyle = STATUS_STYLES[a.status] ?? STATUS_STYLES.draft;
            const date = new Date(a.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{ borderColor: "#e5d8be", background: "#ffffff" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#f3e2cd", color: "#7a4a25" }}
                >
                  <Icon.FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink-2">{typeLabel}</div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5">{date}</div>
                </div>
                <span
                  className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px] font-medium"
                  style={{ background: statusStyle.bg, color: statusStyle.fg }}
                >
                  {statusStyle.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
