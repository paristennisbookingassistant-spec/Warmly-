"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import ContactGrid from "@/components/contacts/ContactGrid";
import Today from "@/components/contacts/Today";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Contact } from "@/types/database";

interface AddContactForm {
  name: string;
  linkedin_url: string;
  company: string;
  current_title: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { contacts, isLoading } = useContacts();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddContactForm>({
    name: "",
    linkedin_url: "",
    company: "",
    current_title: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleOpenSession(contact: Contact) {
    router.push(`/chat?contact=${contact.id}`);
  }

  function handleViewDetail(contact: Contact) {
    router.push(`/contacts/${contact.id}`);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          ...(form.linkedin_url && { linkedin_url: form.linkedin_url }),
          ...(form.company && { company: form.company }),
          ...(form.current_title && { current_title: form.current_title }),
          source: "manual_chat",
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error?.message ?? "Failed to add contact.");
      } else {
        setShowAddModal(false);
        setForm({ name: "", linkedin_url: "", company: "", current_title: "" });
        // Reload page data — in a real app we'd update local state
        router.refresh();
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const tierStats = useMemo(() => {
    let a = 0;
    let b = 0;
    let c = 0;
    for (const contact of contacts) {
      if (contact.tier === 1) a++;
      else if (contact.tier === 2) b++;
      else if (contact.tier === 3) c++;
    }
    return { a, b, c, total: contacts.length };
  }, [contacts]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
          {/* Hero */}
          <header className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-ink-3 mb-2">
                Your network
              </p>
              <h1 className="font-display italic text-[40px] leading-[1.05] tracking-tight text-ink">
                A deliberate network.
              </h1>
              {!isLoading && contacts.length > 0 && (
                <div className="flex items-center gap-5 mt-3 text-[13px] text-ink-3">
                  <span>
                    <span className="text-ink-2 font-medium">{tierStats.total}</span>
                    {" "}contact{tierStats.total === 1 ? "" : "s"}
                  </span>
                  {tierStats.a > 0 && (
                    <span>
                      <span className="text-ink-2 font-medium">{tierStats.a}</span>
                      {" "}tier A
                    </span>
                  )}
                  {tierStats.b > 0 && (
                    <span>
                      <span className="text-ink-2 font-medium">{tierStats.b}</span>
                      {" "}tier B
                    </span>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
              icon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            >
              Add contact
            </Button>
          </header>

          {/* Today feed — re-warm / follow-up / reach-out */}
          {!isLoading && (
            <Today contacts={contacts} onOpenContact={handleViewDetail} />
          )}

          {/* All contacts */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="font-display italic text-[24px] text-ink leading-tight tracking-tight">
                Everyone
              </h2>
            </div>
            <ContactGrid
              contacts={contacts}
              isLoading={isLoading}
              onOpenSession={handleOpenSession}
              onViewDetail={handleViewDetail}
            />
          </section>
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormError(null);
        }}
        title="Add Contact"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Sarah Chen"
            required
            autoFocus
          />
          <Input
            label="LinkedIn URL"
            value={form.linkedin_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, linkedin_url: e.target.value }))
            }
            placeholder="https://linkedin.com/in/sarahchen"
            type="url"
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            }
          />
          <p className="text-xs text-[#525252] bg-black/[0.03] border border-black/[0.06] rounded-lg px-3 py-2 -mt-1">
            For full profile details (experience, education, photo), visit this profile in Chrome and use the extension&apos;s &quot;Save this profile&quot; button.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              placeholder="Sequoia Capital"
            />
            <Input
              label="Role"
              value={form.current_title}
              onChange={(e) =>
                setForm((f) => ({ ...f, current_title: e.target.value }))
              }
              placeholder="Partner"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowAddModal(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isSubmitting}
              disabled={!form.name.trim()}
            >
              Add Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
