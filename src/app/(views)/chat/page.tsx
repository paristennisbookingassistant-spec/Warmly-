"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import SessionSidebar from "@/components/chat/SessionSidebar";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { MessageSkeleton } from "@/components/ui/Skeleton";

const EXAMPLE_OPENERS = [
  { label: "Help me prepare for a meeting", prompt: "Help me prepare for my upcoming meeting with " },
  { label: "Draft an outreach message", prompt: "Draft an outreach message for a contact at " },
  { label: "Score my contacts", prompt: "Score and prioritize my current contacts based on my goals." },
  { label: "Find new contacts", prompt: "Help me discover relevant contacts for my networking goals." },
];

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    createError,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    artifactsForMessage,
  } = useChat();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const searchParams = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const contactHandled = useRef(false);

  // Handle ?contact=ID param — open/create a session for this contact
  useEffect(() => {
    const contactId = searchParams.get("contact");
    if (contactId && !isLoadingConversations && !contactHandled.current) {
      contactHandled.current = true;
      createConversation(contactId);
    }
  }, [searchParams, isLoadingConversations, createConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  return (
    <div className="flex h-full bg-white">
      {/* Session sidebar */}
      <div className="w-64 flex-shrink-0">
        <SessionSidebar
          conversations={conversations}
          activeConversationId={activeConversation?.id ?? null}
          onSelectConversation={selectConversation}
          onNewConversation={() => createConversation()}
          onDeleteConversation={deleteConversation}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-slate-100">
        {activeConversation ? (
          <>
            {/* Conversation header */}
            <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  {isEditingTitle ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => {
                        if (editTitle.trim() && editTitle !== activeConversation.title) {
                          renameConversation(activeConversation.id, editTitle.trim());
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
                        if (e.key === "Escape") { setIsEditingTitle(false); }
                      }}
                      className="font-semibold text-gray-900 text-sm bg-transparent border-b border-blue-400 outline-none w-full"
                    />
                  ) : (
                    <h2
                      className="font-semibold text-gray-900 text-sm cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => {
                        setEditTitle(activeConversation.title);
                        setIsEditingTitle(true);
                      }}
                      title="Click to rename"
                    >
                      {activeConversation.title}
                    </h2>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {activeConversation.type === "contact_session"
                      ? "Contact session"
                      : "General chat"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      activeConversation.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeConversation.status === "active"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    {activeConversation.status === "active" ? "Active" : "Archived"}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gray-50/30">
              {isLoadingMessages ? (
                <>
                  <MessageSkeleton />
                  <MessageSkeleton isUser />
                  <MessageSkeleton />
                  <MessageSkeleton isUser />
                  <MessageSkeleton />
                </>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Ready to help
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Type a message or choose a quick action below
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    artifacts={artifactsForMessage(msg.id)}
                  />
                ))
              )}

              {/* Agent typing indicator */}
              {isSending && (
                <div className="flex gap-3 animate-slide-up">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span
                        className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Invisible scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
              <ChatInput onSend={sendMessage} isLoading={isSending} />
            </div>
          </>
        ) : (
          <EmptyState onNewConversation={createConversation} error={createError} />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onNewConversation,
  error,
}: {
  onNewConversation: () => void;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-gray-50/30">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
        Your AI Networking Coach
      </h2>
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        I help you find the right contacts, craft strategic outreach, prepare
        for meetings, and maintain relationships.
      </p>

      {/* Example openers */}
      <div className="grid grid-cols-2 gap-2 mt-8 max-w-md w-full">
        {EXAMPLE_OPENERS.map((opener) => (
          <button
            key={opener.label}
            onClick={() => {
              onNewConversation();
            }}
            className="text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150 shadow-sm group"
          >
            <p className="text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
              {opener.label}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={onNewConversation}
        className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 shadow-sm shadow-blue-500/25"
      >
        New conversation
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
