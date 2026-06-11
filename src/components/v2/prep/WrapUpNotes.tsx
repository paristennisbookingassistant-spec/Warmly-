"use client";

/**
 * components/v2/prep/WrapUpNotes.tsx
 * 2x2 grid of wrap-up note fields shown at the bottom of the Questions tab.
 */

import { NoteField } from "./NoteField";
import type { LiveNotes } from "./types";

interface Props {
  notes: LiveNotes;
  onNoteChange: (key: string, value: string) => void;
}

export function WrapUpNotes({ notes, onNoteChange }: Props) {
  return (
    <div>
      <h3 className="font-display text-ink mb-4" style={{ fontSize: 18 }}>
        Wrap-up
      </h3>
      <div className="grid grid-cols-2 gap-5">
        <NoteField
          label="Asks made"
          placeholder="What did you ask for? What did they ask you for?"
          value={notes["asksMade"] ?? ""}
          onChange={(v) => onNoteChange("asksMade", v)}
        />
        <NoteField
          label="Follow-ups"
          placeholder="What you owe them. What they owe you."
          value={notes["followUps"] ?? ""}
          onChange={(v) => onNoteChange("followUps", v)}
        />
        <NoteField
          label="Surprises"
          placeholder="Anything that didn't match what you expected."
          value={notes["surprises"] ?? ""}
          onChange={(v) => onNoteChange("surprises", v)}
        />
        <NoteField
          label="Gut read"
          placeholder="One line: is this a relationship worth investing in?"
          value={notes["gutRead"] ?? ""}
          onChange={(v) => onNoteChange("gutRead", v)}
        />
      </div>
    </div>
  );
}
