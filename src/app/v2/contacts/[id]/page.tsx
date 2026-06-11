/**
 * app/v2/contacts/[id]/page.tsx
 * Contact detail page — delegates all data fetching and state to the
 * ContactDetail client component.
 */

import { ContactDetail } from "@/components/v2/contacts/ContactDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function V2ContactDetailPage({ params }: Props) {
  const { id } = await params;
  return <ContactDetail contactId={id} />;
}
