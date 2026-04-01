"use client";

import { useChat } from "@/hooks/useChat";
import SessionSidebar from "@/components/chat/SessionSidebar";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { MessageSkeleton } from "@/components/ui/Skeleton";

export default function ChatPage() {
  const {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    selectConversation,
    createConversation,
    sendMessage,
    artifactsForMessage,
  } = useChat();

  return (
    <div className="flex h-full">
      {/* Session sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/10">
        <SessionSidebar
          conversations={conversations}
          activeConversationId={activeConversation?.id ?? null}
          onSelectConversation={selectConversation}
          onNewConversation={createConversation}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">{activeConversation.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {activeConversation.type.replace(/_/g, " ")}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {isLoadingMessages ? (
                <>
                  <MessageSkeleton />
                  <MessageSkeleton />
                  <MessageSkeleton />
                </>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    artifacts={artifactsForMessage(msg.id)}
                  />
                ))
              )}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <ChatInput onSend={sendMessage} isLoading={isSending} />
            </div>
          </>
        ) : (
          <EmptyState onNewConversation={createConversation} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNewConversation }: { onNewConversation: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Start a conversation</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-sm">
        Ask your networking coach to find contacts, draft messages, or prepare for meetings.
      </p>
      <button
        onClick={onNewConversation}
        className="mt-6 px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        New conversation
      </button>
    </div>
  );
}
