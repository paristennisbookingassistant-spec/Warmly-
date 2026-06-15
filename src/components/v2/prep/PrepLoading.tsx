"use client";

/**
 * components/v2/prep/PrepLoading.tsx
 * Loading state shown while meeting_prep generation runs. The MiniMax reasoning
 * model takes ~30-45s, so the message cadence is paced to that — NOT 12s — or
 * the sequence ends on "almost ready" and sits there for 30s, reading as stuck.
 * A pulsing Sparkles icon + cycling message sequence + progress dots + skeleton.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/v2/icons";

const MESSAGES = [
  "Researching the company.",
  "Pulling recent signals and news.",
  "Mapping how their background connects to yours.",
  "Drafting the discussion themes.",
  "Building your coaching notes.",
  "Polishing the brief, worth the short wait.",
] as const;

interface Props {
  contactFirstName: string;
}

export function PrepLoading({ contactFirstName }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // ~7s per step × 6 = ~42s, matching the real reasoning-model duration so the
    // sequence advances the whole time instead of dead-ending early. The final
    // message holds (and the icon keeps pulsing) if generation runs longer.
    const stepMs = 7000;
    const t = setInterval(
      () => setIdx((i) => Math.min(i + 1, MESSAGES.length - 1)),
      stepMs
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-center px-12 py-20 fade-up">
      <div className="text-center" style={{ maxWidth: 420 }}>
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
          style={{ background: "#f3e2cd" }}
        >
          <Icon.Sparkles
            size={26}
            style={{ color: "#b87a4a", animation: "pulseDot 1.6s ease-in-out infinite" }}
          />
        </div>

        {/* Heading */}
        <h2
          className="font-display text-ink leading-tight mb-3"
          style={{ fontSize: 24 }}
        >
          Building your prep brief for {contactFirstName}&hellip;
        </h2>

        {/* Cycling message */}
        <div
          className="text-[14px] min-h-[44px] flex items-center justify-center"
          style={{ color: "var(--ink-3)" }}
        >
          <span key={idx} className="animate-fade-in">
            {MESSAGES[idx]}
          </span>
        </div>

        {/* Progress dots */}
        <div className="mt-8 flex items-center justify-center gap-1.5">
          {MESSAGES.map((_, i) => (
            <span
              key={i}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 28 : 14,
                background: i <= idx ? "#b87a4a" : "#e5d8be",
              }}
            />
          ))}
        </div>

        {/* Shimmer skeleton preview */}
        <div className="mt-10 flex flex-col gap-3 text-left">
          {[100, 85, 92, 72].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-full skeleton-pulse"
              style={{ background: "#ece2d0", width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
