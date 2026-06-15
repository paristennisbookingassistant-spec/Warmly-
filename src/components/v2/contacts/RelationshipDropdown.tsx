"use client";

/**
 * components/v2/contacts/RelationshipDropdown.tsx
 * Module 5 — Relationship category selector + optional cadence override.
 * Sits inside ContactDetailSidebar. PUT /api/contacts/[id] on change.
 */

import { useState, forwardRef } from "react";
import type { RelationshipCategory } from "@/types/database";
import { CATEGORY_CADENCE, CATEGORY_LABEL, isReconnectDue } from "@/lib/crm/cadence";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { useToast } from "@/components/v2/Toast";

const CATEGORIES: Array<{ value: RelationshipCategory | ""; label: string }> = [
  { value: "", label: "Uncategorized" },
  { value: "nurturing", label: CATEGORY_LABEL.nurturing },
  { value: "keep_warm", label: CATEGORY_LABEL.keep_warm },
  { value: "inner_circle", label: CATEGORY_LABEL.inner_circle },
  { value: "dormant", label: CATEGORY_LABEL.dormant },
];

const CATEGORY_COLORS: Record<RelationshipCategory, { bg: string; fg: string }> = {
  nurturing:    { bg: "#dcebd9", fg: "#34553e" },
  keep_warm:    { bg: "#dde6ee", fg: "#2f4d63" },
  inner_circle: { bg: "#ede9fe", fg: "#4c1d95" },
  dormant:      { bg: "#f1f5f9", fg: "#64748b" },
};

interface ApiContactResponse {
  data: { relationship_category: RelationshipCategory | null; cadence_days: number | null };
  error?: string;
}

interface CadenceInputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  saving: boolean;
}

function CadenceInput({ value, onChange, onBlur, placeholder, saving }: CadenceInputProps) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={saving}
        className="w-20 h-8 px-2 rounded-md text-[12.5px] text-center outline-none transition-all"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          color: "var(--ink-2)",
          opacity: saving ? 0.6 : 1,
        }}
      />
      <span className="text-[12px] text-ink-3">day cadence</span>
      {saving && <span className="text-[11px] text-ink-4">Saving…</span>}
    </div>
  );
}

interface RelationshipDropdownProps {
  contactId: string;
  category: RelationshipCategory | null;
  cadenceDays: number | null;
  nextTouchAt: string | null;
  onSaved: (category: RelationshipCategory | null, cadenceDays: number | null) => void;
}

export const RelationshipDropdown = forwardRef<HTMLSelectElement, RelationshipDropdownProps>(
function RelationshipDropdownInner({
  contactId,
  category,
  cadenceDays,
  nextTouchAt,
  onSaved,
}: RelationshipDropdownProps, ref) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [localCategory, setLocalCategory] = useState<RelationshipCategory | null>(category);
  const [localCadence, setLocalCadence] = useState<number | null>(cadenceDays);
  const [cadenceInput, setCadenceInput] = useState<string>(cadenceDays ? String(cadenceDays) : "");

  const due = isReconnectDue(nextTouchAt);
  const categoryColors = localCategory ? CATEGORY_COLORS[localCategory] : null;
  const showCadenceInput = localCategory !== null && localCategory !== "dormant";
  const cadencePlaceholder = localCategory && localCategory !== "dormant"
    ? String(CATEGORY_CADENCE[localCategory] ?? "") : "";

  async function save(newCategory: RelationshipCategory | null, newCadence: number | null) {
    setSaving(true);
    setLocalCategory(newCategory);
    setLocalCadence(newCadence);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_category: newCategory, cadence_days: newCadence }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiContactResponse = await res.json();
      if (json.error) throw new Error(json.error);
      onSaved(json.data.relationship_category, json.data.cadence_days);
      showToast("Relationship updated.");
    } catch {
      setLocalCategory(category);
      setLocalCadence(cadenceDays);
      setCadenceInput(cadenceDays ? String(cadenceDays) : "");
      showToast("Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const newCat: RelationshipCategory | null = val === "" ? null : (val as RelationshipCategory);
    setLocalCategory(newCat);
    void save(newCat, localCadence);
  }

  function handleCadenceBlur() {
    const parsed = parseInt(cadenceInput, 10);
    const newCadence = !isNaN(parsed) && parsed >= 1 ? parsed : null;
    if (newCadence !== localCadence) void save(localCategory, newCadence);
  }

  return (
    <div>
      <SectionLabel className="mb-2">Relationship</SectionLabel>
      {due && localCategory && localCategory !== "dormant" && (
        <div
          className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-medium"
          style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
        >
          <Icon.Alert size={11} />
          Due to reconnect
        </div>
      )}
      <div className="relative">
        <select
          ref={ref}
          value={localCategory ?? ""}
          onChange={handleCategoryChange}
          disabled={saving}
          className="w-full h-9 pl-3 pr-8 rounded-lg text-[13px] font-medium appearance-none outline-none transition-all cursor-pointer"
          style={{
            background: categoryColors ? categoryColors.bg : "var(--surface)",
            color: categoryColors ? categoryColors.fg : "var(--ink-2)",
            border: "1px solid rgba(0,0,0,0.1)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Icon.ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: categoryColors ? categoryColors.fg : "var(--ink-3)" }}
        />
      </div>
      {showCadenceInput && (
        <CadenceInput
          value={cadenceInput}
          onChange={setCadenceInput}
          onBlur={handleCadenceBlur}
          placeholder={cadencePlaceholder}
          saving={saving}
        />
      )}
    </div>
  );
});

RelationshipDropdown.displayName = "RelationshipDropdown";
