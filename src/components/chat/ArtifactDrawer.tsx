"use client";

/**
 * ArtifactDrawer
 *
 * Right-side slide-in drawer that opens when an ArtifactCard's "Open in full"
 * affordance is clicked. This is the user's primary editing surface for
 * AI-generated artifacts (outreach drafts, meeting prep, follow-ups, etc.).
 *
 * Lifecycle:
 *   - View mode: read-only display of the artifact body + Copy / Edit / Use this actions
 *   - Edit mode: textarea over the primary text field; Save persists via PUT /api/artifacts/[id]
 *   - "Use this" sets status (sent for outreach types, finalized for prep/notes/action_plan)
 *
 * Closes on: backdrop click, Close button, ESC key.
 *
 * See docs/design/v2/project/src/modals.jsx (ArtifactDrawer) for the design reference.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Artifact } from "@/types/database";
import { cn } from "@/lib/utils";

interface ArtifactDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
  onUpdated?: (artifact: Artifact) => void;
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

const OUTREACH_TYPES = ["connection_note", "outreach_draft", "follow_up_draft"];

/**
 * Returns the "primary" editable text from an artifact's content.
 * Most types have a top-level `message`; meeting_prep uses `person_summary`.
 */
function getPrimaryText(content: Record<string, unknown>): string {
  if (typeof content.message === "string") return content.message;
  if (typeof content.person_summary === "string") return content.person_summary;
  if (typeof content.summary === "string") return content.summary;
  return "";
}

/**
 * Returns the field key that getPrimaryText reads from. Used to write back the edit.
 */
function getPrimaryKey(content: Record<string, unknown>): string {
  if (typeof content.message === "string") return "message";
  if (typeof content.person_summary === "string") return "person_summary";
  if (typeof content.summary === "string") return "summary";
  return "message";
}

/**
 * Renders structured content (sections, bullet lists, action items) as read-only prose.
 * Returns null if no extra structure is present beyond the primary text.
 */
