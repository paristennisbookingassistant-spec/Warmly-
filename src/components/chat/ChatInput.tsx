"use client";

/**
 * ChatInput — composer for the chat view.
 *
 * Quick-action chips above the textarea match the artifact-trigger keywords
 * server-side (see ARTIFACT_INTRO in messages/route.ts), so each chip
 * predictably opens the corresponding artifact in the drawer.
 *
 * Reference: docs/design/v2/project/src/chat.jsx (composer block, lines 92-112)
 */

import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  /** Override the default chips. Each chip seeds the textarea with `prompt`. */
  quickActions?: Array<{ label: string; prompt: string; icon?: ChipIconName }>;
}

type ChipIconName = "sparkle" | "paperclip" | "bolt" | "send";

const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function ChipIcon({ name, size = 12 }: { name: ChipIconName; size?: number }) {
  const s = { ...strokeProps, width: size, height: size };
  switch (name) {
    case "sparkle":
      return (
        <svg {...s}>
          <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" />
        </svg>
      );
    case "paperclip":
      return (
        <svg {...s}>
          <path d="M21 11.5 12 20a5 5 0 1 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...s}>
          <path d="M13 3 4 14h6l-1 7 9-11h-6z" />
        </svg>
      );
    case "send":
      return (
        <svg {...s}>
          <path d="M5 12 20 5l-4 15-4-7z" />
        </svg>
      );
  }
}

const DEFAULT_QUICK_ACTIONS: Array<{
  label: string;
  prompt: string;
  icon: ChipIconName;
}> = [
  {
    label: "Prep a meeting",
    prompt: "Help me prepare for my upcoming meeting with ",
    icon: "sparkle",
  },
  {
    label: "Draft outreach",
    prompt: "Draft an outreach message to ",
    icon: "send",
  },
  {
    label: "Plan next steps",
    prompt: "What are the next steps with ",
    icon: "bolt",
  },
];

export default function ChatInput({
  onSend,
  isLoading = false,
  placeholder,
  quickActions = DEFAULT_QUICK_ACTIONS,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleQuickAction = (prompt: string) => {
    setValue(prompt);
    textareaRef.current?.focus();
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    });
  };

  const isEmpty = !value.trim();

  return (
    <div
      className="rounded-xl px-4 pt-3 pb-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ??
          "Ask your networking coach — draft a message, plan a meeting, or paste a LinkedIn URL…"
        }
        rows={2}
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-[14px] leading-relaxed focus:outline-none disabled:opacity-50 placeholder:text-ink-4"
        style={{
          color: "var(--ink)",
          minHeight: "44px",
          maxHeight: "160px",
        }}
      />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* Quick action chips */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors duration-120 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink-2)",
                boxShadow: "inset 0 0 0 1px var(--line-soft)",
              }}
            >
              {action.icon && <ChipIcon name={action.icon} size={11} />}
              {action.label}
            </button>
          ))}
        </div>

        {/* Hint + send */}
        <span
          className="text-[10.5px] font-mono tabular-nums select-none whitespace-nowrap"
          style={{ color: "var(--ink-4)" }}
        >
          {isLoading ? "Thinking…" : "↵ to send"}
        </span>
        <button
          onClick={handleSend}
          disabled={isEmpty || isLoading}
          aria-label="Send message"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-120 disabled:opacity-40 disabled:cursor-not-allowed text-bg"
          style={{ background: "var(--ink)" }}
        >
          {isLoading ? (
            <svg
              className="animate-spin w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <ChipIcon name="send" size={11} />
          )}
          Send
        </button>
      </div>
    </div>
  );
}
