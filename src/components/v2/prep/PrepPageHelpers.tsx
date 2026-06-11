"use client";

/**
 * components/v2/prep/PrepPageHelpers.tsx
 * Helper components used by the Meeting Prep page:
 * - ContactLoadingSkeleton
 * - PrepError
 * These are purely presentational; data lives in the page.
 */

interface PrepErrorProps {
  message: string;
  onRetry: () => void;
}

export function ContactLoadingSkeleton() {
  return (
    <div className="px-10 pt-8 pb-6 max-w-[1240px] mx-auto w-full fade-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-4 w-28 rounded-full skeleton-pulse" style={{ background: "#ece2d0" }} />
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#e5d8be" }}>
        <div className="h-[88px] skeleton-pulse" style={{ background: "#f3e2cd" }} />
        <div className="p-7 flex flex-col gap-5">
          {[480, 640, 360].map((w) => (
            <div
              key={w}
              className="h-3 rounded-full skeleton-pulse"
              style={{ background: "#ece2d0", maxWidth: w }}
            />
          ))}
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-36 rounded-lg skeleton-pulse" style={{ background: "#ece2d0" }} />
            <div className="h-10 w-36 rounded-lg skeleton-pulse" style={{ background: "#ece2d0" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrepError({ message, onRetry }: PrepErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-10 py-20">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "#fef3c7" }}
      >
        <span className="text-[22px]">&#x26A0;</span>
      </div>
      <div className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        Something went wrong
      </div>
      <div
        className="text-[13px] text-center"
        style={{ color: "var(--ink-3)", maxWidth: 320 }}
      >
        {message}
      </div>
      <button
        onClick={onRetry}
        className="h-9 px-5 text-[13px] font-medium rounded-lg transition-all"
        style={{ background: "#b87a4a", color: "#fff" }}
      >
        Retry
      </button>
    </div>
  );
}
