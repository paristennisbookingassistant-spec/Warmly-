"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/chat";
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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
            Welcome back.
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
          <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full px-3.5 py-2.5 text-[14px] rounded-md focus:outline-none transition-colors placeholder:text-ink-4"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-[11px] uppercase tracking-[0.12em] font-medium mb-1.5"
                style={{ color: "var(--ink-3)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 text-[14px] rounded-md focus:outline-none transition-colors placeholder:text-ink-4"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
              <div className="mt-1.5 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[11.5px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent-ink)" }}
                >
                  Forgot password?
                </Link>
              </div>
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
              disabled={loading}
              className="w-full py-2.5 rounded-full text-[13px] font-medium text-bg transition-colors disabled:opacity-50"
              style={{ background: "var(--ink)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div
                className="w-full"
                style={{ borderTop: "1px solid var(--line-soft)" }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="text-[10.5px] uppercase tracking-[0.12em] font-medium px-3"
                style={{
                  color: "var(--ink-4)",
                  background: "var(--surface)",
                }}
              >
                or
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 rounded-full text-[13px] inline-flex items-center justify-center gap-2 transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <p
          className="text-center text-[12.5px] mt-6"
          style={{ color: "var(--ink-3)" }}
        >
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium hover:opacity-80 transition-opacity"
            style={{ color: "var(--accent-ink)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
