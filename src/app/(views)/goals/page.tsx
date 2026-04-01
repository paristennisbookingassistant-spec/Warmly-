"use client";

import { useGoals } from "@/hooks/useGoals";
import GoalCard from "@/components/goals/GoalCard";
import GoalProgress from "@/components/goals/GoalProgress";
import { ContactCardSkeleton } from "@/components/ui/Skeleton";

export default function GoalsPage() {
  const { goals, isLoading } = useGoals();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Goals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track your networking progress against your targets.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ContactCardSkeleton />
            <ContactCardSkeleton />
          </div>
        ) : (
          <>
            {/* Aggregate progress */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Overview
              </h2>
              <GoalProgress goals={goals} />
            </section>

            {/* Individual goals */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Active goals
              </h2>
              {goals.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <p className="text-sm text-gray-500">
                    No goals yet. Tell the agent your networking goal in the chat to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
