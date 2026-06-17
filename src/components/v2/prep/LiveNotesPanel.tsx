"use client";

/**
 * components/v2/prep/LiveNotesPanel.tsx
 * Persistent live-notes panel. Two actions:
 *   "Save notes"        → PUT /api/contacts/{id} { notes }  (persist raw text)
 *   "Save & log meeting" → synthesize the notes into a clean meeting record that
 *      lands on the CONTACT'S PROFILE as a logged interaction:
 *        1. POST /api/ai/generate { meeting_notes } → key_takeaways + next_steps
 *        2. PUT  /api/artifacts/{id} { status:'sent' } → marks the contact 'met'
 *           and stamps last_interaction_at (the artifacts route side-effect),
 *           so it shows on the timeline as a real, logged interaction.
 *        3. PUT  /api/contacts/{id} { notes } → writes a clean, human-readable
 *           note into the profile ("The story so far") as the latest discussion.
 *      No transient summary box — the result lives on the profile.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";

interface NextStep {
  description?: string;
  timing?: string;
}

interface Props {
  contactId: string;
  contactName: string;
  conversationId: string | null;
  existingNotes: string | null;
  /** Called after a plain "Save notes". */
  onSaved: () => void;
  /** Called after a successful synthesize → meeting logged on the profile. */
  onLogged: () => void;
}

/** Compose a clean, readable note for the contact profile from the synthesis. */
function composeProfileNote(
  takeaways: string[],
  steps: NextStep[],
  rawNotes: string
): string {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const lines: string[] = [`Meeting — ${dateLabel}`, ""];

  if (takeaways.length > 0) {
    lines.push("Key takeaways");
    takeaways.forEach((t) => lines.push(`• ${t}`));
    lines.push("");
  }
  if (steps.length > 0) {
    lines.push("Next steps");
    steps.forEach((s) => {
      const timing = s.timing ? ` (${s.timing})` : "";
      if (s.description) lines.push(`• ${s.description}${timing}`);
    });
    lines.push("");
  }
  if (rawNotes.trim()) {
    lines.push("My raw notes");
    lines.push(rawNotes.trim());
  }
  return lines.join("\n").trim();
}

export function LiveNotesPanel({
  contactId,
  contactName,
  conversationId,
  existingNotes,
  onSaved,
  onLogged,
}: Props) {
  const [text, setText] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function persistRaw(value: string): Promise<void> {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await persistRaw(text);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSynthesize() {
    if (!text.trim()) {
      setError("Add some notes first, then log the meeting.");
      return;
    }
    setSynthesizing(true);
    setError(null);
    try {
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
      if (!convId) throw new Error("Could not start a conversation for this meeting.");

      // 1. Generate the structured meeting_notes artifact.
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
        data?: {
          artifact_id?: string;
          content?: { key_takeaways?: string[]; next_steps?: NextStep[] };
        };
        error?: string;
      };
      if (json.error) throw new Error(json.error);

      const takeaways = json.data?.content?.key_takeaways ?? [];
      const steps = json.data?.content?.next_steps ?? [];
      const artifactId = json.data?.artifact_id;

      // 2. Mark the artifact 'sent' → artifacts route logs the interaction
      //    (contact.status → 'met', last_interaction_at stamped).
      if (artifactId) {
        await fetch(`/api/artifacts/${artifactId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
      }

      // 3. Write a clean note onto the contact profile ("The story so far").
      const profileNote = composeProfileNote(takeaways, steps, text);
      await persistRaw(profileNote);

      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log the meeting.");
    } finally {
      setSynthesizing(false);
    }
  }

  const busy = saving || synthesizing;
  const firstName = contactName.split(" ")[0];

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
            placeholder="Jot notes during or after the meeting, then log it to the profile…"
            className="w-full rounded-lg border bg-white px-3.5 py-3 outline-none resize-none leading-[1.6]"
            style={{ borderColor: "#d9cdb4", color: "var(--ink-2)", fontSize: 13, minHeight: 120 }}
            rows={6}
          />

          {error && <p className="text-[12px]" style={{ color: "var(--bad)" }}>{error}</p>}

          <p className="text-[11.5px] leading-snug" style={{ color: "var(--ink-4)" }}>
            Logging a meeting writes a clean summary into {firstName}&rsquo;s profile and marks them as met.
          </p>

          <div className="flex items-center justify-end gap-2">
            <Btn variant="secondary" size="sm" onClick={() => void handleSave()} disabled={busy} icon={Icon.Check}>
              {saving ? "Saving…" : "Save notes"}
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => void handleSynthesize()} disabled={busy} icon={synthesizing ? undefined : Icon.Sparkles}>
              {synthesizing ? "Logging…" : "Save & log meeting"}
            </Btn>
          </div>

          {synthesizing && (
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
              Synthesizing and logging this meeting to {firstName}&rsquo;s profile… (~20s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
