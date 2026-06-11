"use client";

/**
 * components/v2/prep/PurposeDropdown.tsx
 * Custom dropdown for selecting meeting purpose.
 */

import { Icon } from "@/components/v2/icons";
import type { PurposeOption } from "./types";

export const PURPOSE_OPTIONS: PurposeOption[] = [
  "First intro or coffee chat",
  "Reconnect after a while",
  "Pitch a role or an idea",
  "Ask for a specific intro or referral",
  "Investor or customer conversation",
  "Something else",
];

interface Props {
  value: PurposeOption;
  open: boolean;
  onToggle: () => void;
  onChange: (opt: PurposeOption) => void;
}

export function PurposeDropdown({ value, open, onToggle, onChange }: Props) {
  return (
    <div className="relative" style={{ maxWidth: 480 }}>
      <button
        onClick={onToggle}
        className="w-full h-10 px-3.5 rounded-lg border bg-white text-left text-[13.5px] inline-flex items-center justify-between outline-none"
        style={{ borderColor: "#d9cdb4", color: "var(--ink-2)" }}
      >
        <span>{value}</span>
        <Icon.ChevronDown
          size={14}
          style={{
            color: "var(--ink-3)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-10 left-0 right-0 bg-white border rounded-lg overflow-hidden shadow-medium animate-fade-in"
          style={{ top: "calc(100% + 4px)", borderColor: "#d9cdb4" }}
        >
          {PURPOSE_OPTIONS.map((opt, i) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="w-full px-3.5 py-2.5 text-left text-[13px] transition-colors flex items-center gap-2.5"
              style={{
                color: "var(--ink-2)",
                borderTop: i > 0 ? "1px solid #f0e6d0" : "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fdf6e9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border flex-shrink-0 inline-flex items-center justify-center"
                style={{
                  borderColor: value === opt ? "#b87a4a" : "#d9cdb4",
                  background: value === opt ? "#b87a4a" : "transparent",
                }}
              >
                {value === opt && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} />
                )}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
