"use client";

import type { NetworkingGoal } from "@/types/database";
import Badge from "@/components/ui/Badge";

interface GoalCardProps {
  goal: NetworkingGoal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const { progress, target_contacts_per_month, target_meetings_per_month } = goal;

  const contactsPercent = Math.min(
    100,
    Math.round((progress.contacts_found / target_contacts_per_month) * 100)
  );
  const meetingsPercent = Math.min(
    100,
    Math.round((progress.meetings_held / target_meetings_per_month) * 100)
  );

  const statusVariant =
    goal.status === "achieved" ? "success" : goal.status === "paused" ? "warning" : "blue";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={statusVariant}>{goal.status}</Badge>
            <span className="text-xs text-gray-500 capitalize">
              {goal.goal_type.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{goal.description}</p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        <GoalProgressBar
          label="Contacts found"
          current={progress.contacts_found}
          target={target_contacts_per_month}
          percent={contactsPercent}
          unit="this month"
        />
        <GoalProgressBar
          label="Meetings held"
          current={progress.meetings_held}
          target={target_meetings_per_month}
          percent={meetingsPercent}
          unit="this month"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCell label="Messages sent" value={progress.messages_sent} />
        <StatCell label="Responses received" value={progress.responses_received} />
      </div>

      {/* Target companies */}
      {goal.target_companies.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Target companies</p>
          <div className="flex flex-wrap gap-1.5">
            {goal.target_companies.slice(0, 6).map((co) => (
              <span key={co} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                {co}
              </span>
            ))}
            {goal.target_companies.length > 6 && (
              <span className="text-xs text-gray-400">+{goal.target_companies.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GoalProgressBar({
  label,
  current,
  target,
  percent,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  percent: number;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
        <span className="font-medium">{label}</span>
        <span>
          <span className="font-semibold text-gray-900">{current}</span> / {target}{" "}
          <span className="text-gray-400">{unit}</span>
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
