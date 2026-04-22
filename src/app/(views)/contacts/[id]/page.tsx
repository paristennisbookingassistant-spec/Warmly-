"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import ContactDetail from "@/components/contacts/ContactDetail";
import type { Contact } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ContactDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { getContact, getArtifactsForContact, isLoading, deleteContact } = useContacts();

  const contact = getContact(id);
  const artifacts = getArtifactsForContact(id);

  function handleOpenSession(c: Contact) {
    router.push(`/chat?contact=${c.id}`);
  }

  async function handleDelete() {
    if (!contact) return;
    if (!window.confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
    const ok = await deleteContact(contact.id);
    if (ok) router.push("/contacts");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <h2 className="text-lg font-semibold text-gray-900">Contact not found</h2>
        <button
          onClick={() => router.push("/contacts")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Back to contacts
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Back button */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to contacts
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-lg transition-colors"
          >
            Delete contact
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <ContactDetail
          contact={contact}
          artifacts={artifacts}
          onOpenSession={handleOpenSession}
        />
      </div>
    </div>
  );
}
