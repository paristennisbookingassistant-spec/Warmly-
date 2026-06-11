"use client";

/**
 * components/v2/draft/RefinePanel.tsx
 * Right pane: chat-style coach for freeform refinement + preset prompts.
 * Calls onSend(text, variantKey?) when user submits.
 */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/v2/icons";
import type { RefineMessage, VariantKey } from "./types";

interface RefinePanelProps {
  messages: RefineMessage[];
  typing: boolean;
  variant: VariantKey;
  historyLen: number;
  totalVariants: number;
  canRevert: boolean;
  onSend: (text: string, preset?: VariantKey) => void;
  onRevert: () => void;
}

const QUICK_PROMPTS: { label: string; preset: VariantKey }[] = [
  { label: "Make it simpler", preset: "shorter" },
  { label: "Add a specific ask", preset: "ask" },
  { label: "More formal register", preset: "formal" },
];

export function RefinePanel({
  messages,
  typing,
  variant,
  historyLen,
  totalVariants,
  canRevert,
  onSend,
  onRevert,
}: RefinePanelProps) {
  const [val, setVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!val.trim()) return;
    onSend(val);
    setVal("");
  };

  const showQuickPrompts = messages.length <= 1 && !typing;

  return (
    <div
      className="bg-white border rounded-2xl flex flex-col min-h-0 overflow-hidden"
      style={{ borderColor: "#e5d8be" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2.5 flex-shrink-0"
        style={{ borderColor: "#ece2d0" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#f3e2cd", color: "#b87a4a" }}
        >
          <Icon.Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink leading-tight">
            Refine with your coach
          </div>
          <div className="text-[10.5px] text-ink-4 flex items-center gap-1.5 mt-0.5 font-mono-tag">
            <span
              className="inline-block w-[5px] h-[5px] rounded-full pulse-dot"
              style={{ background: "#5e8d6a" }}
            />
            v{historyLen} of {totalVariants} ·{" "}
            <span style={{ fontSize: 9.5 }}>{variant}</span>
          </div>
        </div>
        <button
          disabled={!canRevert}
          onClick={onRevert}
          className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Icon.Revert size={11} />
          revert
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-area px-4 py-4 flex flex-col gap-3 min-h-0"
        style={{ minHeight: 120 }}
      >
        {messages.map((m, i) => (
          <RefineMessageBubble key={i} msg={m} />
        ))}
        {typing && <RefineTypingIndicator />}
      </div>

      {/* Quick prompts */}
      {showQuickPrompts && (
        <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div className="font-mono-tag text-ink-4" style={{ fontSize: 9 }}>
            Try
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.preset}
                onClick={() => onSend(p.label, p.preset)}
                className="text-[11.5px] px-2.5 h-7 rounded-full border text-ink-2 hover:opacity-80 transition-opacity text-left"
                style={{ borderColor: "#d9cdb4", background: "#fdfaf3" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={submit}
        className="border-t p-3 flex-shrink-0"
        style={{ borderColor: "#ece2d0" }}
      >
        <div
          className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2"
          style={{ borderColor: "#d9cdb4" }}
        >
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. mention I'm based in Paris"
            className="flex-1 text-[12.5px] text-ink-2 placeholder:text-ink-4 outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={!val.trim()}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              background: val.trim() ? "#b87a4a" : "#ece2d0",
              color: val.trim() ? "#ffffff" : "#8e8170",
            }}
          >
            <Icon.Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}

function RefineMessageBubble({ msg }: { msg: RefineMessage }) {
  if (msg.role === "user") {
    return (
      <div
        className="self-end max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug"
        style={{ background: "#1f1b16", color: "#f4ede0", borderBottomRightRadius: 4 }}
      >
        {msg.text}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[92%] flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#f3e2cd", color: "#b87a4a" }}
      >
        <Icon.Sparkles size={12} />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div
          className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-ink-2"
          style={{
            background: "#fdfaf3",
            borderBottomLeftRadius: 4,
            whiteSpace: "pre-wrap",
            border: "1px solid #ece2d0",
          }}
        >
          {msg.text}
        </div>
        {msg.hint && (
          <div
            className="inline-flex items-center gap-1.5 self-start text-[10.5px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "#f3e2cd", color: "#7a4a25" }}
          >
            <span
              className="inline-block w-[5px] h-[5px] rounded-full"
              style={{ background: "#b87a4a" }}
            />
            {msg.hint.label}
          </div>
        )}
      </div>
    </div>
  );
}

function RefineTypingIndicator() {
  return (
    <div className="self-start flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "#f3e2cd", color: "#b87a4a" }}
      >
        <Icon.Sparkles size={12} />
      </div>
      <div
        className="px-3.5 py-3 rounded-2xl"
        style={{ background: "#fdfaf3", borderBottomLeftRadius: 4, border: "1px solid #ece2d0" }}
      >
        <div className="flex items-center gap-1">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="inline-block w-[5px] h-[5px] rounded-full pulse-dot"
              style={{ background: "#b87a4a", animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
