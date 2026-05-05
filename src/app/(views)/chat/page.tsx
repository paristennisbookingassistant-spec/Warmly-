"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Artifact } from "@/types/database";
import { useChat } from "@/hooks/useChat";
import SessionSidebar from "@/components/chat/SessionSidebar";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ArtifactDrawer from "@/components/chat/ArtifactDrawer";
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
    updateArtifact,
  } = useChat();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);

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
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
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
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            {/* Conversation header */}
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{
                background: "var(--bg)",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
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
                      className="font-display italic text-[22px] leading-tight bg-transparent outline-none w-full"
                      style={{
                        color: "var(--ink)",
                        borderBottom: "1px solid var(--accent)",
                      }}
                    />
                  ) : (
                    <h2
                      className="font-display italic text-[22px] leading-tight cursor-pointer transition-colors truncate"
                      style={{ color: "var(--ink)" }}
                      onClick={() => {
                        setEditTitle(activeConversation.title);
                        setIsEditingTitle(true);
                      }}
                      title="Click to rename"
                    >
                      {activeConversation.title}
                    </h2>
                  )}
                  <p
                    className="text-[11px] uppercase tracking-[0.12em] font-medium mt-1"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {activeConversation.type === "contact_session"
                      ? "Contact session"
                      : "Strategy thread"}
                  </p>
                </div>
                {activeConversation.status !== "active" && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-wider font-medium flex-shrink-0"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink-3)",
                    }}
                  >
                    Archived
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
              style={{ background: "var(--bg)" }}
            >
              {isLoadingMessages ? (
                <>
                  <MessageSkeleton />
                  <MessageSkeleton isUser />
                  <MessageSkeleton />
                  <MessageSkeleton isUser />
                  <MessageSkeleton />
                </>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 max-w-md mx-auto">
                  <p
                    className="font-display italic text-[26px] leading-tight tracking-tight"
                    style={{ color: "var(--ink-2)" }}
                  >
                    What&rsquo;s on your mind?
                  </p>
                  <p
                    className="text-[13px] mt-3 leading-relaxed"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Tell me about a person you want to reach, a meeting coming
                    up, or a relationship you want to keep alive — I&rsquo;ll
                    take it from there.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    artifacts={artifactsForMessage(msg.id)}
                    onOpenArtifact={setOpenArtifact}
                  />
                ))
              )}

              {/* Agent typing indicator */}
              {isSending && (
                <div className="flex gap-3 animate-slide-up">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{
                      background: "var(--ink)",
                      color: "var(--bg)",
                    }}
                  >
                    <span className="font-display italic text-[15px] leading-none -mt-0.5">
                      c
                    </span>
                  </div>
                  <div
                    className="rounded-2xl rounded-bl-sm px-4 py-3"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line-soft)",
                      boxShadow: "var(--shadow-1)",
                    }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "var(--ink-4)",
                          animationDelay: "0ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "var(--ink-4)",
                          animationDelay: "150ms",
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "var(--ink-4)",
                          animationDelay: "300ms",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Invisible scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{
                background: "var(--bg)",
                borderTop: "1px solid var(--line-soft)",
              }}
            >
              <ChatInput onSend={sendMessage} isLoading={isSending} />
            </div>
          </>
        ) : (
          <EmptyState onNewConversation={createConversation} error={createError} />
        )}
      </div>

      {/* Artifact drawer — opens when user clicks "Open in full" on an ArtifactCard */}
      <ArtifactDrawer
        artifact={openArtifact}
        onClose={() => setOpenArtifact(null)}
        onUpdated={(updated) => {
          updateArtifact(updated);
          setOpenArtifact(updated);
        }}
      />
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
    <div
      className="flex flex-col items-center justify-center h-full text-center px-8"
      style={{ background: "var(--bg)" }}
    >
      <p
        className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-3"
        style={{ color: "var(--ink-3)" }}
      >
        Your networking coach
      </p>
      <h2
        className="font-display italic text-[40px] leading-[1.05] tracking-tight max-w-md"
        style={{ color: "var(--ink)" }}
      >
        Tell me who&rsquo;s on your mind.
      </h2>
      <p
        className="text-[14px] mt-4 max-w-md leading-relaxed"
        style={{ color: "var(--ink-3)" }}
      >
        I&rsquo;ll help you find the right people, draft outreach that sounds
        like you, prepare for meetings, and keep the conversation going long
        after.
      </p>

      {/* Example openers */}
      <div className="grid grid-cols-2 gap-2 mt-10 max-w-md w-full">
        {EXAMPLE_OPENERS.map((opener) => (
          <button
            key={opener.label}
            onClick={onNewConversation}
            className="text-left px-4 py-3 rounded-lg transition-colors duration-150"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink-2)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            <p className="text-[12.5px] font-medium leading-snug">
              {opener.label}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={onNewConversation}
        className="mt-8 px-5 py-2 rounded-full text-[12.5px] font-medium transition-colors text-bg"
        style={{ background: "var(--ink)" }}
      >
        Start a new thread
      </button>

      {error && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
