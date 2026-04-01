"use client";

import type { Conversation } from "@/types/database";
import { formatRelativeTime, cn } from "@/lib/utils";

interface SessionSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isLoading?: boolean;
}

export default function SessionSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading = false,
}: SessionSidebarProps) {
  const general = conversations.filter((c) => c.type === "general");
  const contactSessions = conversations.filter((c) => c.type === "contact_session");

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/10">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {isLoading ? (
          <div className="px-2 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {general.length > 0 && (
              <SessionGroup
                label="General"
                conversations={general}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
              />
            )}
            {contactSessions.length > 0 && (
              <SessionGroup
                label="Contacts"
                conversations={contactSessions}
                activeId={activeConversationId}
                onSelect={onSelectConversation}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SessionGroup({
  label,
  conversations,
  activeId,
  onSelect,
}: {
  label: string;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="px-3 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-0.5">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
              activeId === conv.id
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <p className="truncate font-medium">{conv.title}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {formatRelativeTime(conv.updated_at)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
