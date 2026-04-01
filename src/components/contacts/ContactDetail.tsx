"use client";

import type { Contact, Artifact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ArtifactCard from "@/components/chat/ArtifactCard";
import { formatRelativeTime, formatScore, getStatusLabel, getTierColor } from "@/lib/utils";

interface ContactDetailProps {
  contact: Contact;
  artifacts: Artifact[];
  onOpenSession?: (contact: Contact) => void;
}

/** Groups artifacts by type for the profile view */
function groupArtifactsByType(artifacts: Artifact[]) {
  return artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {});
}

const TYPE_LABELS: Record<string, string> = {
  connection_note: "Connection Notes",
  outreach_draft: "Outreach Drafts",
  meeting_prep: "Meeting Prep",
  meeting_notes: "Meeting Notes",
  action_plan: "Action Plans",
  follow_up_draft: "Follow-up Drafts",
};

export default function ContactDetail({
  contact,
  artifacts,
  onOpenSession,
}: ContactDetailProps) {
  const tierColor = getTierColor(contact.tier);
  const groupedArtifacts = groupArtifactsByType(artifacts);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={contact.name} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
              <p className="text-gray-600 mt-0.5">
                {[contact.current_role, contact.company].filter(Boolean).join(" at ")}
              </p>
              {contact.location && (
                <p className="text-sm text-gray-400 mt-0.5">{contact.location}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="default">{getStatusLabel(contact.status)}</Badge>
                {contact.tier && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColor}`}>
                    Tier {contact.tier} · {formatScore(contact.relevance_score)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenSession?.(contact)}
            className="flex-shrink-0 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Open session
          </button>
        </div>

        {contact.recommendation_reason && (
          <p className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-lg px-4 py-3">
            {contact.recommendation_reason}
          </p>
        )}

        {contact.suggested_hook && (
          <div className="mt-3 bg-amber-50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Suggested hook</p>
            <p className="text-sm text-amber-800">{contact.suggested_hook}</p>
          </div>
        )}

        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            View LinkedIn profile
          </a>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Relationship Timeline</h2>
        <div className="flex items-center gap-0">
          {["discovered", "contacted", "connected", "met", "ongoing"].map((stage, idx, arr) => {
            const stages = ["discovered", "contacted", "connected", "met", "ongoing"];
            const currentIdx = stages.indexOf(contact.status);
            const isActive = idx <= currentIdx;
            return (
              <div key={stage} className="flex items-center flex-1">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isActive ? "bg-blue-500" : "bg-gray-200"}`} />
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 ${idx < currentIdx ? "bg-blue-500" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {["Discovered", "Contacted", "Connected", "Met", "Ongoing"].map((label) => (
            <span key={label} className="text-xs text-gray-400">{label}</span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Discovered {formatRelativeTime(contact.discovered_at)}
          {contact.last_interaction_at &&
            ` · Last interaction ${formatRelativeTime(contact.last_interaction_at)}`}
        </p>
      </div>

      {/* Artifacts by type */}
      {Object.keys(groupedArtifacts).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Artifacts</h2>
          <div className="space-y-6">
            {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
              <div key={type}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {TYPE_LABELS[type] ?? type}
                </h3>
                <div className="space-y-3">
                  {typeArtifacts.map((artifact) => (
                    <ArtifactCard key={artifact.id} artifact={artifact} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User notes */}
      {contact.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">My Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}
