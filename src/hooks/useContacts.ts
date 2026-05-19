"use client";

import { useState, useCallback, useEffect } from "react";
import type { Contact, Artifact } from "@/types/database";

/**
 * useContacts
 * Manages the contacts list and per-contact artifact fetching.
 * The list fetch uses lite=true so the server omits heavy JSON columns
 * (career_history and education return [] in lite mode). The full Contact
 * row is fetched fresh on detail open via loadContactDetail.
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
        // lite=true returns a trimmed payload (no heavy JSON columns).
        // per_page reduced to 20 to keep the initial payload small.
        const res = await fetch("/api/contacts?sort_by=relevance_score&sort_order=desc&per_page=20&lite=true");
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

  /**
   * Load full contact detail + artifacts in parallel.
   * Always fetches a fresh full row from the server (the lite list omits heavy
   * fields) regardless of whether a lite entry exists in the list cache.
   */
  const loadContactDetail = useCallback(
    async (contactId: string): Promise<Contact | null> => {
      const [contactRes, artifactsRes] = await Promise.all([
        fetch(`/api/contacts/${contactId}`),
        fetch(`/api/artifacts?contact_id=${contactId}&per_page=50`),
      ]);

      const [contactJson, artifactsJson] = await Promise.all([
        contactRes.json(),
        artifactsRes.json(),
      ]);

      if (artifactsJson.data) {
        setArtifactsByContact((prev) => ({
          ...prev,
          [contactId]: artifactsJson.data.items,
        }));
      }

      return (contactJson.data as Contact) ?? null;
    },
    []
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

  const deleteContact = useCallback(async (contactId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) return false;
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setArtifactsByContact((prev) => {
        const next = { ...prev };
        delete next[contactId];
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    contacts,
    isLoading,
    getContact,
    getArtifactsForContact,
    loadArtifactsForContact,
    loadContactDetail,
    deleteContact,
  };
}
