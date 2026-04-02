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

const TYPE_CONFIG: Record<
  string,
  { label: string; iconPath: string; colorClass: string; badgeVariant: "blue" | "green" | "amber" | "purple" | "default" }
> = {
  connection_note: {
    label: "Connection Note",
    iconPath:
      "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
    colorClass: "bg-blue-50 border-blue-200",
    badgeVariant: "blue",
  },
  outreach_draft: {
    label: "Outreach Draft",
    iconPath:
      "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    colorClass: "bg-purple-50 border-purple-200",
    badgeVariant: "purple",
  },
  meeting_prep: {
    label: "Meeting Prep",
    iconPath:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    colorClass: "bg-amber-50 border-amber-200",
    badgeVariant: "amber",
  },
  meeting_notes: {
    label: "Meeting Notes",
    iconPath:
      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    colorClass: "bg-green-50 border-green-200",
    badgeVariant: "green",
  },
  action_plan: {
    label: "Action Plan",
    iconPath:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    colorClass: "bg-green-50 border-green-200",
    badgeVariant: "green",
  },
  follow_up_draft: {
    label: "Follow-up Draft",
    iconPath: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
    colorClass: "bg-blue-50 border-blue-200",
    badgeVariant: "blue",
  },
};

function getPreviewText(artifact: Artifact): string {
  const c = artifact.content;
  if (typeof c.message === "string") return c.message;
  if (typeof c.person_summary === "string") return c.person_summary;
  if (Array.isArray(c.key_takeaways)) {
    return (c.key_takeaways as string[]).slice(0, 3).join("\n• ");
  }
  if (Array.isArray(c.actions)) {
    return (c.actions as Array<{ description: string }>)
      .slice(0, 3)
      .map((a) => "• " + a.description)
      .join("\n");
  }
  return "View artifact content";
}

export default function ArtifactCard({
  artifact,
  onCopy,
  onMarkSent,
}: ArtifactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [copied, setCopied] = useState(false);

  const config = TYPE_CONFIG[artifact.type] ?? {
    label: artifact.type,
    iconPath:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    colorClass: "bg-slate-50 border-slate-200",
    badgeVariant: "default" as const,
  };

  const previewText = getPreviewText(artifact);

  function handleCopy() {
    navigator.clipboard.writeText(previewText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(previewText);
  }

  function handleEdit() {
    setEditValue(previewText);
    setIsEditing(true);
  }

  const statusVariant =
    artifact.status === "sent"
      ? "green"
      : artifact.status === "finalized"
      ? "blue"
      : artifact.status === "archived"
      ? "default"
      : "default";

  const canSend =
    artifact.status === "draft" &&
    ["connection_note", "outreach_draft", "follow_up_draft"].includes(
      artifact.type
    );

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        config.colorClass
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 border-b border-current/10">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              config.badgeVariant === "blue" && "bg-blue-100",
              config.badgeVariant === "purple" && "bg-purple-100",
              config.badgeVariant === "amber" && "bg-amber-100",
              config.badgeVariant === "green" && "bg-green-100",
              config.badgeVariant === "default" && "bg-slate-100"
            )}
          >
            <svg
              className={cn(
                "w-3.5 h-3.5",
                config.badgeVariant === "blue" && "text-blue-600",
                config.badgeVariant === "purple" && "text-purple-600",
                config.badgeVariant === "amber" && "text-amber-600",
                config.badgeVariant === "green" && "text-green-600",
                config.badgeVariant === "default" && "text-slate-500"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={config.iconPath}
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {config.label}
          </span>
          <Badge variant={statusVariant} size="sm">
            {artifact.status}
          </Badge>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"}
          <svg
            className={cn(
              "w-3 h-3 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={6}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "text-sm text-gray-700 leading-relaxed whitespace-pre-wrap",
              !isExpanded && "line-clamp-3"
            )}
          >
            {previewText}
          </p>
        )}
        {!isEditing && !isExpanded && previewText.length > 200 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Show more
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-current/5 bg-white/50">
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
              copied
                ? "text-green-600 bg-green-50"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            )}
          >
            {copied ? (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Regenerate
          </button>
          {canSend && (
            <button
              onClick={() => onMarkSent?.(artifact.id)}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Mark as sent
            </button>
          )}
        </div>
      )}
    </div>
  );
}
