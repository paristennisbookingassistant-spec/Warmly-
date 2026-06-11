"use client";

/**
 * components/v2/draft/DraftMetaPanel.tsx
 * Right pane top section: collapsible "Why this draft" + "Voice signals used" accordions.
 * Content is static/contextual; no API call needed for these panels.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";
import type { Contact } from "@/types/database";

interface DraftMetaPanelProps {
  contact: Contact;
  variantLabel: string;
  lang: string;
}

export function DraftMetaPanel({ contact, variantLabel, lang }: DraftMetaPanelProps) {
  const [whyOpen, setWhyOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const inseadMatch = (contact.education_v2 ?? []).find((e) => /insead/i.test(e.school));
  const hook = contact.suggested_hook ?? contact.recommendation_reason;

  return (
    <div
      className="bg-white border rounded-2xl overflow-hidden flex-shrink-0"
      style={{ borderColor: "#e5d8be" }}
    >
      <MetaAccordion
        open={whyOpen}
        onToggle={() => setWhyOpen((v) => !v)}
        title="Why this draft"
      >
        <div className="text-[12.5px] text-ink-2 leading-relaxed">
          {hook ? (
            hook
          ) : (
            <>
              Draft tailored to {contact.name}
              {contact.company ? ` at ${contact.company}` : ""}
              {inseadMatch ? ", with INSEAD alumni context" : ""}.
              Tone mirrors your preferred{" "}
              {lang === "fr-tu"
                ? "French informal"
                : lang === "fr-vous"
                ? "French formal"
                : "English"}{" "}
              outreach style.
            </>
          )}
        </div>
      </MetaAccordion>

      <div className="h-px" style={{ background: "#e5d8be" }} />

      <MetaAccordion
        open={voiceOpen}
        onToggle={() => setVoiceOpen((v) => !v)}
        title="Voice signals used"
      >
        <ul className="flex flex-col gap-2 text-[12.5px] text-ink-2">
          <li className="flex items-center gap-2">
            <span
              className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ background: "#b87a4a" }}
            />
            {lang === "fr-tu"
              ? 'French informal "tu"'
              : lang === "fr-vous"
              ? 'French formal "vous"'
              : "English register"}
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ background: "#b87a4a" }}
            />
            Variant: {variantLabel}
          </li>
          {inseadMatch && (
            <li className="flex items-center gap-2">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: "#b87a4a" }}
              />
              INSEAD alumni connection used as hook
            </li>
          )}
        </ul>
      </MetaAccordion>
    </div>
  );
}

function MetaAccordion({
  open,
  onToggle,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span
          className="text-[10.5px] font-medium text-ink-2 uppercase"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}
        >
          {title}
        </span>
        <Icon.ChevronRight
          size={14}
          className="text-ink-3 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }}
        />
      </button>
      {open && <div className="px-5 pb-4 fade-up">{children}</div>}
    </div>
  );
}
