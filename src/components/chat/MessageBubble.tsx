"use client";

import type { ConversationMessage, Artifact } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import ArtifactCard from "./ArtifactCard";

interface MessageBubbleProps {
  message: ConversationMessage;
  artifacts?: Artifact[];
  onOpenArtifact?: (artifact: Artifact) => void;
}

export default function MessageBubble({
  message,
  artifacts = [],
  onOpenArtifact,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 animate-slide-up ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Agent avatar — italic serif "c" mark */}
      {!isUser && (
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
      )}

      <div
        className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Message bubble */}
        <div
          className="px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed"
          style={
            isUser
              ? {
                  background: "var(--ink)",
                  color: "var(--bg)",
                  borderBottomRightRadius: 6,
                }
              : {
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--line-soft)",
                  boxShadow: "var(--shadow-1)",
                  borderBottomLeftRadius: 6,
                }
          }
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp — visible on hover */}
        <span className="text-[10px] text-ink-4 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {formatRelativeTime(message.created_at)}
        </span>

        {/* Inline artifact cards */}
        {artifacts.length > 0 && (
          <div className="flex flex-col gap-2 w-full mt-1">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onOpen={onOpenArtifact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
