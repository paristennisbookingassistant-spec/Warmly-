"use client";

/**
 * components/v2/prep/PrepBriefHeader.tsx
 * Sticky top header for the brief view: back button, title, tab bar,
 * copy-notes + save-snapshot action buttons.
 */

import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";
import type { Contact } from "@/types/database";
import type { PrepTab, IntakeFormValues } from "./types";

const TABS: { id: PrepTab; label: string; key: string }[] = [
  { id: "snapshot", label: "Snapshot", key: "1" },
  { id: "company",  label: "Company",  key: "2" },
  { id: "agenda",  label: "Agenda",   key: "3" },
  { id: "questions", label: "Questions", key: "4" },
];

interface Props {
  contact: Contact;
  intake: IntakeFormValues;
  activeTab: PrepTab;
  savedAt: string | null;
  onTabChange: (tab: PrepTab) => void;
  onBack: () => void;
  onCopyNotes: () => void;
}

export function PrepBriefHeader({
  contact,
  intake,
  activeTab,
  savedAt,
  onTabChange,
  onBack,
  onCopyNotes,
}: Props) {
  return (
    <div
      className="sticky top-0 z-20 border-b"
      style={{ background: "#f4ede0", borderColor: "#e5d8be" }}
    >
      <div className="px-10 pt-5 pb-0 max-w-[1240px] mx-auto">
        {/* Row 1: back + autosave stamp */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] transition-colors"
            style={{ color: "var(--ink-3)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
          >
            <Icon.ArrowLeft size={14} />
            Back to {contact.name.split(" ")[0]}
          </button>
          <div className="font-mono-tag" style={{ color: "var(--ink-4)" }}>
            {savedAt ? `Notes saved ${savedAt}` : "Live notes autosave"}
          </div>
        </div>

        {/* Row 2: title + actions */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#f3e2cd", color: "#7a4a25" }}
            >
              <Icon.Calendar size={16} />
            </div>
            <div className="min-w-0">
              <div
                className="font-mono-tag mb-0.5"
                style={{ color: "#b87a4a" }}
              >
                Meeting prep
              </div>
              <h1
                className="font-display text-ink leading-tight truncate"
                style={{ fontSize: 20 }}
              >
                {contact.name}
                <span style={{ color: "var(--ink-3)" }}>
                  {" "}
                  &middot; {intake.duration} min &middot; {intake.purpose.toLowerCase()}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Btn variant="secondary" size="sm" icon={Icon.Copy} onClick={onCopyNotes}>
              Copy notes
            </Btn>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="px-4 h-10 text-[13px] font-medium transition-colors relative inline-flex items-center gap-2"
              style={{ color: activeTab === t.id ? "#7a4a25" : "var(--ink-3)" }}
            >
              {t.label}
              <span
                className="font-mono-tag"
                style={{ fontSize: 9.5, color: "var(--ink-4)" }}
              >
                {t.key}
              </span>
              {activeTab === t.id && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "#b87a4a" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
