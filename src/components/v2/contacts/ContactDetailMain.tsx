/**
 * components/v2/contacts/ContactDetailMain.tsx
 * Left card of the contact detail — identity, story, experience, education,
 * notes, and artifacts timeline.
 */

import type { Contact, Artifact } from "@/types/database";
import { Avatar, InseadPill, TierBadge } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { StorySoFarStub } from "./StorySoFarStub";
import { ExperienceTimeline } from "./ExperienceTimeline";
import { EducationList } from "./EducationList";
import { ArtifactsTimeline } from "./ArtifactsTimeline";
import { detectInsead } from "./contactsUtils";
import { tierLabelFromNumber } from "@/components/v2/palette";

interface ContactDetailMainProps {
  contact: Contact;
  artifacts: Artifact[];
  notesUpdater: (newNotes: string) => void;
  notesBlock: React.ReactNode;
}

function Divider() {
  return <div className="h-px my-7" style={{ background: "#e5d8be" }} />;
}

export function ContactDetailMain({
  contact: c,
  artifacts,
  notesBlock,
}: ContactDetailMainProps) {
  const inseadShort = detectInsead(c.education_v2);
  const tierLabel = c.tier ? tierLabelFromNumber(c.tier) : null;
  const firstName = c.name.split(" ")[0];

  return (
    <div className="bg-white rounded-2xl p-8" style={{ border: "1px solid #e5d8be" }}>
      {/* Identity */}
      <div className="flex items-start gap-5 mb-7">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
        <Avatar src={c.photo_url ?? c.avatar_url} size={72} />
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="font-display text-ink leading-tight" style={{ fontSize: 26 }}>
            {c.name}
          </h1>
          <div className="text-[14px] text-ink-2 mt-1">
            {c.current_title}
            {c.company ? ` · ${c.company}` : ""}
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {c.location && (
              <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-3">
                <Icon.MapPin size={12} />
                {c.location}
              </span>
            )}
            {inseadShort && (
              <>
                <span className="text-ink-4">·</span>
                <InseadPill>INSEAD {inseadShort}</InseadPill>
              </>
            )}
            {tierLabel && (
              <span className="ml-1">
                <TierBadge tier={tierLabel} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation reason */}
      {c.recommendation_reason && (
        <div className="mb-6">
          <div className="text-[15px] font-display italic text-ink-2 mb-2">
            Why connect with {firstName}
          </div>
          <p className="text-[14px] leading-relaxed text-ink-2" style={{ maxWidth: 640 }}>
            {c.recommendation_reason}
          </p>
        </div>
      )}

      {/* Story so far (stub) */}
      <StorySoFarStub notes={c.notes} contactFirstName={firstName} />

      <Divider />

      {/* Experience */}
      {c.experience && c.experience.length > 0 && (
        <>
          <ExperienceTimeline experience={c.experience} />
          <Divider />
        </>
      )}

      {/* Education */}
      {c.education_v2 && c.education_v2.length > 0 && (
        <>
          <EducationList education={c.education_v2} />
          <Divider />
        </>
      )}

      {/* Notes */}
      {notesBlock}

      <Divider />

      {/* Artifacts timeline */}
      <ArtifactsTimeline artifacts={artifacts} />
    </div>
  );
}
