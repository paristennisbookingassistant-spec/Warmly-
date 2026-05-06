"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/useContacts";
import ContactGrid from "@/components/contacts/ContactGrid";
import ContactList from "@/components/contacts/ContactList";
import Today from "@/components/contacts/Today";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getRelationshipHealthFromDate } from "@/lib/utils/matchSignals";
import type { Contact } from "@/types/database";

interface AddContactForm {
  name: string;
  linkedin_url: string;
  company: string;
  current_title: string;
}

type FilterKey = "all" | "tier1" | "met" | "overdue" | "new";
type Layout = "list" | "grid";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "tier1", label: "Tier 1" },
  { key: "met", label: "Met / ongoing" },
  { key: "overdue", label: "Going cold" },
  { key: "new", label: "New" },
];

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

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("list");

  // Restore the saved layout preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("warmly.contacts.layout");
    if (saved === "grid" || saved === "list") setLayout(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("warmly.contacts.layout", layout);
  }, [layout]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Filter pill
      if (filter === "tier1" && c.tier !== 1) return false;
      if (filter === "met" && !(c.status === "met" || c.status === "ongoing"))
        return false;
      if (filter === "new" && c.status !== "discovered") return false;
      if (filter === "overdue") {
        const h = getRelationshipHealthFromDate(c.last_interaction_at);
        if (h !== "yellow" && h !== "red") return false;
      }
      // Search
      if (query) {
        const haystack = [
          c.name,
          c.company ?? "",
          c.current_title ?? "",
          c.location ?? "",
          ...c.career_history.slice(0, 3).map((r) => r.company),
          ...c.education.slice(0, 2).map((e) => e.school),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [contacts, filter, query]);

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
            <div className="max-w-2xl">
              <h1 className="font-display italic text-[40px] leading-[1.05] tracking-tight text-ink">
                A deliberate network.
              </h1>
              {!isLoading && contacts.length > 0 && (
                <p
                  className="text-[14px] mt-3 leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  <span className="font-medium" style={{ color: "var(--ink)" }}>
                    {tierStats.total} {tierStats.total === 1 ? "person" : "people"}
                  </span>
                  {" "}across your target industries. The coach surfaces who
                  to reach, when, and why — so you can spend your time on the
                  human part.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] transition-colors"
                style={{
                  background: "var(--surface)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow-1)",
                }}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>
                Add contact
              </button>
              <button
                disabled
                title="Coming soon — run via the Chrome extension for now"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] opacity-60 cursor-not-allowed text-bg"
                style={{ background: "var(--ink)" }}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M13 3 4 14h6l-1 7 9-11h-6z" />
                </svg>
                Run discovery
              </button>
            </div>
          </header>

          {/* Today feed — re-warm / follow-up / reach-out */}
          {!isLoading && (
            <Today contacts={contacts} onOpenContact={handleViewDetail} />
          )}

          {/* Toolbar — search + filters + layout toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "var(--ink-4)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, company, school, location…"
                className="w-full pl-9 pr-3 py-2 rounded-md text-[12.5px] focus:outline-none transition-colors placeholder:text-ink-4"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] transition-colors"
                  )}
                  style={
                    filter === f.key
                      ? {
                          background: "var(--ink)",
                          color: "var(--bg)",
                        }
                      : {
                          background: "var(--surface)",
                          color: "var(--ink-2)",
                          border: "1px solid var(--line)",
                        }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Layout toggle */}
            <div
              className="inline-flex rounded-md p-0.5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <button
                onClick={() => setLayout("list")}
                aria-pressed={layout === "list"}
                title="List view"
                className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors"
                style={{
                  background:
                    layout === "list" ? "var(--surface-2)" : "transparent",
                  color:
                    layout === "list" ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setLayout("grid")}
                aria-pressed={layout === "grid"}
                title="Grid view"
                className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors"
                style={{
                  background:
                    layout === "grid" ? "var(--surface-2)" : "transparent",
                  color:
                    layout === "grid" ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="4" y="4" width="7" height="7" />
                  <rect x="13" y="4" width="7" height="7" />
                  <rect x="4" y="13" width="7" height="7" />
                  <rect x="13" y="13" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contacts — list or grid */}
          <section>
            {layout === "list" ? (
              <ContactList
                contacts={filteredContacts}
                isLoading={isLoading}
                onOpenContact={handleViewDetail}
              />
            ) : (
              <ContactGrid
                contacts={filteredContacts}
                isLoading={isLoading}
                onOpenSession={handleOpenSession}
                onViewDetail={handleViewDetail}
              />
            )}
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
