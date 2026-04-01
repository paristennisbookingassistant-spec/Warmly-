"use client";

import type { ConversationMessage } from "@/types/database";
import type { Artifact } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import ArtifactCard from "./ArtifactCard";

interface MessageBubbleProps {
  message: ConversationMessage;
  /** Artifacts created by this message — shown as inline cards below the text */
  artifacts?: Artifact[];
}

export default function MessageBubble({ message, artifacts = [] }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message text */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-blue-500 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatRelativeTime(message.created_at)}
        </span>

        {/* Artifact cards inline below the message */}
        {artifacts.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
