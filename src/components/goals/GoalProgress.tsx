"use client";

import type { NetworkingGoal } from "@/types/database";

interface GoalProgressProps {
  goals: NetworkingGoal[];
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-500">No active goals. Create a goal in the chat to get started.</p>
      </div>
    );
  }

  // Aggregate totals across all active goals
  const totals = goals
    .filter((g) => g.status === "active")
    .reduce(
      (acc, g) => ({
        contacts: acc.contacts + g.progress.contacts_found,
        messages: acc.messages + g.progress.messages_sent,
        meetings: acc.meetings + g.progress.meetings_held,
        responses: acc.responses + g.progress.responses_received,
      }),
      { contacts: 0, messages: 0, meetings: 0, responses: 0 }
    );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard label="Contacts found" value={totals.contacts} icon="users" />
      <SummaryCard label="Messages sent" value={totals.messages} icon="mail" />
      <SummaryCard label="Meetings held" value={totals.meetings} icon="calendar" />
      <SummaryCard label="Responses received" value={totals.responses} icon="reply" />
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const icons: Record<string, string> = {
    users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    reply: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
