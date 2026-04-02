"use client";

import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  quickActions?: Array<{ label: string; prompt: string }>;
}

const DEFAULT_QUICK_ACTIONS = [
  {
    label: "Find contacts",
    prompt: "Help me find relevant contacts for my networking goals.",
  },
  { label: "Draft message", prompt: "Draft an outreach message for " },
  {
    label: "Prepare for meeting",
    prompt: "Help me prepare for my upcoming meeting with ",
  },
  { label: "Action plan", prompt: "What should I do next with " },
];

export default function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Ask your networking coach...",
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
    // Trigger resize after state update
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    });
  };

  const isEmpty = !value.trim();

  return (
    <div className="space-y-2">
      {/* Quick action chips */}
      <div className="flex flex-wrap gap-1.5">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input wrapper */}
      <div className="relative flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-150">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-50 leading-relaxed min-h-[22px] max-h-[160px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isEmpty || isLoading}
          aria-label="Send message"
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm disabled:bg-slate-300 disabled:shadow-none"
        >
          {isLoading ? (
            <svg
              className="animate-spin w-4 h-4 text-white"
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
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-[10px] text-slate-400 text-center select-none">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
