"use client";

import { useMemo } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Returns the singleton Supabase browser client.
 * Stable reference — safe to use as a hook dependency.
 */
export function useSupabase() {
  // useMemo ensures the client is only created once even in StrictMode
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  return client;
}
