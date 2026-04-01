import { redirect } from "next/navigation";

/**
 * Root page — redirects authenticated users to the chat view.
 * Unauthenticated users are redirected to login by middleware.ts.
 */
export default function RootPage() {
  redirect("/chat");
}
