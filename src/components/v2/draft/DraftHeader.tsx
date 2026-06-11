"use client";

/**
 * components/v2/draft/DraftHeader.tsx
 * Top bar: back link, contact identity, Copy + Send buttons.
 */

import { Icon } from "@/components/v2/icons";
import { Btn, Avatar } from "@/components/v2/primitives";
import type { Contact } from "@/types/database";

interface DraftHeaderProps {
  contact: Contact;
  onBack: () => void;
  onCopy: () => void;
  onSend: () => void;
  sendDisabled: boolean;
  sending: boolean;
}

export function DraftHeader({
  contact,
  onBack,
  onCopy,
  onSend,
  sendDisabled,
  sending,
}: DraftHeaderProps) {
  const avatarSrc = contact.photo_url ?? contact.avatar_url ?? null;

  return (
    <div className="flex items-center justify-between mb-6 flex-shrink-0">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors"
      >
        <Icon.ArrowLeft size={14} />
        Back to {contact.name}
      </button>

      <div className="flex items-center gap-3">
        {/* Contact identity pill */}
        <div className="flex items-center gap-2 px-3 h-9 rounded-xl border"
          style={{ borderColor: "#e5d8be", background: "#fdfaf3" }}>
          <Avatar src={avatarSrc} size={22} />
          <span className="text-[13px] font-medium text-ink leading-none">{contact.name}</span>
          {contact.current_title && (
            <span className="text-[12px] text-ink-3 leading-none">
              · {contact.current_title}
              {contact.company ? ` @ ${contact.company}` : ""}
            </span>
          )}
        </div>

        <Btn variant="secondary" icon={Icon.Copy} size="sm" onClick={onCopy}>
          Copy
        </Btn>
        <Btn
          icon={Icon.Send}
          size="sm"
          disabled={sendDisabled || sending}
          onClick={onSend}
        >
          {sending ? "Logging…" : "Save & sent"}
        </Btn>
      </div>
    </div>
  );
}
