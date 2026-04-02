"use client";

import type { NetworkingGoal } from "@/types/database";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: NetworkingGoal;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  job_search: "Job Search",
  industry_exploration: "Industry Exploration",
  relationship_building: "Relationship Building",
  other: "Other",
};

function daysUntil(dateStr: string): number | null {
  try {
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function DaysRemainingBadge({ days }: { days: number }) {
  const colorClass =
    days <= 0
      ? "bg-gray-100 text-gray-500"
      : days <= 7
      ? "bg-red-50 text-red-700"
      : days <= 30
      ? "bg-amber-50 text-amber-700"
      : "bg-green-50 text-green-700";

  const label =
    days <= 0 ? "Completed" : days === 1 ? "1 day left" : `${days} days left`;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass
      )}
    >
      {label}
    </span>
  );
}

function ProgressBar({
  percent,
  colorClass = "bg-blue-500",
}: {
  percent: number;
  colorClass?: string;
}) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full progress-fill transition-all duration-700",
          colorClass
        )}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

export default function GoalCard({ goal }: GoalCardProps) {
  const { progress, target_contacts_per_month, target_meetings_per_month } =
    goal;

  const contactsPercent =
    target_contacts_per_month > 0
      ? Math.min(100, Math.round((progress.contacts_found / target_contacts_per_month) * 100))
      : 0;

  const meetingsPercent =
    target_meetings_per_month > 0
      ? Math.min(100, Math.round((progress.meetings_held / target_meetings_per_month) * 100))
      : 0;

  const overallPercent = Math.round((contactsPercent + meetingsPercent) / 2);

  const statusConfig = {
    active: { dot: "bg-blue-500", label: "Active" },
    paused: { dot: "bg-amber-400", label: "Paused" },
    achieved: { dot: "bg-green-500", label: "Achieved" },
  };
  const status = statusConfig[goal.status];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span
                className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", status.dot)}
              />
              {status.label}
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-gray-400">
              {GOAL_TYPE_LABELS[goal.goal_type] ?? goal.goal_type}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800 leading-snug">
            {goal.description}
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            Overall progress
          </span>
          <span className="text-xs font-bold text-gray-800">
            {overallPercent}%
          </span>
        </div>
        <ProgressBar
          percent={overallPercent}
          colorClass={
            overallPercent >= 100
              ? "bg-green-500"
              : overallPercent >= 60
              ? "bg-blue-500"
              : "bg-amber-500"
          }
        />
      </div>

      {/* Breakdown metrics */}
      <div className="space-y-3">
        <MetricRow
          label="Contacts found"
          current={progress.contacts_found}
          target={target_contacts_per_month}
          percent={contactsPercent}
        />
        <MetricRow
          label="Meetings held"
          current={progress.meetings_held}
          target={target_meetings_per_month}
          percent={meetingsPercent}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Stats + target companies */}
      <div className="flex items-center gap-4">
        <StatPill
          label="Messages sent"
          value={progress.messages_sent}
        />
        <StatPill
          label="Responses"
          value={progress.responses_received}
        />
        {goal.target_companies.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1 justify-end">
            {goal.target_companies.slice(0, 3).map((co) => (
              <span
                key={co}
                className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-slate-600 font-medium"
              >
                {co}
              </span>
            ))}
            {goal.target_companies.length > 3 && (
              <span className="text-[10px] text-gray-400 self-center">
                +{goal.target_companies.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  current,
  target,
  percent,
}: {
  label: string;
  current: number;
  target: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span>
          <span className="font-semibold text-gray-800">{current}</span>
          <span className="text-gray-400"> / {target} /mo</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full progress-fill"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-bold text-gray-900 leading-none">
        {value}
      </span>
      <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}
