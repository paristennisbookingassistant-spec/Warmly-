"use client";

import { useState, useCallback, useEffect } from "react";
import type { Contact, Artifact } from "@/types/database";

/**
 * useContacts
 * Manages the contacts list and per-contact artifact fetching.
 */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [artifactsByContact, setArtifactsByContact] = useState<
    Record<string, Artifact[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch("/api/contacts?sort_by=relevance_score&sort_order=desc&per_page=50");
        const json = await res.json();
        if (json.data) {
          setContacts(json.data.items);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadContacts();
  }, []);

  const getContact = useCallback(
    (id: string): Contact | undefined => {
      return contacts.find((c) => c.id === id);
    },
    [contacts]
  );

  const getArtifactsForContact = useCallback(
    (contactId: string): Artifact[] => {
      return artifactsByContact[contactId] ?? [];
    },
    [artifactsByContact]
  );

  const loadArtifactsForContact = useCallback(async (contactId: string) => {
    if (artifactsByContact[contactId]) return; // already loaded

    const res = await fetch(`/api/artifacts?contact_id=${contactId}&per_page=50`);
    const json = await res.json();
    if (json.data) {
      setArtifactsByContact((prev) => ({
        ...prev,
        [contactId]: json.data.items,
      }));
    }
  }, [artifactsByContact]);

  return {
    contacts,
    isLoading,
    getContact,
    getArtifactsForContact,
    loadArtifactsForContact,
  };
}
