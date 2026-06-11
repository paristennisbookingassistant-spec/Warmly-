/**
 * components/v2/settings/SyncStatusRow.tsx
 * In-progress sync progress bar, shown inside LinkedInIntegrationBlock.
 */

interface SyncStatusRowProps {
  phase: 1 | 2;
  imported: number;
  enriched: number;
  total: number | null;
}

export function SyncStatusRow({ phase, imported, enriched, total }: SyncStatusRowProps) {
  const current = phase === 1 ? imported : enriched;
  const pct = total ? Math.round((current / total) * 100) : null;

  return (
    <div className="mt-3 px-4 py-3 rounded-xl" style={{ background: "#f0f6ec", border: "1px solid #dce8d8" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono-tag text-ink-4">
          {phase === 1 ? "Phase 1 · importing connections" : "Phase 2 · enriching profiles"}
        </span>
        {pct !== null && (
          <span className="text-[11px] font-medium" style={{ color: "#5e8d6a" }}>{pct}%</span>
        )}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#dce8d8" }}>
        <div
          className="h-full rounded-full progress-fill"
          style={{ width: `${pct ?? 30}%`, background: "#5e8d6a" }}
        />
      </div>
      <div className="mt-1.5 text-[11.5px] text-ink-3">
        {phase === 1
          ? `${imported} imported${total ? ` of ${total}` : ""}`
          : `${enriched} enriched${total ? ` of ${total}` : ""}`}
      </div>
    </div>
  );
}
