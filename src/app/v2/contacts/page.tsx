/**
 * app/v2/contacts/page.tsx
 * Contacts list page. ContactsList uses useSearchParams for ?filter=reconnect deep-link,
 * so it must be wrapped in Suspense.
 */

import { Suspense } from "react";
import { ContactsList } from "@/components/v2/contacts/ContactsList";
import { ContactsListSkeleton } from "@/components/v2/contacts/ContactsListSkeleton";

export default function V2ContactsPage() {
  return (
    <Suspense fallback={<ContactsListSkeleton />}>
      <ContactsList />
    </Suspense>
  );
}
