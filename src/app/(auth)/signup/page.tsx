"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (password.length === 0) return { score: 0, label: "", color: "var(--line)" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;

  const configs = [
    { label: "Too short", color: "var(--bad)" },
    { label: "Weak", color: "var(--bad)" },
    { label: "Fair", color: "var(--warn)" },
    { label: "Good", color: "var(--accent)" },
    { label: "Strong", color: "var(--good)" },
  ];
  const cfg = configs[score];
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: cfg.label,
    color: cfg.color,
  };
}

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-8 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display italic text-[24px] text-ink leading-tight">
            Check your email.
          </h2>
          <p
            className="text-[13px] mt-3 leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            We sent a confirmation link to{" "}
            <span className="font-medium" style={{ color: "var(--ink)" }}>
              {email}
            </span>
            . Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-[12.5px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent-ink)" }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
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
            Start with someone you mean to know better.
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
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className={labelClass} style={labelStyle}>
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Moreau"
                required
                autoComplete="name"
                autoFocus
                className={fieldClass}
                style={fieldStyle}
              />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={fieldClass}
                style={fieldStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={labelStyle}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                className={fieldClass}
                style={fieldStyle}
              />
              {password.length > 0 && (
                <div>
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background:
                            strength.score >= level
                              ? strength.color
                              : "var(--line-soft)",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-[11px] font-medium mt-1.5"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                className={fieldClass}
                style={fieldStyle}
              />
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p
                  className="text-[11px] mt-1.5"
                  style={{ color: "var(--bad)" }}
                >
                  Passwords don&rsquo;t match
                </p>
              )}
            </div>

            {error && (
              <div
                className="text-[12.5px] rounded-md px-3 py-2"
                style={{
                  background: "color-mix(in oklch, var(--bad) 8%, var(--bg))",
                  color: "var(--bad)",
                  border: "1px solid color-mix(in oklch, var(--bad) 20%, var(--line))",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading || (!passwordsMatch && confirmPassword.length > 0)
              }
              className="w-full py-2.5 rounded-full text-[13px] font-medium text-bg transition-colors disabled:opacity-50"
              style={{ background: "var(--ink)" }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[12.5px] mt-6"
          style={{ color: "var(--ink-3)" }}
        >
          Already have an account?{" "}
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
