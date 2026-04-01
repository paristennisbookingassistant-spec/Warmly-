/**
 * supabase/client.ts
 * Browser-side Supabase client.
 * Used in Client Components ("use client") and browser-side hooks.
 * Do NOT use this in Server Components or API routes — use server.ts instead.
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton pattern: Next.js modules are re-evaluated on each hot reload,
 * so we cache the client instance to avoid creating duplicates.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
