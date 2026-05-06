"use client";

/**
 * Error boundary for /contacts/[id].
 *
 * If the detail page crashes during render (e.g. a contact has malformed data
 * that breaks a util like buildMatchSignals), this catches the exception and
 * shows a friendly fallback instead of Edge's native "page couldn't load".
 *
 * Logs the error so we can see it in the Vercel function logs.
 */

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ContactDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the error so we can see it in browser console + Vercel logs.
    console.error("[contact detail] render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="max-w-md">
        <h2 className="font-display italic text-[28px] text-ink leading-tight">
          We couldn&rsquo;t open this contact.
        </h2>
        <p className="text-[14px] text-ink-2 mt-3 leading-relaxed">
          Their saved profile has a missing or malformed field. The rest of the
          app still works — try another contact, or reload to retry.
        </p>
        {error.digest && (
          <p className="text-[11px] text-ink-4 mt-3 font-mono">
            ref · {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-[13px] rounded-lg border transition-colors"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
              background: "var(--surface)",
            }}
          >
            Try again
          </button>
          <Link
            href="/contacts"
            className="px-4 py-2 text-[13px] rounded-lg transition-colors"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            Back to contacts
          </Link>
        </div>
      </div>
    </div>
  );
}
