"use client";

/**
 * components/v2/prep/LiveNotesPanel.tsx
 * Persistent live-notes panel. Two actions:
 *   "Save notes"        → PUT /api/contacts/{id} { notes }  (persist raw text)
 *   "Save & synthesize" → POST /api/ai/generate { meeting_notes } → a structured
 *      summary (key takeaways + next steps) saved as an artifact on the contact's
 *      timeline, shown inline. Mirrors the /meeting-prep skill's synthesis step,
 *      kept deliberately simple.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";

interface NextStep {
  description?: string;
  timing?: string;
}
interface Synthesis {
  key_takeaways: string[];
  next_steps: NextStep[];
}

interface Props {
  contactId: string;
  contactName: string;
  conversationId: string | null;
  existingNotes: string | null;
  onSaved: () => void;
}

export function LiveNotesPanel({ contactId, contactName, conversationId, existingNotes, onSaved }: Props) {
  const [text, setText] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function persistRaw(): Promise<void> {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: text }),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await persistRaw();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSynthesize() {
    if (!text.trim()) {
      setError("Add some notes first, then synthesize.");
      return;
    }
    setSynthesizing(true);
    setError(null);
    try {
      // Persist the raw notes first, then synthesize.
      await persistRaw();

      // Reuse the prep conversation, or create one if we don't have it.
      let convId = conversationId;
      if (!convId) {
        const cr = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "contact_session", contact_id: contactId }),
        });
        const cj = (await cr.json()) as { data?: { id?: string } };
        convId = cj.data?.id ?? null;
      }
      if (!convId) throw new Error("Could not start a conversation for synthesis.");

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_type: "meeting_notes",
          contact_id: contactId,
          conversation_id: convId,
          user_instructions:
            "Synthesize these meeting notes into key takeaways and next steps, and preserve the raw notes verbatim in user_raw_notes.\n\nMEETING NOTES:\n" +
            text,
        }),
      });
      if (!res.ok) throw new Error(`Synthesis failed (${res.status})`);
      const json = (await res.json()) as {
        data?: { content?: { key_takeaways?: string[]; next_steps?: NextStep[] } };
        error?: string;
      };
      if (json.error) throw new Error(json.error);
      setSynthesis({
        key_takeaways: json.data?.content?.key_takeaways ?? [],
        next_steps: json.data?.content?.next_steps ?? [],
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed.");
    } finally {
      setSynthesizing(false);
    }
  }

  const busy = saving || synthesizing;

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden"
      style={{ borderColor: "#e5d8be", background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 border-b cursor-pointer select-none"
        style={{ borderColor: "#f0e6d0", background: "#fdf6e9" }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon.Edit size={14} style={{ color: "#b87a4a" }} />
          <span className="font-mono-tag" style={{ color: "#7a4a25" }}>Live notes</span>
        </div>
        <Icon.ChevronDown
          size={14}
          style={{ color: "var(--ink-3)", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }}
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Jot notes during or after the meeting, then synthesize…"
            className="w-full rounded-lg border bg-white px-3.5 py-3 outline-none resize-none leading-[1.6]"
            style={{ borderColor: "#d9cdb4", color: "var(--ink-2)", fontSize: 13, minHeight: 120 }}
            rows={6}
          />

          {error && <p className="text-[12px]" style={{ color: "var(--bad)" }}>{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Btn variant="secondary" size="sm" onClick={() => void handleSave()} disabled={busy} icon={Icon.Check}>
              {saving ? "Saving…" : "Save notes"}
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => void handleSynthesize()} disabled={busy} icon={synthesizing ? undefined : Icon.Sparkles}>
              {synthesizing ? "Synthesizing…" : "Save & synthesize"}
            </Btn>
          </div>

          {synthesizing && (
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
              Synthesizing your notes into takeaways and next steps… (~20s)
            </p>
          )}

          {synthesis && (
            <div className="rounded-xl border p-4 mt-1" style={{ borderColor: "#e5d8be", background: "#fbf6ec" }}>
              <div className="font-mono-tag mb-2" style={{ color: "#7a4a25" }}>
                Synthesis · saved to {contactName.split(" ")[0]}&rsquo;s timeline
              </div>
              {synthesis.key_takeaways.length > 0 && (
                <div className="mb-3">
                  <div className="text-[12px] font-semibold text-ink mb-1">Key takeaways</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {synthesis.key_takeaways.map((t, i) => (
                      <li key={i} className="text-[12.5px] text-ink-2 leading-relaxed">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {synthesis.next_steps.length > 0 && (
                <div>
                  <div className="text-[12px] font-semibold text-ink mb-1">Next steps</div>
                  <ul className="space-y-1">
                    {synthesis.next_steps.map((s, i) => (
                      <li key={i} className="text-[12.5px] text-ink-2 leading-relaxed">
                        {s.description}{s.timing ? <span className="text-ink-4"> · {s.timing}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
