"use client";

/**
 * components/v2/contacts/sort/SortSkeletonAndError.tsx
 * Loading skeleton and error state for the SortView.
 */

import { Icon } from "@/components/v2/icons";

export function SortSkeleton() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-[480px] mx-auto animate-fade-in">
      <div className="w-full h-6 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
      <div
        className="w-full rounded-2xl shadow-medium"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 32 }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-[72px] h-[72px] rounded-full skeleton-pulse" style={{ background: "var(--line-soft)" }} />
          <div className="w-40 h-7 rounded-lg skeleton-pulse" style={{ background: "var(--line-soft)" }} />
          <div className="w-52 h-4 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
          <div className="w-full h-20 rounded-xl skeleton-pulse mt-2" style={{ background: "var(--line-soft)" }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 w-full">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl skeleton-pulse" style={{ background: "var(--line-soft)" }} />
        ))}
      </div>
    </div>
  );
}

interface SortErrorProps {
  message: string;
  onRetry: () => void;
}

export function SortError({ message, onRetry }: SortErrorProps) {
  return (
    <div className="flex flex-col items-center gap-5 mt-24 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "#fef2f2" }}
      >
        <Icon.Alert size={20} style={{ color: "#ef4444" }} />
      </div>
      <p className="text-[14px]" style={{ color: "var(--ink-3)" }}>{message}</p>
      <button
        onClick={onRetry}
        className="h-9 px-4 rounded-lg text-[13px] font-medium transition-all"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Retry
      </button>
    </div>
  );
}
