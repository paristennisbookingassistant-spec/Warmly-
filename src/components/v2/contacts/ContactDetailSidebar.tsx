"use client";

/**
 * components/v2/contacts/ContactDetailSidebar.tsx
 * Right-column action sidebar on the contact detail page.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import type { Contact, RelationshipCategory } from "@/types/database";
import { Btn, SectionLabel, StatusBadge, TierBadge } from "@/components/v2/primitives";
import { Icon, WhatsAppIcon } from "@/components/v2/icons";
import { relativeTime, deriveFollowUpDue, detectInsead, phoneToWaLink } from "./contactsUtils";
import type { ContactStatusValue } from "@/components/v2/primitives";
import { tierLabelFromNumber } from "@/components/v2/palette";
import { RelationshipDropdown } from "./RelationshipDropdown";
import { CategorySuggestionChip } from "./CategorySuggestionChip";
import { suggestCategory } from "@/lib/crm/suggestCategory";

interface ContactDetailSidebarProps {
  contact: Contact;
  onMarkMet: () => void;
  onArchive: () => void;
  onCategoryChange: (category: RelationshipCategory | null, cadenceDays: number | null) => void;
  markingMet: boolean;
  archiving: boolean;
}

export function ContactDetailSidebar({
  contact: c,
  onMarkMet,
  onArchive,
  onCategoryChange,
  markingMet,
  archiving,
}: ContactDetailSidebarProps) {
  const status = c.status as ContactStatusValue;
  const followUpDue = deriveFollowUpDue(status, c.last_interaction_at);
  const lastLabel = relativeTime(c.last_interaction_at);
  const tierLabel = c.tier ? tierLabelFromNumber(c.tier) : null;

  // Suggestion chip: only shown while uncategorized + not dismissed by user
  const [chipDismissed, setChipDismissed] = useState(false);
  const dropdownRef = useRef<HTMLSelectElement | null>(null);

  const suggestion =
    c.relationship_category === null && !chipDismissed
      ? suggestCategory(c)
      : null;

  // Derive match signals for bottom of sidebar
  const signals: Array<{ label: string; bg: string; fg: string }> = [];
  if (tierLabel === "Strong") signals.push({ label: "Strong match", bg: "#dcebd9", fg: "#34553e" });
  else if (tierLabel === "Good") signals.push({ label: "Good match", bg: "#f3e2cd", fg: "#7a4a25" });
  else if (tierLabel) signals.push({ label: "Adjacent", bg: "#ece2d0", fg: "#6b5e4a" });

  const inseadShort = detectInsead(c.education_v2);
  if (inseadShort) signals.push({ label: `INSEAD ${inseadShort}`, bg: "#f3e2cd", fg: "#7a4a25" });
  if (c.location) signals.push({ label: c.location.split("/")[0].trim(), bg: "#dde6ee", fg: "#2f4d63" });
  if (c.company) signals.push({ label: c.company, bg: "#ffffff", fg: "#3d352c" });

  return (
    <div className="flex flex-col gap-5">
      {/* Actions card */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e5d8be" }}>
        <SectionLabel className="mb-3">Actions</SectionLabel>
        <div className="flex flex-col gap-2">
          <Link href={`/v2/contacts/${c.id}/draft`} className="block">
            <Btn variant="primary" icon={Icon.Edit} className="w-full justify-start">
              Draft outreach
            </Btn>
          </Link>
          <Link href={`/v2/contacts/${c.id}/prep`} className="block">
            <Btn variant="secondary" icon={Icon.Calendar} className="w-full justify-start">
              Prep meeting
            </Btn>
          </Link>
          {status !== "met" && status !== "ongoing" && (
            <Btn
              variant="secondary"
              icon={Icon.Coffee}
              className="w-full justify-start"
              onClick={onMarkMet}
              disabled={markingMet}
            >
              {markingMet ? "Marking…" : "Mark as met"}
            </Btn>
          )}
          {c.linkedin_url && (
            <a
              href={c.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Btn variant="secondary" icon={Icon.Link} className="w-full justify-start">
                LinkedIn profile
              </Btn>
            </a>
          )}
          {c.phone && (
            <a
              href={phoneToWaLink(c.phone)}
              target="_blank"
              rel="noopener noreferrer"
              title="Message on WhatsApp"
              aria-label="Message on WhatsApp"
              className="w-full inline-flex items-center justify-start gap-2 h-10 px-4 rounded-lg text-[13.5px] font-medium transition-all duration-150 select-none"
              style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
            >
              <WhatsAppIcon size={15} />
              WhatsApp
            </a>
          )}
          <Btn
            variant="ghost"
            icon={Icon.X}
            className="w-full justify-start"
            onClick={onArchive}
            disabled={archiving}
          >
            {archiving ? "Archiving…" : "Archive"}
          </Btn>
        </div>
      </div>

      {/* Status + signals card */}
      <div className="bg-white rounded-2xl p-5 flex-1 flex flex-col" style={{ border: "1px solid #e5d8be" }}>
        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel className="mb-2">Status</SectionLabel>
            <StatusBadge status={status} followUpDue={followUpDue} />
          </div>
          {c.tier && (
            <div>
              <SectionLabel className="mb-2">Tier</SectionLabel>
              <TierBadge tier={tierLabelFromNumber(c.tier)} />
            </div>
          )}
          <div>
            <SectionLabel className="mb-2">Last contact</SectionLabel>
            <div className="text-[13px] text-ink-2">{lastLabel}</div>
          </div>
          {followUpDue && (
            <div>
              <SectionLabel className="mb-2">Next action</SectionLabel>
              <div className="text-[13px] text-ink-3 inline-flex items-center gap-1.5">
                <Icon.Alert size={12} className="text-warn" />
                Follow-up overdue
              </div>
            </div>
          )}
          {suggestion && (
            <CategorySuggestionChip
              contactId={c.id}
              suggestion={suggestion}
              onConfirmed={(category, cadenceDays) => {
                setChipDismissed(true);
                onCategoryChange(category, cadenceDays);
              }}
              onDismiss={() => setChipDismissed(true)}
              dropdownRef={dropdownRef}
            />
          )}
          <RelationshipDropdown
            ref={dropdownRef}
            contactId={c.id}
            category={c.relationship_category}
            cadenceDays={c.cadence_days}
            nextTouchAt={c.next_touch_at}
            onSaved={onCategoryChange}
          />
        </div>

        {signals.length > 0 && (
          <div className="mt-6 pt-5 border-t flex-1 flex flex-col" style={{ borderColor: "#f0e6d0" }}>
            <SectionLabel className="mb-3">Match signals</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {signals.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 px-2 h-[24px] rounded-full text-[11.5px] font-medium"
                  style={{ background: s.bg, color: s.fg, border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <span className="w-[6px] h-[6px] rounded-full inline-block" style={{ background: s.fg }} />
                  {s.label}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-4 text-[11.5px] text-ink-4 leading-relaxed">
              Signals are inferred from profile data and your target scope.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
