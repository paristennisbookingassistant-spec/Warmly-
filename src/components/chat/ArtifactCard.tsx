"use client";

import { useState } from "react";
import type { Artifact } from "@/types/database";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ArtifactCardProps {
  artifact: Artifact;
  onCopy?: (text: string) => void;
  onMarkSent?: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  connection_note: "Connection Note",
  outreach_draft: "Outreach Draft",
  meeting_prep: "Meeting Prep",
  meeting_notes: "Meeting Notes",
  action_plan: "Action Plan",
  follow_up_draft: "Follow-up Draft",
};

const TYPE_ICONS: Record<string, string> = {
  connection_note: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
  outreach_draft: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  meeting_prep: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  meeting_notes: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  action_plan: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  follow_up_draft: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
};

export default function ArtifactCard({ artifact, onCopy, onMarkSent }: ArtifactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeLabel = TYPE_LABELS[artifact.type] ?? artifact.type;
  const iconPath = TYPE_ICONS[artifact.type];

  /** Extract the primary displayable text from the artifact content */
  function getPreviewText(): string {
    const content = artifact.content;
    if (typeof content.message === "string") return content.message;
    if (typeof content.person_summary === "string") return content.person_summary;
    if (Array.isArray(content.key_takeaways)) {
      return (content.key_takeaways as string[]).join(" • ");
    }
    if (Array.isArray(content.actions)) {
      return `${(content.actions as Array<{ description: string }>).length} actions planned`;
    }
    return "Artifact content";
  }

  function handleCopy() {
    const text = getPreviewText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(text);
  }

  const statusVariant =
    artifact.status === "sent"
      ? "success"
      : artifact.status === "draft"
      ? "default"
      : "blue";

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-blue-100">
        <div className="flex items-center gap-2">
          {iconPath && (
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
              </svg>
            </div>
          )}
          <span className="text-sm font-medium text-gray-900">{typeLabel}</span>
          <Badge variant={statusVariant}>
            {artifact.status}
          </Badge>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Preview / expanded content */}
      <div className="px-4 py-3">
        <p
          className={cn(
            "text-sm text-gray-700 leading-relaxed",
            !isExpanded && "line-clamp-3"
          )}
        >
          {getPreviewText()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-blue-100 bg-white">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? "Copied!" : "Copy"}
        </button>

        {artifact.status === "draft" &&
          (artifact.type === "connection_note" || artifact.type === "outreach_draft" || artifact.type === "follow_up_draft") && (
            <button
              onClick={() => onMarkSent?.(artifact.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 transition-colors ml-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as sent
            </button>
          )}
      </div>
    </div>
  );
}
