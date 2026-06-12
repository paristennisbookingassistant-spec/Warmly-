"use client";

/**
 * components/v2/onboarding/GeoSelector.tsx
 * Toggle-chip geography selector with a preset list + inline free-text input.
 */

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Chip } from "@/components/v2/primitives";

const PRESET_GEOS = [
  "Paris", "London", "Singapore", "New York", "Bay Area", "Berlin", "Dubai",
  "Hong Kong", "Tokyo", "Shanghai", "São Paulo",
];

interface GeoSelectorProps {
  values: string[];
  onChange: (next: string[]) => void;
}

export function GeoSelector({ values, onChange }: GeoSelectorProps) {
  const [draft, setDraft] = useState("");

  function toggle(g: string) {
    onChange(values.includes(g) ? values.filter((x) => x !== g) : [...values, g]);
  }

  function addCustom() {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
  }

  // Merge preset + any custom geos
  const allGeos = Array.from(new Set([...PRESET_GEOS, ...values]));

  return (
    <div className="flex flex-wrap gap-2">
      {allGeos.map((g) => {
        const sel = values.includes(g);
        return (
          <Chip
            key={g}
            variant={sel ? "selected" : "default"}
            checked={sel}
            onClick={() => toggle(g)}
          >
            {g}
          </Chip>
        );
      })}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addCustom}
        placeholder="+ other"
        className="h-8 px-3 rounded-full text-[12.5px] focus-ring transition-shadow"
        style={{
          border: "1px dashed #cdbf9f",
          background: "transparent",
          color: "var(--ink)",
          width: 88,
          outline: "none",
        }}
      />
    </div>
  );
}
