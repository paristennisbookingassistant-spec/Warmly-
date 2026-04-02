/**
 * supabase/server.ts
 * Server-side Supabase client.
 * Used in Server Components, API routes, and server actions.
 * Reads cookies from the incoming request to authenticate the user.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a new server-side Supabase client for each request.
 * Must be called inside a Server Component or API route handler —
 * not at module level, because cookies() is request-scoped.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from Server Components where cookies
            // are read-only. This is safe to ignore — middleware handles
            // refreshing the session cookie.
          }
        },
      },
    }
  );
}

/** Convenience type for passing the server client into helper functions */
export type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

/**
 * Service-role client for privileged server-side operations.
 * Only use this in API routes where you need to bypass RLS
 * (e.g., admin operations, seed scripts).
 * NEVER expose this client to the browser.
 */
export function getSupabaseServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service client doesn't manage cookies
        },
      },
    }
  );
}
