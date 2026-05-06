"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-baseline gap-1.5 mb-3">
            <span
              className="font-display italic text-[36px] leading-none tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Warmly
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full -translate-y-[14px]"
              style={{ background: "var(--accent)" }}
            />
          </div>
          <p
            className="font-display italic text-[20px]"
            style={{ color: "var(--ink-2)" }}
          >
            Reset your password.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-7"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          {sent ? (
            <div className="space-y-4">
              <div
                className="rounded-md px-4 py-3"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                  border: "1px solid color-mix(in oklch, var(--accent) 25%, var(--line))",
                }}
              >
                <p className="text-[13px] font-medium">Check your email.</p>
                <p className="text-[12px] mt-1 leading-relaxed">
                  We sent a reset link to{" "}
                  <span className="font-medium">{email}</span>. Click it to set
                  a new password.
                </p>
              </div>
              <p
                className="text-[11.5px] text-center"
                style={{ color: "var(--ink-4)" }}
              >
                Didn&rsquo;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="underline hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent-ink)" }}
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p
                className="text-[12.5px] text-center -mt-1 leading-relaxed"
                style={{ color: "var(--ink-3)" }}
              >
                Enter your account email and we&rsquo;ll send a reset link.
              </p>

              <div>
                <label
                  className="block text-[11px] uppercase tracking-[0.12em] font-medium mb-1.5"
                  style={{ color: "var(--ink-3)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-md focus:outline-none transition-colors placeholder:text-ink-4"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              {error && (
                <div
                  className="text-[12.5px] rounded-md px-3 py-2"
                  style={{
                    background:
                      "color-mix(in oklch, var(--bad) 8%, var(--bg))",
                    color: "var(--bad)",
                    border:
                      "1px solid color-mix(in oklch, var(--bad) 20%, var(--line))",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-full text-[13px] font-medium text-bg transition-colors disabled:opacity-50"
                style={{ background: "var(--ink)" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p
          className="text-center text-[12.5px] mt-6"
          style={{ color: "var(--ink-3)" }}
        >
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent-ink)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
