import { redirect } from "next/navigation";

/**
 * Root page — sends every visitor to the public /pilot flyer.
 * Logged-in users reach the app directly at /v2.
 */
export default function RootPage() {
  redirect("/pilot");
}
