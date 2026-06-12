"use client";

/**
 * components/v2/onboarding/ChipEditor.tsx
 * Chip list with an inline "add" input. Used for target_companies and
 * work_authorization chips in the review step.
 */

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Chip } from "@/components/v2/primitives";

interface ChipEditorProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function ChipEditor({ values, onChange, placeholder = "+ add" }: ChipEditorProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }

  function remove(item: string) {
    onChange(values.filter((x) => x !== item));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <Chip key={v} variant="selected" removable onRemove={() => remove(v)}>
          {v}
        </Chip>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={placeholder}
        className="h-8 px-3 rounded-full text-[12.5px] focus-ring transition-shadow"
        style={{
          border: "1px dashed #cdbf9f",
          background: "transparent",
          color: "var(--ink)",
          width: 92,
          outline: "none",
        }}
      />
    </div>
  );
}
