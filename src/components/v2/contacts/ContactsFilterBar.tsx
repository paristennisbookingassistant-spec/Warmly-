"use client";

/**
 * components/v2/contacts/ContactsFilterBar.tsx
 * Filter pill row + search input used by ContactsList.
 */

import type { ContactStatus } from "@/types/database";
import { Icon } from "@/components/v2/icons";

export type FilterId = "all" | ContactStatus | "followup" | "reconnect";

const FILTERS: { id: FilterId; label: string; icon?: boolean }[] = [
  { id: "all", label: "All" },
  { id: "discovered", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "connected", label: "Connected" },
  { id: "met", label: "Met" },
  { id: "followup", label: "Follow-up due", icon: true },
  { id: "reconnect", label: "Due to reconnect", icon: true },
];

interface ContactsFilterBarProps {
  filter: FilterId;
  onFilterChange: (f: FilterId) => void;
  searchInput: string;
  onSearchChange: (v: string) => void;
}

export function ContactsFilterBar({
  filter,
  onFilterChange,
  searchInput,
  onSearchChange,
}: ContactsFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className="h-8 px-3 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors"
              style={{
                background: active ? "#1f1b16" : "#ffffff",
                color: active ? "#f4ede0" : "#3d352c",
                border: `1px solid ${active ? "#1f1b16" : "#d9cdb4"}`,
              }}
            >
              {f.icon && <Icon.Alert size={12} />}
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="relative w-[260px]">
        <Icon.Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--ink-4)" }}
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, company…"
          className="w-full h-9 pl-8 pr-3 rounded-lg text-[13px] outline-none transition-all"
          style={{ background: "#ffffff", border: "1px solid #d9cdb4", color: "var(--ink-2)" }}
        />
      </div>
    </div>
  );
}
