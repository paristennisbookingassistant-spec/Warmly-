"use client";

import type { Contact } from "@/types/database";
import ContactCard from "./ContactCard";
import { ContactCardSkeleton } from "@/components/ui/Skeleton";

interface ContactGridProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpenSession?: (contact: Contact) => void;
  onViewDetail?: (contact: Contact) => void;
}

export default function ContactGrid({
  contacts,
  isLoading = false,
  onOpenSession,
  onViewDetail,
}: ContactGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <ContactCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">No contacts yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Start a discovery session or add contacts manually in the chat.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onOpenSession={onOpenSession}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
}
