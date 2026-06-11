"use client";

/**
 * components/v2/draft/VariantChips.tsx
 * Row of variant + language toggle chips for the draft editor.
 */

import type { VariantKey, LangKey } from "./types";

const VARIANT_LABELS: Record<VariantKey, string> = {
  initial: "Initial",
  shorter: "Shorter",
  formal: "Formal",
  ask: "Direct ask",
  paris: "Paris",
};

const LANG_LABELS: Record<LangKey, string> = {
  "fr-tu": "FR · tu",
  "fr-vous": "FR · vous",
  en: "EN",
};

const VARIANT_KEYS: VariantKey[] = ["initial", "shorter", "formal", "ask", "paris"];
const LANG_KEYS: LangKey[] = ["fr-tu", "fr-vous", "en"];

interface VariantChipsProps {
  variant: VariantKey;
  lang: LangKey;
  loadingVariant: VariantKey | null;
  onVariant: (v: VariantKey) => void;
  onLang: (l: LangKey) => void;
}

export function VariantChips({
  variant,
  lang,
  loadingVariant,
  onVariant,
  onLang,
}: VariantChipsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4 flex-shrink-0">
      {/* Variant chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {VARIANT_KEYS.map((key) => {
          const active = variant === key;
          const loading = loadingVariant === key;
          return (
            <button
              key={key}
              onClick={() => onVariant(key)}
              disabled={loading}
              className="h-8 px-3.5 text-[12.5px] font-medium rounded-full border transition-all"
              style={{
                background: active ? "#b87a4a" : "#fdfaf3",
                color: active ? "#ffffff" : "#6b5e4a",
                borderColor: active ? "#b87a4a" : "#d9cdb4",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-[5px] h-[5px] rounded-full pulse-dot"
                    style={{ background: active ? "#fff" : "#b87a4a" }}
                  />
                  {VARIANT_LABELS[key]}
                </span>
              ) : (
                VARIANT_LABELS[key]
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: "#d9cdb4" }} />

      {/* Language toggle */}
      <div
        className="inline-flex p-0.5 rounded-full gap-0.5"
        style={{ background: "#ece2d0" }}
      >
        {LANG_KEYS.map((key) => {
          const active = lang === key;
          return (
            <button
              key={key}
              onClick={() => onLang(key)}
              className="h-7 px-3 text-[12px] font-medium rounded-full transition-all"
              style={{
                background: active ? "#ffffff" : "transparent",
                color: active ? "#1f1b16" : "#6b5e4a",
                boxShadow: active ? "0 1px 2px rgba(31,27,22,0.06)" : "none",
              }}
            >
              {LANG_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
