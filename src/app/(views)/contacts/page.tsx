"use client";

import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import ContactGrid from "@/components/contacts/ContactGrid";
import type { Contact } from "@/types/database";

export default function ContactsPage() {
  const router = useRouter();
  const { contacts, isLoading } = useContacts();

  function handleOpenSession(contact: Contact) {
    // TODO: Create/open a contact session in chat for this contact
    router.push(`/chat?contact=${contact.id}`);
  }

  function handleViewDetail(contact: Contact) {
    router.push(`/contacts/${contact.id}`);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoading ? "Loading..." : `${contacts.length} contacts in your network`}
            </p>
          </div>
        </div>

        {/* Filter bar — TODO: implement filtering */}
        <div className="flex items-center gap-3 mt-4">
          {["All", "Tier 1", "Tier 2", "Discovered", "Contacted", "Met"].map((filter) => (
            <button
              key={filter}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors first:bg-blue-500 first:text-white"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <ContactGrid
          contacts={contacts}
          isLoading={isLoading}
          onOpenSession={handleOpenSession}
          onViewDetail={handleViewDetail}
        />
      </div>
    </div>
  );
}
