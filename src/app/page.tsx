import { redirect } from "next/navigation";

/**
 * Root page — redirects authenticated users to the V2 app.
 * Unauthenticated users are redirected to login by middleware.ts.
 */
export default function RootPage() {
  redirect("/v2");
}
