"use client";

/**
 * components/v2/prep/QuestionItem.tsx
 * Single question row: question text, "Why" reveal, and notes textarea.
 */

import { useState } from "react";
import { Icon } from "@/components/v2/icons";

interface Props {
  themeIdx: number;
  questionIdx: number;
  text: string;
  value: string;
  onChange: (v: string) => void;
}

export function QuestionItem({ themeIdx, questionIdx, text, value, onChange }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const label = `Q${themeIdx * 10 + questionIdx + 1}`;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "44px 1fr" }}>
      <div className="font-mono-tag pt-2" style={{ color: "#b87a4a", fontSize: 11 }}>
        {label}
      </div>
      <div className="flex flex-col">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-[15px] leading-[1.55]" style={{ color: "var(--ink)" }}>
            <span style={{ color: "var(--ink-3)" }}>&ldquo;</span>
            {text}
            <span style={{ color: "var(--ink-3)" }}>&rdquo;</span>
          </p>
          <button
            onClick={() => setWhyOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11.5px] transition-colors flex-shrink-0 mt-1"
            style={{ color: "var(--ink-3)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#b87a4a")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
          >
            <span>Why</span>
            <Icon.ChevronDown
              size={11}
              style={{
                transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            />
          </button>
        </div>

        {whyOpen && (
          <div
            className="mt-2.5 px-3.5 py-2.5 rounded-md text-[12.5px] leading-relaxed animate-fade-in"
            style={{
              background: "#fdf6e9",
              borderLeft: "2px solid #b87a4a",
              maxWidth: 680,
              color: "var(--ink-2)",
            }}
          >
            Ask this to understand their perspective on the topic — it opens a natural dialogue
            without putting them on the spot.
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your notes during the conversation…"
          className="mt-3 w-full rounded-lg border bg-white px-3.5 py-2.5 outline-none resize-none leading-[1.6]"
          style={{
            borderColor: "#d9cdb4",
            color: "var(--ink-2)",
            fontSize: 12.5,
            fontFamily: "var(--font-mono)",
          }}
          rows={2}
        />
      </div>
    </div>
  );
}
