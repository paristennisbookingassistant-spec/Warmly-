/**
 * components/v2/contacts/sort/SortEmptyState.tsx
 * Two states:
 *   - "done"  — the queue was non-empty and has been fully sorted
 *   - "empty" — all contacts were already categorized on load
 */

import Link from "next/link";

interface SortEmptyStateProps {
  variant: "done" | "empty";
}

export function SortEmptyState({ variant }: SortEmptyStateProps) {
  const isDone = variant === "done";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-up px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6 text-3xl"
        style={{ background: "var(--accent-soft)" }}
        aria-hidden
      >
        {isDone ? "🎉" : "✓"}
      </div>

      <h2
        className="font-display mb-2"
        style={{ fontSize: 28, color: "var(--ink)", letterSpacing: "-0.01em" }}
      >
        {isDone ? "Network sorted" : "Already sorted"}
      </h2>

      <p className="text-[14px] max-w-[320px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
        {isDone
          ? "All uncategorized contacts now have a relationship category. Warmly will start sending you reconnect reminders."
          : "Every saved contact already has a relationship category — nothing left to sort right now."}
      </p>

      <Link
        href="/v2/contacts"
        className="mt-8 inline-flex items-center gap-2 h-10 px-5 rounded-lg text-[13.5px] font-medium transition-all"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Back to contacts
      </Link>
    </div>
  );
}
