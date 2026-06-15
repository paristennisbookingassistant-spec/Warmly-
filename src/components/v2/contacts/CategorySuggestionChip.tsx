"use client";

/**
 * components/v2/contacts/CategorySuggestionChip.tsx
 * Shown inside ContactDetailSidebar when relationship_category is null.
 * Displays the heuristic suggestion + one-tap Confirm + "Choose another" fallback.
 * "Choose another" focuses the existing RelationshipDropdown select.
 */

import { useState } from "react";
import type { RelationshipCategory } from "@/types/database";
import { CATEGORY_LABEL } from "@/lib/crm/cadence";
import type { CategorySuggestion } from "@/lib/crm/suggestCategory";
import { Icon } from "@/components/v2/icons";
import { useToast } from "@/components/v2/Toast";

// Warm palette tints per category — matches RelationshipDropdown
const CHIP_COLORS: Record<RelationshipCategory, { bg: string; fg: string; dot: string; border: string }> = {
  nurturing:    { bg: "#dcebd9", fg: "#34553e", dot: "#5e8d6a", border: "#a8d5a2" },
  keep_warm:    { bg: "#dde6ee", fg: "#2f4d63", dot: "#4a6f87", border: "#a6bfcf" },
  inner_circle: { bg: "#ede9fe", fg: "#4c1d95", dot: "#7c3aed", border: "#c4b5fd" },
  dormant:      { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8", border: "#cbd5e1" },
};

interface ApiResp {
  data: { relationship_category: RelationshipCategory | null; cadence_days: number | null };
  error?: string;
}

export interface CategorySuggestionChipProps {
  contactId: string;
  suggestion: CategorySuggestion;
  onConfirmed: (category: RelationshipCategory, cadenceDays: number | null) => void;
  onDismiss: () => void;
  dropdownRef?: React.RefObject<HTMLSelectElement | null>;
}

export function CategorySuggestionChip({
  contactId, suggestion, onConfirmed, onDismiss, dropdownRef,
}: CategorySuggestionChipProps) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const c = CHIP_COLORS[suggestion.category];
  const label = CATEGORY_LABEL[suggestion.category];

  async function confirm() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_category: suggestion.category, cadence_days: null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: ApiResp = await res.json();
      if (j.error) throw new Error(j.error);
      onConfirmed(j.data.relationship_category ?? suggestion.category, j.data.cadence_days);
      showToast(`Categorized as ${label}.`);
    } catch {
      showToast("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    onDismiss();
    if (dropdownRef?.current) {
      dropdownRef.current.focus();
      dropdownRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  if (dismissed) return null;

  return (
    <div className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.border}`, opacity: saving ? 0.7 : 1 }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: c.dot }} />
          <span className="text-[11.5px] font-semibold tracking-wide" style={{ color: c.fg }}>SUGGESTED</span>
        </div>
        <button onClick={dismiss} aria-label="Choose another category" className="w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100 transition-opacity" style={{ color: c.fg }}>
          <Icon.X size={11} />
        </button>
      </div>

      <div className="mb-2.5">
        <div className="text-[13px] font-semibold" style={{ color: c.fg }}>{label}</div>
        <div className="text-[11.5px] mt-0.5 leading-snug" style={{ color: c.fg, opacity: 0.75 }}>{suggestion.reason}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => void confirm()}
          disabled={saving}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] font-semibold transition-all"
          style={{ background: c.fg, color: c.bg, opacity: saving ? 0.6 : 1, cursor: saving ? "wait" : "pointer" }}
        >
          {saving ? "Saving…" : <><Icon.Check size={11} strokeWidth={2.5} />Confirm</>}
        </button>
        <button
          onClick={dismiss}
          disabled={saving}
          className="text-[11.5px]"
          style={{ color: c.fg, opacity: 0.6 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.6"; }}
        >
          Choose another
        </button>
      </div>
    </div>
  );
}
