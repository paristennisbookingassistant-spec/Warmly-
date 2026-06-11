"use client";

/**
 * components/v2/prep/LiveNotesPanel.tsx
 * Persistent live-notes panel visible on all tabs as a collapsible right panel.
 * "Save notes" → PUT /api/contacts/{id} { notes } to persist to the contact.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";

interface Props {
  contactId: string;
  existingNotes: string | null;
  onSaved: () => void;
}

export function LiveNotesPanel({ contactId, existingNotes, onSaved }: Props) {
  const [text, setText] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = (await res.json()) as { error?: string };
      if (json.error) throw new Error(json.error);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden"
      style={{
        borderColor: "#e5d8be",
        background: "var(--surface)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b cursor-pointer select-none"
        style={{ borderColor: "#f0e6d0", background: "#fdf6e9" }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon.Edit size={14} style={{ color: "#b87a4a" }} />
          <span
            className="font-mono-tag"
            style={{ color: "#7a4a25" }}
          >
            Live notes
          </span>
        </div>
        <Icon.ChevronDown
          size={14}
          style={{
            color: "var(--ink-3)",
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="flex flex-col gap-3 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Any free-form notes during or after the meeting…"
            className="w-full rounded-lg border bg-white px-3.5 py-3 outline-none resize-none leading-[1.6]"
            style={{
              borderColor: "#d9cdb4",
              color: "var(--ink-2)",
              fontSize: 13,
              minHeight: 120,
            }}
            rows={6}
          />

          {saveError && (
            <p className="text-[12px]" style={{ color: "var(--bad)" }}>
              {saveError}
            </p>
          )}

          <Btn
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            icon={saving ? undefined : Icon.Check}
            className="self-end"
          >
            {saving ? "Saving…" : "Save notes"}
          </Btn>
        </div>
      )}
    </div>
  );
}
