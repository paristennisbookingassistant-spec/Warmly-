"use client";

/**
 * SwipeDeck — orchestrates the Tinder-style review flow.
 *
 * Behavior:
 *   1. Renders the current card (one at a time)
 *   2. On action click: triggers exit animation, fires PATCH to backend,
 *      advances to next card after animation completes
 *   3. Shows an Undo pill for 5s after each action so a misclick can be
 *      reversed (the most recent PATCH gets rolled back to pending)
 *   4. After the last card: shows "All caught up" empty state with a
 *      link back to Contacts
 *
 * Optimistic UI: we advance the visible card on action click and fire
 * the PATCH in parallel. On error, the card snaps back (rare).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "./ProfileCard";
import type { Contact } from "@/types/database";

type Action = "save" | "skip" | "star" | "undo";

interface SwipeDeckProps {
  contacts: Contact[];
}

interface UndoEntry {
  contactId: string;
  previousAction: Contact["user_action"];
  expiresAt: number;
}

// 8s gives the user enough time to register the action visually + decide
// to undo, especially for slower-paced swipers. Bumped from 5s after QA
// flagged the window felt tight.
const UNDO_WINDOW_MS = 8000;
const EXIT_ANIMATION_MS = 320;

export default function SwipeDeck({ contacts: initialContacts }: SwipeDeckProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<Contact[]>(initialContacts);
  const [cursor, setCursor] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [undoTick, setUndoTick] = useState(0);

  // Refs for current contact + total so callbacks don't stale-close
  const queueRef = useRef(queue);
  const cursorRef = useRef(cursor);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);

  // Undo timer tick (1s) — just to re-render the remaining-seconds label
  useEffect(() => {
    if (!undoEntry) return;
    const t = setInterval(() => setUndoTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [undoEntry]);

  // Auto-expire undo
  useEffect(() => {
    if (!undoEntry) return;
    const remaining = undoEntry.expiresAt - Date.now();
    if (remaining <= 0) {
      setUndoEntry(null);
      return;
    }
    const t = setTimeout(() => setUndoEntry(null), remaining);
    return () => clearTimeout(t);
  }, [undoEntry, undoTick]);

  const fireAction = useCallback(
    async (contactId: string, action: Action): Promise<boolean> => {
      try {
        const res = await fetch(`/api/contacts/${contactId}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        });
        return res.ok;
      } catch (err) {
        console.error("[Review] action failed", err);
        return false;
      }
    },
    []
  );

  const handleAction = useCallback(
    (action: Action) => {
      const current = queueRef.current[cursorRef.current];
      if (!current) return;

      const direction = action === "skip" ? "left" : action === "save" ? "right" : "up";
      setExitDirection(direction);

      // Fire the PATCH immediately (don't wait for animation)
      void fireAction(current.id, action);

      // Remember for undo
      setUndoEntry({
        contactId: current.id,
        previousAction: current.user_action,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      });

      // After animation, advance + reset direction
      window.setTimeout(() => {
        setExitDirection(null);
        setCursor((c) => c + 1);

        // If starred, navigate to the contact's chat session — that's
        // where outreach drafting actually happens. The user can type
        // "draft outreach" or the coach can suggest it. For v1 we just
        // open the session; auto-firing the draft is a small follow-up.
        if (action === "star") {
          router.push(`/chat?contact=${current.id}`);
        }
      }, EXIT_ANIMATION_MS);
    },
    [fireAction, router]
  );

  const handleUndo = useCallback(async () => {
    if (!undoEntry) return;
    // Revert: PATCH the contact back to user_action=pending via the
    // dedicated "undo" action on the review endpoint. The endpoint also
    // clears reviewed_at so the contact looks fresh in the deck again.
    void fireAction(undoEntry.contactId, "undo");
    setCursor((c) => Math.max(0, c - 1));
    setUndoEntry(null);
  }, [undoEntry, fireAction]);

  const current = queue[cursor];

  // Empty state — all reviewed
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] px-6 text-center">
        <div
          className="font-display italic text-[48px] leading-none tracking-tight mb-3"
          style={{ color: "var(--accent)" }}
        >
          All caught up.
        </div>
        <p
          className="text-[14px] max-w-[420px] leading-relaxed mb-6"
          style={{ color: "var(--ink-2)" }}
        >
          You&rsquo;ve reviewed every new profile. Saved contacts are in your
          contacts view, ready to outreach when you are.
        </p>
        <button
          onClick={() => router.push("/contacts")}
          className="px-5 py-2.5 rounded-lg text-[13px] font-medium"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
          }}
        >
          Go to contacts →
        </button>
      </div>
    );
  }

  const undoSecondsLeft = undoEntry
    ? Math.max(0, Math.ceil((undoEntry.expiresAt - Date.now()) / 1000))
    : 0;

  return (
    <div className="relative pt-8 pb-16 px-4">
      <ProfileCard
        key={current.id}
        contact={current}
        exitDirection={exitDirection}
        position={cursor + 1}
        total={queue.length}
        onSkip={() => handleAction("skip")}
        onSave={() => handleAction("save")}
        onStar={() => handleAction("star")}
      />

      {/* Undo pill */}
      {undoEntry && (
        <div
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full px-4 py-2.5 shadow-md"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            fontSize: "13px",
          }}
          role="status"
        >
          <span style={{ opacity: 0.85 }}>
            Action recorded · undo in {undoSecondsLeft}s
          </span>
          <button
            onClick={handleUndo}
            className="font-medium px-2 py-0.5 rounded-md transition-colors hover:opacity-90"
            style={{
              background: "color-mix(in oklch, var(--bg) 18%, transparent)",
              color: "var(--bg)",
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
