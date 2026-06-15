/**
 * app/v2/contacts/sort/page.tsx
 * Route: /v2/contacts/sort
 * Renders the "Sort your network" bulk-triage flow.
 * SortView is a client component (needs useState, keyboard events, fetch).
 */

import { SortView } from "@/components/v2/contacts/sort/SortView";

export const metadata = { title: "Sort your network · Warmly" };

export default function SortPage() {
  return <SortView />;
}
