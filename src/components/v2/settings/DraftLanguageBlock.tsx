"use client";

/**
 * components/v2/settings/DraftLanguageBlock.tsx
 * Draft language preference — persisted to localStorage.
 * Purely client-side preference; no API call needed.
 */

import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/v2/primitives";
import { useToast } from "@/components/v2/Toast";

const STORAGE_KEY = "warmly:draft_language";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
] as const;

type LangValue = (typeof LANGUAGES)[number]["value"];

// No loading/error states needed — pure localStorage, no network calls.
export function DraftLanguageBlock() {
  const [selected, setSelected] = useState<LangValue>("en");
  const showToast = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.value === stored)) {
      setSelected(stored as LangValue);
    }
  }, []);

  function handleChange(value: LangValue) {
    setSelected(value);
    localStorage.setItem(STORAGE_KEY, value);
    const label = LANGUAGES.find((l) => l.value === value)?.label ?? value;
    showToast(`Draft language set to ${label}.`);
  }

  return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <SectionLabel className="mb-1">Draft language</SectionLabel>
      <p className="text-[12.5px] text-ink-3 mb-5">
        Default language used when the coach drafts outreach messages for you.
      </p>

      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => {
          const active = selected === lang.value;
          return (
            <button
              key={lang.value}
              type="button"
              onClick={() => handleChange(lang.value)}
              className="h-9 px-4 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: active ? "#f3e2cd" : "var(--bg-sunk)",
                color: active ? "#7a4a25" : "var(--ink-3)",
                border: active ? "1px solid #b87a4a" : "1px solid var(--line-soft)",
              }}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
