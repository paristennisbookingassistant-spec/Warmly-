"use client";

/**
 * components/v2/prep/QuestionItem.tsx
 * Single question row: editable question text, "Why" reveal, delete, and a
 * notes textarea for live capture during the meeting.
 *
 * The question text is editable inline (click the pencil or the text). Edits
 * and deletes bubble up to QuestionsTab → page, which persists the updated
 * discussion_themes to the meeting_prep artifact.
 */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/v2/icons";

interface Props {
  themeIdx: number;
  questionIdx: number;
  text: string;
  value: string;
  onChange: (v: string) => void;
  onEditText: (next: string) => void;
  onDelete: () => void;
}

export function QuestionItem({
  themeIdx,
  questionIdx,
  text,
  value,
  onChange,
  onEditText,
  onDelete,
}: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const label = `Q${themeIdx * 10 + questionIdx + 1}`;

  // Keep the local draft in sync if the upstream text changes (e.g. re-generate).
  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(draft.length, draft.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== text) onEditText(next);
    else setDraft(text);
  }

  function cancel() {
    setDraft(text);
    setEditing(false);
  }

  return (
    <div className="grid gap-3 group" style={{ gridTemplateColumns: "44px 1fr" }}>
      <div className="font-mono-tag pt-2" style={{ color: "#b87a4a", fontSize: 11 }}>
        {label}
      </div>
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          {editing ? (
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              className="flex-1 rounded-md border bg-white px-2.5 py-1.5 outline-none resize-none leading-[1.55] text-[15px]"
              style={{ borderColor: "#b87a4a", color: "var(--ink)" }}
              rows={2}
            />
          ) : (
            <p
              className="flex-1 text-[15px] leading-[1.55] cursor-text"
              style={{ color: "var(--ink)" }}
              onClick={() => setEditing(true)}
            >
              <span style={{ color: "var(--ink-3)" }}>&ldquo;</span>
              {text}
              <span style={{ color: "var(--ink-3)" }}>&rdquo;</span>
            </p>
          )}

          {!editing && (
            <div className="flex items-center gap-1 flex-shrink-0 mt-1">
              <button
                onClick={() => setEditing(true)}
                aria-label="Edit question"
                title="Edit question"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                style={{ color: "var(--ink-3)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#b87a4a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
              >
                <Icon.Edit size={13} />
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete question"
                title="Delete question"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                style={{ color: "var(--ink-3)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#c0563f")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
              >
                <Icon.X size={14} />
              </button>
              <button
                onClick={() => setWhyOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[11.5px] transition-colors ml-0.5"
                style={{ color: "var(--ink-3)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#b87a4a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
              >
                <span>Why</span>
                <Icon.ChevronDown
                  size={11}
                  style={{
                    transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 150ms ease",
                  }}
                />
              </button>
            </div>
          )}
        </div>

        {whyOpen && !editing && (
          <div
            className="mt-2.5 px-3.5 py-2.5 rounded-md text-[12.5px] leading-relaxed animate-fade-in"
            style={{
              background: "#fdf6e9",
              borderLeft: "2px solid #b87a4a",
              maxWidth: 680,
              color: "var(--ink-2)",
            }}
          >
            Ask this to understand their perspective on the topic — it opens a natural dialogue
            without putting them on the spot.
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your notes during the conversation…"
          className="mt-3 w-full rounded-lg border bg-white px-3.5 py-2.5 outline-none resize-none leading-[1.6]"
          style={{
            borderColor: "#d9cdb4",
            color: "var(--ink-2)",
            fontSize: 12.5,
            fontFamily: "var(--font-mono)",
          }}
          rows={2}
        />
      </div>
    </div>
  );
}
