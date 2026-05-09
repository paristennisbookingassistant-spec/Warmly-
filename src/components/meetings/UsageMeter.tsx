import type { Plan } from "@/types/meeting";

export default function UsageMeter({ plan }: { plan: Plan }) {
  const remaining = plan.freeMinutesCap - plan.freeMinutesUsed;
  const pct = Math.min(100, (plan.freeMinutesUsed / plan.freeMinutesCap) * 100);

  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 rounded-lg mb-6"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <span className="text-[12.5px]" style={{ color: "var(--ink-2)" }}>
        <span className="font-mono font-medium" style={{ color: "var(--ink)" }}>
          {plan.freeMinutesUsed}
        </span>{" "}
        of {plan.freeMinutesCap} free minutes used this month
      </span>
      <span
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: "var(--line-soft)" }}
      >
        <span
          className="block h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: remaining <= 10 ? "var(--bad)" : "var(--accent)",
          }}
        />
      </span>
      <span
        className="font-mono text-[10.5px] uppercase tracking-wider flex-shrink-0"
        style={{ color: "var(--ink-3)" }}
      >
        {remaining} min left · resets May 1
      </span>
    </div>
  );
}
