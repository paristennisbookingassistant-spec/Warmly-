"use client";

/**
 * components/v2/contacts/ContactDetail.tsx
 * Root client component for /v2/contacts/[id].
 * Fetches contact + artifacts in parallel; handles mark-met, archive, add-note.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Artifact } from "@/types/database";
import { Icon } from "@/components/v2/icons";
import { Btn } from "@/components/v2/primitives";
import { useToast } from "@/components/v2/Toast";
import { ContactDetailSkeleton } from "./ContactDetailSkeleton";
import { ContactDetailMain } from "./ContactDetailMain";
import { ContactDetailSidebar } from "./ContactDetailSidebar";
import { NotesBlock } from "./NotesBlock";

interface ApiContactResponse { data: Contact; error?: string; }
interface ApiArtifactsResponse { data: { items: Artifact[] }; error?: string; }

export function ContactDetail({ contactId }: { contactId: string }) {
  const router = useRouter();
  const showToast = useToast();

  const [contact, setContact] = useState<Contact | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingMet, setMarkingMet] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cr, ar] = await Promise.all([
        fetch(`/api/contacts/${contactId}`),
        fetch(`/api/artifacts?contact_id=${contactId}&per_page=50`),
      ]);
      if (!cr.ok) throw new Error(`HTTP ${cr.status}`);
      const cj: ApiContactResponse = await cr.json();
      if (cj.error) throw new Error(cj.error);
      setContact(cj.data);
      if (ar.ok) {
        const aj: ApiArtifactsResponse = await ar.json();
        setArtifacts(aj.data?.items ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    } finally { setLoading(false); }
  }, [contactId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleMarkMet = async () => {
    if (!contact) return;
    setMarkingMet(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "met" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: ApiContactResponse = await res.json();
      setContact(j.data);
      showToast(`${contact.name.split(" ")[0]} marked as met.`);
    } catch { showToast("Failed to update status. Please try again."); }
    finally { setMarkingMet(false); }
  };

  const handleArchive = async () => {
    if (!contact) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/review`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`${contact.name.split(" ")[0]} archived.`);
      router.push("/v2/contacts");
    } catch { showToast("Failed to archive. Please try again."); setArchiving(false); }
  };

  const handleNotesUpdated = (n: string) => {
    if (!contact) return;
    setContact({ ...contact, notes: n });
    showToast("Note saved.");
  };

  if (loading) return <ContactDetailSkeleton />;

  if (error || !contact) {
    return (
      <div className="px-12 pt-12 pb-16 max-w-[1240px] mx-auto">
        <div className="bg-white rounded-2xl p-16 flex flex-col items-center gap-4 text-center" style={{ border: "1px solid #e5d8be" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7", color: "#92400e" }}>
            <Icon.Alert size={20} />
          </div>
          <div>
            <div className="text-[14.5px] font-semibold text-ink mb-1">Failed to load contact</div>
            <div className="text-[12.5px] text-ink-3">{error ?? "Contact not found"}</div>
          </div>
          <Btn variant="sienna-soft" size="sm" onClick={() => void fetchData()}>Retry</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="px-12 pt-8 pb-16 max-w-[1240px] mx-auto">
      <div className="flex items-center justify-between mb-7">
        <button onClick={() => router.push("/v2/contacts")} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <Icon.ArrowLeft size={14} /> Back to Contacts
        </button>
      </div>
      <div className="grid grid-cols-[1fr_312px] gap-7">
        <ContactDetailMain
          contact={contact}
          artifacts={artifacts}
          notesUpdater={handleNotesUpdated}
          notesBlock={
            <NotesBlock contactId={contactId} notes={contact.notes} onNotesUpdated={handleNotesUpdated} />
          }
        />
        <ContactDetailSidebar
          contact={contact}
          onMarkMet={() => void handleMarkMet()}
          onArchive={() => void handleArchive()}
          markingMet={markingMet}
          archiving={archiving}
        />
      </div>
    </div>
  );
}
