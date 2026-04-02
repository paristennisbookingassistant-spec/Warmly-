"use client";

import { useState } from "react";
import type { Conversation } from "@/types/database";
import { formatRelativeTime, cn } from "@/lib/utils";
import { SessionItemSkeleton } from "@/components/ui/Skeleton";

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
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const general = filtered.filter((c) => c.type === "general");
  const contactSessions = filtered.filter((c) => c.type === "contact_session");

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-100">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Conversations
        </span>
        <button
          onClick={onNewConversation}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          title="New conversation"
          aria-label="New conversation"
        >
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
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4 sidebar-scroll">
        {isLoading ? (
          <div className="space-y-1 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <SessionItemSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-600">
              {search ? "No results" : "No conversations yet"}
            </p>
            {!search && (
              <button
                onClick={onNewConversation}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Start one
              </button>
            )}
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
      <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-0.5">
        {conversations.map((conv) => {
          const isActive = activeId === conv.id;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-blue-50 border-l-2 border-blue-500 pl-2.5"
                  : "hover:bg-slate-100 border-l-2 border-transparent"
              )}
            >
              <div className="flex items-start gap-2.5">
                {conv.type === "general" ? (
                  <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[9px] font-semibold"
                    style={{ background: "#3b82f6" }}
                  >
                    {conv.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate leading-tight",
                      isActive ? "text-blue-700" : "text-slate-700"
                    )}
                  >
                    {conv.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatRelativeTime(conv.updated_at)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
