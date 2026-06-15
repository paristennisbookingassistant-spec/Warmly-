/**
 * components/v2/contacts/sort/SortProgress.tsx
 * Thin progress bar + "Sorted X of Y" label for the sort queue flow.
 */

interface SortProgressProps {
  done: number;
  total: number;
}

export function SortProgress({ done, total }: SortProgressProps) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono-tag text-ink-3">
          Sorted {done} of {total}
        </span>
        <span className="font-mono-tag text-ink-4">{pct}%</span>
      </div>
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: "var(--line-soft)" }}
      >
        <div
          className="h-full rounded-full progress-fill"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
