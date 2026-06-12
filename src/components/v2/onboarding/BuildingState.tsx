"use client";

/**
 * components/v2/onboarding/BuildingState.tsx
 * Animated "Building your coach…" screen shown while onboarding-complete runs.
 * MiniMax profile build takes 15-30s; stages advance on a timer.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/v2/icons";

const STAGES = [
  "Reading your CV",
  "Mapping your transition",
  "Calibrating your voice",
  "Finding your first matches",
];

export function BuildingState() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setActiveIdx(1), 600));
    timers.push(setTimeout(() => setActiveIdx(2), 5000));
    timers.push(setTimeout(() => setActiveIdx(3), 12000));
    return () => timers.forEach(clearTimeout);
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
        Building your coach&hellip;
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
              <span
                style={{
                  color: done ? "var(--ink)" : active ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
