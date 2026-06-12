"use client";

/**
 * components/v2/onboarding/ProcessingState.tsx
 * Animated "Reading your CV…" screen shown while the parse-cv request is in flight.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/v2/icons";

const STAGES = [
  "Reading your CV",
  "Extracting your background",
  "Mapping your experience",
  "Preparing the review form",
];

export function ProcessingState() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const intervals: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((_, i) => {
      if (i === 0) return;
      intervals.push(
        setTimeout(() => setActiveIdx(i), i * 1400)
      );
    });
    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-8 fade-up">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "#f3e2cd" }}
      >
        <span
          className="rounded-full pulse-dot inline-block"
          style={{ width: 16, height: 16, background: "#b87a4a" }}
        />
      </div>
      <h2
        className="font-display text-[32px] leading-[1.1]"
        style={{ color: "var(--ink)" }}
      >
        Reading your CV&hellip;
      </h2>
      <div className="flex flex-col gap-3 min-w-[320px]">
        {STAGES.map((stage, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div
              key={stage}
              className="flex items-center gap-3 text-[14px] transition-opacity duration-300"
              style={{ opacity: done || active ? 1 : 0.35 }}
            >
              {done ? (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#5e8d6a", color: "white" }}
                >
                  <Icon.Check size={12} strokeWidth={2.5} />
                </span>
              ) : active ? (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center pulse-dot flex-shrink-0"
                  style={{ background: "#f3e2cd" }}
                >
                  <span
                    className="rounded-full inline-block"
                    style={{ width: 7, height: 7, background: "#b87a4a" }}
                  />
                </span>
              ) : (
                <span
                  className="w-5 h-5 rounded-full border flex-shrink-0"
                  style={{ borderColor: "#cdbf9f" }}
                />
              )}
              <span style={{ color: done ? "var(--ink)" : active ? "var(--ink)" : "var(--ink-3)" }}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