function StructuredContent({ content }: { content: Record<string, unknown> }) {
  const blocks: React.ReactNode[] = [];

  // meeting_prep style: top fields + sections
  if (Array.isArray(content.discussion_topics)) {
    blocks.push(
      <Section key="topics" label="Discussion topics">
        <ol className="space-y-1.5 list-decimal list-inside">
          {(content.discussion_topics as string[]).map((t, i) => (
            <li key={i} className="text-[14px] leading-relaxed">
              {t}
            </li>
          ))}
        </ol>
      </Section>
    );
  }
  if (Array.isArray(content.questions_to_ask)) {
    blocks.push(
      <Section key="questions" label="Questions to ask">
        <ol className="space-y-1.5 list-decimal list-inside">
          {(content.questions_to_ask as string[]).map((q, i) => (
            <li key={i} className="text-[14px] leading-relaxed">
              {q}
            </li>
          ))}
        </ol>
      </Section>
    );
  }
  if (Array.isArray(content.key_takeaways)) {
    blocks.push(
      <Section key="takeaways" label="Key takeaways">
        <ul className="space-y-1.5">
          {(content.key_takeaways as string[]).map((k, i) => (
            <li key={i} className="text-[14px] leading-relaxed flex gap-2">
              <span className="text-accent">•</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </Section>
    );
  }
  // action_plan style: actions array
  if (Array.isArray(content.actions)) {
    blocks.push(
      <Section key="actions" label="Actions">
        <div className="space-y-3">
          {(
            content.actions as Array<{
              when?: string;
              description: string;
            }>
          ).map((a, i) => (
            <div
              key={i}
              className="grid grid-cols-[80px_1fr] gap-3 text-[14px]"
            >
              <span className="text-[11px] uppercase tracking-wider text-ink-3 font-medium pt-0.5">
                {a.when ?? "Soon"}
              </span>
              <span className="leading-relaxed text-ink-2">{a.description}</span>
            </div>
          ))}
        </div>
      </Section>
    );
  }
  // outreach style: subject line
  if (typeof content.subject === "string" && content.subject.length > 0) {
    blocks.unshift(
      <Section key="subject" label="Subject">
        <p className="text-[14px] font-medium text-ink leading-snug">
          {content.subject as string}
        </p>
      </Section>
    );
  }

  if (blocks.length === 0) return null;
  return <div className="space-y-6">{blocks}</div>;
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
        {label}
      </h3>
      <div className="text-ink-2">{children}</div>
    </section>
  );
}

export default function ArtifactDrawer({
  artifact,
  onClose,
  onUpdated,
}: ArtifactDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state whenever a new artifact is opened
  useEffect(() => {
    if (artifact) {
      setIsEditing(false);
      setEditValue(getPrimaryText(artifact.content));
      setErrorMsg(null);
      setCopied(false);
    }
  }, [artifact]);

  // ESC to close
  useEffect(() => {
    if (!artifact) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [artifact, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!artifact) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [artifact]);

  const primaryText = useMemo(
    () => (artifact ? getPrimaryText(artifact.content) : ""),
    [artifact]
  );

  const handleCopy = useCallback(() => {
    if (!artifact) return;
    navigator.clipboard.writeText(primaryText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [artifact, primaryText]);

  const handleSaveEdit = useCallback(async () => {
    if (!artifact) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const key = getPrimaryKey(artifact.content);
      const newContent = { ...artifact.content, [key]: editValue };
      // Compute simple edit distance (just the diff length for style learning signal)
      const editDistance = Math.abs(editValue.length - primaryText.length);
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          user_edit_distance: editDistance,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? `Save failed (${res.status})`);
      }
      const json = (await res.json()) as { data: Artifact };
      onUpdated?.(json.data);
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [artifact, editValue, primaryText, onUpdated]);

  const handleUseThis = useCallback(async () => {
    if (!artifact) return;
    const newStatus = OUTREACH_TYPES.includes(artifact.type)
      ? "sent"
      : "finalized";
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? `Update failed (${res.status})`);
      }
      const json = (await res.json()) as { data: Artifact };
      onUpdated?.(json.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }, [artifact, onUpdated, onClose]);

  if (!artifact) return null;

  const typeLabel = TYPE_LABEL[artifact.type] ?? artifact.type;
  const glyph = TYPE_GLYPH[artifact.type] ?? "A";
  const useThisLabel = OUTREACH_TYPES.includes(artifact.type)
    ? "Mark as sent"
    : "Mark as final";
  const isSent = artifact.status === "sent" || artifact.status === "finalized";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${typeLabel}: ${artifact.id}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade-in"
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="relative h-full w-full max-w-[560px] bg-surface flex flex-col animate-drawer-in shadow-medium"
        onClick={(e) => e.stopPropagation()}
        style={{ borderLeft: "1px solid var(--line)" }}
      >
        {/* Header */}
        <header
          className="flex items-start justify-between gap-4 px-6 pt-6 pb-4"
          style={{ borderBottom: "1px solid var(--line-soft)" }}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-[13px] font-semibold"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              {glyph}
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-1">
                {typeLabel}
              </div>
              <h2 className="font-display italic text-[22px] leading-tight text-ink truncate">
                {(artifact.content.title as string) ?? typeLabel}
              </h2>
              {typeof artifact.content.subtitle === "string" && (
                <p className="text-[13px] text-ink-3 mt-1 truncate">
                  {artifact.content.subtitle as string}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
            aria-label="Close drawer"
          >
            Close
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Primary text (editable) */}
          {primaryText && (
            <Section label={isEditing ? "Editing primary content" : "Content"}>
              {isEditing ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={Math.min(20, Math.max(8, editValue.split("\n").length + 2))}
                  className="w-full text-[14px] leading-relaxed rounded-md px-3 py-2.5 bg-bg-sunk text-ink outline-none transition-colors"
                  style={{
                    border: "1px solid var(--line)",
                  }}
                  autoFocus
                />
              ) : (
                <div className="text-[14px] leading-relaxed text-ink whitespace-pre-wrap">
                  {primaryText}
                </div>
              )}
            </Section>
          )}

          {/* Structured content (read-only — sections, bullet lists, action items) */}
          {!isEditing && <StructuredContent content={artifact.content} />}

          {/* Status hint */}
          {isSent && (
            <div
              className="text-[12px] px-3 py-2 rounded-md"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              {artifact.status === "sent"
                ? "Marked as sent. Contact status updated."
                : "Marked as final. No further edits expected."}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div
              className="text-[12px] px-3 py-2 rounded-md"
              style={{
                background: "oklch(0.94 0.04 30)",
                color: "oklch(0.40 0.13 30)",
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="flex items-center gap-2 px-6 py-4"
          style={{ borderTop: "1px solid var(--line-soft)" }}
        >
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditValue(primaryText);
                  setErrorMsg(null);
                }}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || editValue === primaryText}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors",
                  "text-bg disabled:opacity-50"
                )}
                style={{ background: "var(--ink)" }}
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={!primaryText}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                }}
              >
                Edit
              </button>
              <div className="flex-1" />
              <button
                onClick={handleUseThis}
                disabled={isSaving || isSent}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors text-bg disabled:opacity-50"
                )}
                style={{ background: "var(--ink)" }}
              >
                {isSaving ? "…" : isSent ? "Done" : useThisLabel}
              </button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}
