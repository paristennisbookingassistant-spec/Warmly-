"use client";

import type { ConversationMessage, Artifact } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import ArtifactCard from "./ArtifactCard";

interface MessageBubbleProps {
  message: ConversationMessage;
  artifacts?: Artifact[];
}

export default function MessageBubble({
  message,
  artifacts = [],
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 animate-slide-up ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Agent avatar */}
      {!isUser && (
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
      )}

      <div
        className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Message bubble */}
        <div
          className={
            isUser
              ? "px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm"
              : "px-4 py-2.5 bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm text-sm leading-relaxed text-gray-800"
          }
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp — visible on hover */}
        <span className="text-[10px] text-gray-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {formatRelativeTime(message.created_at)}
        </span>

        {/* Inline artifact cards */}
        {artifacts.length > 0 && (
          <div className="flex flex-col gap-2 w-full mt-1">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
