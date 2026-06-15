"use client";

/**
 * components/v2/contacts/sort/CategoryActionBar.tsx
 * Row of 4 category buttons + Skip affordance.
 * Keyboard: 1-4 picks a category, → (ArrowRight) skips.
 * The suggested category is visually pre-highlighted.
 */

import { useEffect } from "react";
import type { RelationshipCategory } from "@/types/database";
import { CATEGORY_LABEL, CATEGORY_CADENCE } from "@/lib/crm/cadence";

const CATEGORIES: RelationshipCategory[] = ["nurturing", "keep_warm", "inner_circle", "dormant"];

const CAT_STYLE: Record<RelationshipCategory, { base: string; active: string; fg: string; border: string }> = {
  nurturing:    { base: "#f0f7ef", active: "#dcebd9", fg: "#34553e", border: "#a8d5a2" },
  keep_warm:    { base: "#eef3f8", active: "#dde6ee", fg: "#2f4d63", border: "#a6bfcf" },
  inner_circle: { base: "#f5f3ff", active: "#ede9fe", fg: "#4c1d95", border: "#c4b5fd" },
  dormant:      { base: "#f7f9fb", active: "#f1f5f9", fg: "#64748b", border: "#cbd5e1" },
};

function cadenceLabel(cat: RelationshipCategory): string {
  const d = CATEGORY_CADENCE[cat];
  return d ? `every ${d}d` : "no reminders";
}

interface CategoryActionBarProps {
  suggested: RelationshipCategory | null;
  onPick: (cat: RelationshipCategory) => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function CategoryActionBar({ suggested, onPick, onSkip, disabled = false }: CategoryActionBarProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (disabled) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "s" || e.key === "S") { onSkip(); return; }
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= 4) onPick(CATEGORIES[idx - 1]);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPick, onSkip, disabled]);

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="grid grid-cols-4 gap-2 mb-3">
        {CATEGORIES.map((cat, idx) => {
          const s = CAT_STYLE[cat];
          const active = cat === suggested;
          return (
            <button
              key={cat}
              onClick={() => !disabled && onPick(cat)}
              disabled={disabled}
              aria-label={`Set as ${CATEGORY_LABEL[cat]}`}
              className="relative flex flex-col items-center gap-1.5 rounded-xl py-3.5 px-2 text-center transition-all duration-150 focus:outline-none focus-ring"
              style={{
                background: active ? s.active : s.base,
                color: s.fg,
                border: active ? `1.5px solid ${s.border}` : "1.5px solid transparent",
                opacity: disabled ? 0.55 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                boxShadow: active ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span
                className="absolute top-2 right-2 w-4 h-4 rounded flex items-center justify-center font-mono text-[9px] font-bold"
                style={{ background: active ? s.border : "transparent", color: active ? s.fg : "transparent", opacity: 0.6 }}
              >
                {idx + 1}
              </span>
              {active && (
                <span className="absolute top-2 left-2 font-mono-tag" style={{ fontSize: 8, color: s.fg, opacity: 0.65 }}>
                  AI
                </span>
              )}
              <span className="text-[12.5px] font-semibold leading-tight">{CATEGORY_LABEL[cat]}</span>
              <span className="text-[10.5px] opacity-60 leading-none">{cadenceLabel(cat)}</span>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <button
          onClick={onSkip}
          disabled={disabled}
          className="text-[12px] transition-opacity"
          style={{ color: "var(--ink-4)", opacity: disabled ? 0.4 : 0.8, cursor: disabled ? "not-allowed" : "pointer" }}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
        >
          Skip for now <span style={{ opacity: 0.5 }}>(→)</span>
        </button>
      </div>
    </div>
  );
}
