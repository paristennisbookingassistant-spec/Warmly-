"use client";

/**
 * components/v2/prep/PrepLoading.tsx
 * Loading state shown while meeting_prep generation runs (5-15s).
 * A pulsing Sparkles icon + cycling message sequence + progress dots.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/v2/icons";

const MESSAGES = [
  "Researching the company.",
  "Pulling signals on your contact.",
  "Drafting discussion themes.",
  "Building your coaching notes.",
  "Almost ready.",
] as const;

interface Props {
  contactFirstName: string;
}

export function PrepLoading({ contactFirstName }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const stepMs = 2400;
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
