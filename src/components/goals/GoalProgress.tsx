"use client";

import type { NetworkingGoal } from "@/types/database";

interface GoalProgressProps {
  goals: NetworkingGoal[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  iconPath: string;
  iconBg: string;
  iconColor: string;
  subtext?: string;
}

function StatCard({
  label,
  value,
  iconPath,
  iconBg,
  iconColor,
  subtext,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconPath}
          />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  const active = goals.filter((g) => g.status === "active");

  const totals = active.reduce(
    (acc, g) => ({
      contacts: acc.contacts + g.progress.contacts_found,
      messages: acc.messages + g.progress.messages_sent,
      meetings: acc.meetings + g.progress.meetings_held,
      responses: acc.responses + g.progress.responses_received,
    }),
    { contacts: 0, messages: 0, meetings: 0, responses: 0 }
  );

  const responseRate =
    totals.messages > 0
      ? Math.round((totals.responses / totals.messages) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Contacts found"
        value={totals.contacts}
        iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        subtext="this month"
      />
      <StatCard
        label="Messages sent"
        value={totals.messages}
        iconPath="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        subtext={`${responseRate}% response rate`}
      />
      <StatCard
        label="Meetings held"
        value={totals.meetings}
        iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        iconBg="bg-green-50"
        iconColor="text-green-600"
        subtext="conversations"
      />
      <StatCard
        label="Active goals"
        value={active.length}
        iconPath="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        subtext={`${goals.filter((g) => g.status === "achieved").length} achieved`}
      />
    </div>
  );
}
