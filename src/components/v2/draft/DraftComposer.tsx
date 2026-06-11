"use client";

/**
 * components/v2/draft/DraftComposer.tsx
 * Left pane: the editable draft textarea with shimmer overlay.
 */

import { useRef } from "react";
import { Avatar } from "@/components/v2/primitives";
import type { Contact } from "@/types/database";

interface DraftComposerProps {
  contact: Contact;
  message: string;
  shimmering: boolean;
  swapKey: number;
  onChange: (value: string) => void;
}

export function DraftComposer({
  contact,
  message,
  shimmering,
  swapKey,
  onChange,
}: DraftComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const avatarSrc = contact.photo_url ?? contact.avatar_url ?? null;

  return (
    <div
      className="bg-white border rounded-2xl overflow-hidden flex flex-col min-h-0"
      style={{ borderColor: "#e5d8be" }}
    >
      {/* To header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "#e5d8be" }}
      >
        <Avatar src={avatarSrc} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-ink-3">To</div>
          <div className="text-[13.5px] font-medium text-ink truncate">
            {contact.name}
            {contact.current_title
              ? `, ${contact.current_title}${contact.company ? ` · ${contact.company}` : ""}`
              : ""}
          </div>
        </div>
      </div>

      {/* Textarea area */}
      <div className="relative px-7 py-6 flex-1 flex flex-col min-h-0">
        {shimmering && (
          <div className="absolute inset-x-7 top-6 bottom-6 rounded-lg shimmering pointer-events-none" />
        )}
        <textarea
          key={swapKey}
          ref={taRef}
          value={message}
          onChange={(e) => onChange(e.target.value)}
          className="w-full flex-1 bg-transparent border-0 resize-none text-[15px] text-ink-2 leading-[1.75] focus:outline-none"
          style={{
            fontFamily: "var(--font-ui)",
            whiteSpace: "pre-wrap",
            opacity: shimmering ? 0 : 1,
            transition: "opacity 200ms ease",
            minHeight: 240,
          }}
          placeholder="Your draft will appear here…"
          disabled={shimmering}
        />
      </div>
    </div>
  );
}
