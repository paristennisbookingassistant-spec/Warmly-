"use client";

import type { Contact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { formatRelativeTime, formatScore, getStatusLabel, getTierColor } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
  onOpenSession?: (contact: Contact) => void;
  onViewDetail?: (contact: Contact) => void;
}

export default function ContactCard({ contact, onOpenSession, onViewDetail }: ContactCardProps) {
  const tierColorClass = getTierColor(contact.tier);

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer p-5 flex flex-col gap-4"
      onClick={() => onViewDetail?.(contact)}
    >
      {/* Header: avatar + name + tier score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar name={contact.name} size="md" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{contact.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {[contact.current_role, contact.company].filter(Boolean).join(" at ")}
            </p>
            {contact.location && (
              <p className="text-xs text-gray-400 mt-0.5">{contact.location}</p>
            )}
          </div>
        </div>

        {contact.relevance_score !== null && (
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColorClass}`}>
              {formatScore(contact.relevance_score)}
            </span>
            {contact.tier && (
              <span className="text-xs text-gray-400">Tier {contact.tier}</span>
            )}
          </div>
        )}
      </div>

      {/* Recommendation reason */}
      {contact.recommendation_reason && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
          {contact.recommendation_reason}
        </p>
      )}

      {/* Footer: status + last interaction + open session */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default">{getStatusLabel(contact.status)}</Badge>
          {contact.last_interaction_at && (
            <span className="text-xs text-gray-400">
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSession?.(contact);
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Open session
        </button>
      </div>
    </div>
  );
}
