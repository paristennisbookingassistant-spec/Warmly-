"use client";

import { useState } from "react";
import { useGoals } from "@/hooks/useGoals";
import GoalCard from "@/components/goals/GoalCard";
import GoalProgress from "@/components/goals/GoalProgress";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

interface NewGoalForm {
  description: string;
  goal_type: string;
  target_contacts_per_month: string;
  target_meetings_per_month: string;
  target_companies: string;
}

export default function GoalsPage() {
  const { goals, isLoading, error } = useGoals();
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState<NewGoalForm>({
    description: "",
    goal_type: "job_search",
    target_contacts_per_month: "10",
    target_meetings_per_month: "4",
    target_companies: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          goal_type: form.goal_type,
          target_contacts_per_month: parseInt(form.target_contacts_per_month) || 10,
          target_meetings_per_month: parseInt(form.target_meetings_per_month) || 4,
          target_companies: form.target_companies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          status: "active",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error?.message ?? "Failed to create goal.");
      } else {
        setShowNewModal(false);
        setForm({
          description: "",
          goal_type: "job_search",
          target_contacts_per_month: "10",
          target_meetings_per_month: "4",
          target_companies: "",
        });
        // Re-fetch will happen on next render cycle
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Goals
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track your networking progress against your targets
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowNewModal(true)}
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            New Goal
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {error ? (
          <ErrorState message={error} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Stats overview */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Overview
              </h2>
              <GoalProgress goals={goals} />
            </section>

            {/* Goal list */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Active goals
              </h2>
              {goals.length === 0 ? (
                <GoalsEmptyState onCreateGoal={() => setShowNewModal(true)} />
              ) : (
                <div className="space-y-4">
                  {goals
                    .filter((g) => g.status === "active")
                    .map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  {goals.filter((g) => g.status === "achieved").length > 0 && (
                    <>
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-4">
                        Achieved
                      </h2>
                      {goals
                        .filter((g) => g.status === "achieved")
                        .map((goal) => (
                          <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* New Goal Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => {
          setShowNewModal(false);
          setFormError(null);
        }}
        title="New Networking Goal"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Goal description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. Get 5 VC intros for my Series A fundraise"
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Goal type
            </label>
            <select
              value={form.goal_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, goal_type: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="job_search">Job Search</option>
              <option value="industry_exploration">Industry Exploration</option>
              <option value="relationship_building">
                Relationship Building
              </option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contacts / month"
              type="number"
              value={form.target_contacts_per_month}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  target_contacts_per_month: e.target.value,
                }))
              }
              min="1"
              max="100"
            />
            <Input
              label="Meetings / month"
              type="number"
              value={form.target_meetings_per_month}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  target_meetings_per_month: e.target.value,
                }))
              }
              min="1"
              max="50"
            />
          </div>

          <Input
            label="Target companies (comma-separated)"
            value={form.target_companies}
            onChange={(e) =>
              setForm((f) => ({ ...f, target_companies: e.target.value }))
            }
            placeholder="Sequoia, Andreessen Horowitz, Accel"
            helperText="Optional — helps the agent prioritize contacts"
          />

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowNewModal(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isSubmitting}
              disabled={!form.description.trim()}
            >
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="block" className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} variant="block" className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-800">
        Failed to load goals
      </h3>
      <p className="text-xs text-gray-500 mt-1">{message}</p>
    </div>
  );
}

function GoalsEmptyState({ onCreateGoal }: { onCreateGoal: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-7 h-7 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900">
        Set your first networking goal
      </h3>
      <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
        Goals help your AI coach prioritize contacts and track the right metrics for your career stage.
      </p>
      <Button
        variant="primary"
        className="mt-6"
        onClick={onCreateGoal}
      >
        Create a goal
      </Button>
    </div>
  );
}
