"use client";

/**
 * components/v2/contacts/NotesBlock.tsx
 * Simple notes display + add note. contact.notes is a single text field —
 * new notes are appended (with date separator) and PUT back to the server.
 */

import { useState, useRef } from "react";
import { SectionLabel, Btn } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

interface NotesBlockProps {
  contactId: string;
  notes: string | null;
  onNotesUpdated: (newNotes: string) => void;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function NotesBlock({ contactId, notes, onNotesUpdated }: NotesBlockProps) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openAdd = () => {
    setAdding(true);
    setSaveError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const cancel = () => {
    setAdding(false);
    setVal("");
    setSaveError(null);
  };

  const commit = async () => {
    const trimmed = val.trim();
    if (!trimmed) { cancel(); return; }

    const datePrefix = `[${todayLabel()}]\n`;
    const newNotes = notes
      ? `${notes}\n\n${datePrefix}${trimmed}`
      : `${datePrefix}${trimmed}`;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onNotesUpdated(newNotes);
      setVal("");
      setAdding(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-7">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Your notes</SectionLabel>
        {!adding && (
          <button
            onClick={openAdd}
            className="text-[12px] inline-flex items-center gap-1 hover:underline transition-colors"
            style={{ color: "#7a4a25" }}
          >
            + Add a note
          </button>
        )}
      </div>

      {adding && (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{ borderColor: "#b87a4a", background: "#fffaf2", boxShadow: "0 0 0 1px #b87a4a inset" }}
        >
          <textarea
            ref={textareaRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. Met at INSEAD mixer — open to a coffee chat after summer…"
            className="w-full text-[13.5px] text-ink-2 placeholder:text-ink-4 bg-transparent outline-none resize-none leading-relaxed"
            rows={4}
          />
          {saveError && (
            <div className="text-[12px] text-bad mt-1">{saveError}</div>
          )}
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "#f0e6d0" }}>
            <div className="text-[11px] text-ink-4">{todayLabel()} · appended to notes</div>
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="text-[12.5px] text-ink-3 hover:text-ink px-2 h-8">
                Cancel
              </button>
              <Btn
                size="sm"
                onClick={() => void commit()}
                disabled={saving || !val.trim()}
                icon={Icon.Check}
              >
                {saving ? "Saving…" : "Save note"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {notes ? (
        <div
          className="p-3.5 rounded-lg border text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap"
          style={{ background: "#f9f3e7", borderColor: "#e5d8be" }}
        >
          {notes}
        </div>
      ) : (
        !adding && (
          <div className="text-[13px] text-ink-4">No notes yet.</div>
        )
      )}
    </div>
  );
}
