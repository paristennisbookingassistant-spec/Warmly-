"use client";

/**
 * components/v2/prep/PrepIntakeForm.tsx
 * Intake form: purpose dropdown, duration pill-toggle, goal textarea, focus textarea.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";
import type { Contact } from "@/types/database";
import type { IntakeFormValues, PurposeOption, DurationOption } from "./types";
import { PurposeDropdown } from "./PurposeDropdown";
import { FormTextarea } from "./FormTextarea";

const DURATION_OPTIONS: DurationOption[] = ["15", "30", "45", "60"];

interface Props {
  contact: Contact;
  onGenerate: (values: IntakeFormValues) => void;
  onCancel: () => void;
}

export function PrepIntakeForm({ contact, onGenerate, onCancel }: Props) {
  const [purpose, setPurpose] = useState<PurposeOption>("First intro or coffee chat");
  const [duration, setDuration] = useState<DurationOption>("30");
  const [goal, setGoal] = useState("");
  const [focus, setFocus] = useState("");
  const [purposeOpen, setPurposeOpen] = useState(false);

  const firstName = contact.name.split(" ")[0];
  const canSubmit = goal.trim().length > 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden fade-up"
      style={{
        borderColor: "#b87a4a",
        background: "#ffffff",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 8px 24px rgba(184,122,74,0.10)",
      }}
    >
      {/* Header */}
      <div
        className="px-7 py-5 flex items-start justify-between gap-4 border-b"
        style={{ borderColor: "#f0e6d0", background: "#fdf6e9" }}
      >
        <div>
          <div className="font-mono-tag mb-1.5" style={{ color: "#b87a4a" }}>
            Meeting prep · intake
          </div>
          <h2 className="font-display text-ink leading-tight" style={{ fontSize: 22 }}>
            Prep your meeting with {firstName}
          </h2>
          <div className="text-[13px] mt-1" style={{ color: "var(--ink-3)" }}>
            {[contact.current_title, contact.company, contact.location].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center transition-all"
          style={{ color: "var(--ink-3)" }}
          aria-label="Cancel"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}
        >
          <Icon.X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-7 py-6 flex flex-col gap-6">
        {/* Purpose */}
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--ink-2)" }}>
            What&apos;s the purpose of this meeting?
          </label>
          <PurposeDropdown
            value={purpose}
            open={purposeOpen}
            onToggle={() => setPurposeOpen((v) => !v)}
            onChange={(opt) => { setPurpose(opt); setPurposeOpen(false); }}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--ink-2)" }}>
            How long is the meeting?
          </label>
          <div
            className="inline-flex items-center gap-1 p-1 rounded-lg border"
            style={{ borderColor: "#d9cdb4", background: "#fbf6ec" }}
          >
            {DURATION_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setDuration(m)}
                className="h-8 px-3.5 rounded-md text-[12.5px] font-medium transition-all duration-150"
                style={{
                  background: duration === m ? "#ffffff" : "transparent",
                  color: duration === m ? "#7a4a25" : "#6b5e4a",
                  boxShadow: duration === m ? "0 1px 2px rgba(31,27,22,0.06)" : "none",
                }}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <FormTextarea
          label="What do you want to walk away with?"
          placeholder="e.g. Understand their product roadmap and explore if there's a fit for a summer internship."
          value={goal}
          onChange={setGoal}
          rows={3}
        />

        <FormTextarea
          label="Anything specific on your mind?"
          optional
          placeholder="e.g. Worried about coming across too job-search-y; want to test the AI PM angle without overcommitting."
          value={focus}
          onChange={setFocus}
          rows={2}
        />
      </div>

      {/* Footer */}
      <div
        className="px-7 py-4 flex items-center justify-end gap-2 border-t"
        style={{ borderColor: "#f0e6d0", background: "#fcf8ef" }}
      >
        <button
          onClick={onCancel}
          className="text-[13px] px-3 h-9 transition-colors"
          style={{ color: "var(--ink-3)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
        >
          Cancel
        </button>
        <Btn variant="primary" size="md" disabled={!canSubmit} onClick={() => canSubmit && onGenerate({ purpose, duration, goal: goal.trim(), focus: focus.trim() })} icon={Icon.Sparkles}>
          Generate prep brief
        </Btn>
      </div>
    </div>
  );
}
