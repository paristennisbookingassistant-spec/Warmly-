"use client";

/**
 * SessionSidebar — list of conversations on the left of the chat view.
 *
 * Pattern matches docs/design/v2/project/src/chat.jsx (chat__sessions block):
 *   - Group sessions under italic headings (General / Contacts)
 *   - Italic serif "c" mark for general threads, initial-circle for contact sessions
 *   - Active session: accent left-border + accent-soft background (no blue)
 *   - Delete uses inline-confirm pattern (Cancel/Delete buttons replace trash
 *     icon in place — no modal, preserves flow). General threads are
 *     undeletable to prevent accidental loss of the strategic thread.
 */

import { useState } from "react";
import type { Conversation } from "@/types/database";
import { formatRelativeTime, cn } from "@/lib/utils";
import { SessionItemSkeleton } from "@/components/ui/Skeleton";

interface SessionSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

export default function SessionSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
}: SessionSidebarProps) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const general = filtered.filter((c) => c.type === "general");
  const contactSessions = filtered.filter((c) => c.type === "contact_session");

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--bg-sunk)",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h3 className="font-display italic text-[20px] leading-none text-ink tracking-tight">
          Threads
        </h3>
        <button
          onClick={onNewConversation}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors"
          style={{
            color: "var(--ink-3)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
          title="New conversation"
          aria-label="New conversation"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
            style={{ color: "var(--ink-4)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads…"
            className="w-full pl-7 pr-3 py-1.5 text-[12px] rounded-md focus:outline-none transition-colors placeholder:text-ink-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
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
            <p className="text-[12px] text-ink-3">
              {search ? "No matches." : "Nothing yet."}
            </p>
            {!search && (
              <button
                onClick={onNewConversation}
                className="mt-2 text-[12px] text-accent-ink hover:opacity-80 font-medium transition-opacity"
              >
                Start a thread →
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
                confirmDelete={confirmDelete}
                onSelect={onSelectConversation}
                onRequestDelete={setConfirmDelete}
                onDelete={onDeleteConversation}
                undeletable
              />
            )}
            {contactSessions.length > 0 && (
              <SessionGroup
                label="Contacts"
                conversations={contactSessions}
                activeId={activeConversationId}
                confirmDelete={confirmDelete}
                onSelect={onSelectConversation}
                onRequestDelete={setConfirmDelete}
                onDelete={onDeleteConversation}
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
  confirmDelete,
  onSelect,
  onRequestDelete,
  onDelete,
  undeletable = false,
}: {
  label: string;
  conversations: Conversation[];
  activeId: string | null;
  confirmDelete: string | null;
  onSelect: (id: string) => void;
  onRequestDelete: (id: string | null) => void;
  onDelete?: (id: string) => Promise<boolean>;
  undeletable?: boolean;
}) {
  return (
    <div>
      <p className="px-2 py-1 text-[10.5px] uppercase tracking-[0.12em] font-medium text-ink-4">
        {label}
      </p>
      <div className="space-y-0.5">
        {conversations.map((conv) => (
          <SessionItem
            key={conv.id}
            conv={conv}
            isActive={activeId === conv.id}
            isConfirmingDelete={confirmDelete === conv.id}
            onSelect={() => onSelect(conv.id)}
            onRequestDelete={
              undeletable || !onDelete ? null : () => onRequestDelete(conv.id)
            }
            onCancelDelete={() => onRequestDelete(null)}
            onConfirmDelete={
              onDelete
                ? async () => {
                    await onDelete(conv.id);
                    onRequestDelete(null);
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function SessionItem({
  conv,
  isActive,
  isConfirmingDelete,
  onSelect,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  isConfirmingDelete: boolean;
  onSelect: () => void;
  onRequestDelete: (() => void) | null;
  onCancelDelete: () => void;
  onConfirmDelete?: () => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "relative w-full rounded-md transition-colors duration-120 group cursor-pointer",
        isActive ? "" : "hover:bg-surface-2"
      )}
      style={
        isActive
          ? {
              background: "var(--surface)",
              boxShadow:
                "inset 0 0 0 1px var(--line-soft), inset 2px 0 0 var(--accent)",
            }
          : undefined
      }
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Icon: italic "c" for general, initial circle for contacts */}
        {conv.type === "general" ? (
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[14px] leading-none mt-0.5 font-display italic"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            c
          </span>
        ) : (
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold mt-0.5"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
              boxShadow: "inset 0 0 0 1px oklch(0.55 0.10 45 / 0.15)",
            }}
          >
            {conv.title.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p
            className="text-[12.5px] font-medium truncate leading-tight"
            style={{ color: isActive ? "var(--ink)" : "var(--ink-2)" }}
          >
            {conv.title}
          </p>
          <p
            className="text-[10.5px] mt-0.5 leading-tight truncate"
            style={{ color: "var(--ink-4)" }}
          >
            {formatRelativeTime(conv.updated_at)}
          </p>
        </div>

        {/* Delete control — only for sessions that allow it */}
        {onRequestDelete && !isConfirmingDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity flex-shrink-0"
            style={{ color: "var(--ink-4)" }}
            title="Delete thread"
            aria-label={`Delete thread: ${conv.title}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      {/* Inline confirm — replaces the trash icon in place */}
      {isConfirmingDelete && onConfirmDelete && (
        <div
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-1 py-0.5"
          style={{
            background: "var(--surface)",
            boxShadow: "var(--shadow-2)",
            border: "1px solid var(--line)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelDelete();
            }}
            className="px-2 py-0.5 text-[10.5px] rounded transition-colors"
            style={{ color: "var(--ink-3)" }}
            title="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void onConfirmDelete();
            }}
            className="px-2 py-0.5 text-[10.5px] rounded transition-colors font-medium"
            style={{
              background: "var(--bad)",
              color: "var(--bg)",
            }}
            title="Confirm delete"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
