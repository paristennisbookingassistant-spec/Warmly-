"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const fieldClass =
  "w-full px-3.5 py-2.5 text-[14px] rounded-md focus:outline-none transition-colors placeholder:text-ink-4";
const fieldStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)" as const,
};

const labelClass =
  "block text-[11px] uppercase tracking-[0.12em] font-medium mb-1.5";
const labelStyle = { color: "var(--ink-3)" as const };

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    }
    void checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/chat";
        }, 1800);
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
            Set a new password.
          </p>
        </div>

        <div
          className="rounded-xl p-7"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          {/* No session — invalid or expired link */}
          {hasSession === false && (
            <div className="space-y-4">
              <div
                className="rounded-md px-3 py-2.5"
                style={{
                  background:
                    "color-mix(in oklch, var(--warn) 8%, var(--bg))",
                  color: "color-mix(in oklch, var(--warn) 60%, var(--ink))",
                  border:
                    "1px solid color-mix(in oklch, var(--warn) 20%, var(--line))",
                }}
              >
                <p className="text-[13px] font-medium">
                  Invalid or expired link.
                </p>
                <p className="text-[12px] mt-1 leading-relaxed">
                  This reset link is no longer valid. Request a new one to
                  continue.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center py-2.5 rounded-full text-[13px] font-medium text-bg transition-colors"
                style={{ background: "var(--ink)" }}
              >
                Request a new reset link
              </Link>
            </div>
          )}

          {/* Loading session check */}
          {hasSession === null && (
            <div className="flex justify-center py-6">
              <svg
                className="animate-spin w-5 h-5"
                style={{ color: "var(--ink-3)" }}
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
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
          )}

          {/* Success state */}
          {success && (
            <div
              className="rounded-md px-4 py-3"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
                border:
                  "1px solid color-mix(in oklch, var(--accent) 25%, var(--line))",
              }}
            >
              <p className="text-[13px] font-medium">Password updated.</p>
              <p className="text-[12px] mt-1 leading-relaxed">
                Redirecting you to the app…
              </p>
            </div>
          )}

          {/* Form */}
          {hasSession === true && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass} style={labelStyle}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  autoFocus
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  autoComplete="new-password"
                  className={fieldClass}
                  style={fieldStyle}
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
                {loading ? "Updating…" : "Set new password"}
              </button>
            </form>
          )}
        </div>

        <p
          className="text-center text-[12.5px] mt-6"
          style={{ color: "var(--ink-3)" }}
        >
          Back to{" "}
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
