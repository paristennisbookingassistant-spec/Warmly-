/**
 * components/v2/contacts/StorySoFarStub.tsx
 * Stub for the "Story so far" panel. Shows contact.notes if present,
 * otherwise a tasteful placeholder. Does NOT fabricate a narrative.
 * (The AI-generated story is a future feature.)
 */

import { SectionLabel } from "@/components/v2/primitives";

interface StorySoFarStubProps {
  notes: string | null;
  contactFirstName: string;
}

export function StorySoFarStub({ notes, contactFirstName }: StorySoFarStubProps) {
  return (
    <div
      className="my-7 rounded-2xl px-7 py-6"
      style={{ background: "#fbf6ec", border: "1px solid #ebdfc4" }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-ink" style={{ fontSize: 20, lineHeight: 1.2 }}>
          The story so far
        </h3>
        <span
          className="font-mono-tag text-ink-4"
          style={{ fontSize: 9.5, letterSpacing: "0.06em" }}
        >
          STUB · AI narrative coming soon
        </span>
      </div>

      {notes ? (
        <div className="text-[14.5px] leading-[1.6] text-ink-2" style={{ maxWidth: 680, whiteSpace: "pre-wrap" }}>
          {notes}
        </div>
      ) : (
        <p className="text-[14.5px] leading-[1.6] text-ink-3 italic" style={{ maxWidth: 640 }}>
          Your coach will build the relationship story with {contactFirstName} here as you
          interact — drafts sent, meetings held, and signals picked up along the way.
          Add a note below to get started.
        </p>
      )}
    </div>
  );
}
