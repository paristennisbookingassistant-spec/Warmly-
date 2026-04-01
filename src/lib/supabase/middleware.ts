/**
 * supabase/middleware.ts
 * Auth middleware helper — refreshes the Supabase session on every request.
 * Called from Next.js middleware.ts at the root of the project.
 *
 * Design decision: Auth middleware lives in lib/ so it can be unit tested
 * independently of the Next.js middleware entry point.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that are publicly accessible without authentication */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
];

/** Route prefix for the authenticated app — redirect here after login */
const APP_HOME = "/chat";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this call.
  // It keeps the user session alive and refreshes the access token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith("/auth/")
  );

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
