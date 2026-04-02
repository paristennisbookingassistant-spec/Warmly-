"use client";

import { useState } from "react";
import type { Contact, Artifact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ArtifactCard from "@/components/chat/ArtifactCard";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ContactDetailProps {
  contact: Contact;
  artifacts: Artifact[];
  onOpenSession?: (contact: Contact) => void;
}

const STAGE_ORDER = [
  "discovered",
  "contacted",
  "connected",
  "met",
  "ongoing",
] as const;

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  contacted: "Contacted",
  connected: "Connected",
  met: "Met",
  ongoing: "Ongoing",
};

const TYPE_LABELS: Record<string, string> = {
  connection_note: "Connection Notes",
  outreach_draft: "Outreach Drafts",
  meeting_prep: "Meeting Prep",
  meeting_notes: "Meeting Notes",
  action_plan: "Action Plans",
  follow_up_draft: "Follow-up Drafts",
};

const TIER_CONFIG: Record<
  number,
  { label: string; bg: string; text: string; border: string }
> = {
  1: {
    label: "Tier A",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  2: {
    label: "Tier B",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  3: {
    label: "Tier C",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

function groupArtifactsByType(artifacts: Artifact[]) {
  return artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {});
}

function ScoreBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ContactDetail({
  contact,
  artifacts,
  onOpenSession,
}: ContactDetailProps) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  const groupedArtifacts = groupArtifactsByType(artifacts);
  const tier = contact.tier;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;
  const currentStageIdx = STAGE_ORDER.indexOf(
    contact.status as (typeof STAGE_ORDER)[number]
  );

  function handleNotesBlur() {
    // TODO: PATCH /api/contacts/:id with updated notes
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8 animate-fade-in">
      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tier color bar */}
        {tier && (
          <div
            className={cn(
              "h-1",
              tier === 1 && "bg-emerald-400",
              tier === 2 && "bg-blue-400",
              tier === 3 && "bg-amber-400"
            )}
          />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar name={contact.name} size="xl" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                  {contact.name}
                </h1>
                {(contact.current_title || contact.company) && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {[contact.current_title, contact.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                )}
                {contact.location && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                    {contact.location}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="default">{STAGE_LABELS[contact.status]}</Badge>
                  {tierCfg && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        tierCfg.bg,
                        tierCfg.text,
                        tierCfg.border
                      )}
                    >
                      {tierCfg.label}
                    </span>
                  )}
                  {contact.relevance_score !== null && (
                    <span className="text-xs font-mono font-bold text-gray-500">
                      Score {Math.round(contact.relevance_score * 10)}/100
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={() => onOpenSession?.(contact)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20"
              >
                Open chat
              </button>
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Coaching insights */}
          {(contact.recommendation_reason || contact.suggested_hook) && (
            <div className="mt-5 grid gap-3">
              {contact.recommendation_reason && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    Why this contact matters
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {contact.recommendation_reason}
                  </p>
                </div>
              )}
              {contact.suggested_hook && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    Suggested outreach hook
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {contact.suggested_hook}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scoring breakdown */}
      {contact.scoring_breakdown && contact.relevance_score !== null && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Relevance Score
            </h2>
            <span className="text-3xl font-bold text-gray-900 font-mono">
              {Math.round(contact.relevance_score * 10)}
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(contact.scoring_breakdown).map(([key, value]) => (
              <ScoreBar
                key={key}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                value={value as number}
              />
            ))}
          </div>
        </div>
      )}

      {/* Relationship timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          Relationship Progress
        </h2>
        <div className="relative flex items-center justify-between">
          {STAGE_ORDER.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isActive = idx === currentStageIdx;
            return (
              <div
                key={stage}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Connector line */}
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-3 left-1/2 w-full h-0.5",
                      isCompleted ? "bg-blue-400" : "bg-slate-100"
                    )}
                  />
                )}
                {/* Dot */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white",
                    isActive
                      ? "border-blue-500 bg-blue-500"
                      : isCompleted
                      ? "border-blue-400 bg-blue-400"
                      : "border-slate-200 bg-white"
                  )}
                >
                  {(isCompleted || isActive) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1.5 font-medium",
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                      ? "text-gray-500"
                      : "text-gray-300"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Added {formatRelativeTime(contact.discovered_at)}
          {contact.last_interaction_at &&
            ` · Last interaction ${formatRelativeTime(contact.last_interaction_at)}`}
        </p>
      </div>

      {/* Artifacts */}
      {Object.keys(groupedArtifacts).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            Artifacts ({artifacts.length})
          </h2>
          <div className="space-y-5">
            {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
              <div key={type}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  {TYPE_LABELS[type] ?? type}
                </p>
                <div className="space-y-2">
                  {typeArtifacts.map((artifact) => (
                    <ArtifactCard key={artifact.id} artifact={artifact} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">My Notes</h2>
          {noteSaved && (
            <span className="text-xs text-green-600 font-medium animate-fade-in">
              Saved
            </span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add your personal notes about this contact..."
          rows={4}
          className="w-full text-sm text-gray-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Notes auto-save when you click away
        </p>
      </div>
    </div>
  );
}
