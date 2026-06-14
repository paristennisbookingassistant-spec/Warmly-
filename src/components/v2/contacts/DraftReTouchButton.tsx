"use client";

/**
 * components/v2/contacts/DraftReTouchButton.tsx
 * Module 6 — "Draft re-touch" action on a contact due to reconnect.
 *
 * Flow (mirrors the outreach_draft pattern from draft/page.tsx):
 * 1. POST /api/conversations { type:"contact_session", contact_id }
 * 2. POST /api/ai/generate { artifact_type:"follow_up_draft", contact_id, conversation_id, user_instructions }
 * 3. Navigate to /v2/contacts/[id] (draft lands in the artifacts timeline).
 *
 * The toast system confirms generation; user sees the draft in ArtifactsTimeline.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/v2/Toast";
import { Btn } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { relativeTime } from "./contactsUtils";
import type { RelationshipCategory } from "@/types/database";
import { CATEGORY_LABEL } from "@/lib/crm/cadence";

interface DraftReTouchButtonProps {
  contactId: string;
  contactName: string;
  lastInteractionAt: string | null;
  category: RelationshipCategory | null;
  size?: "sm" | "md";
}

interface ConversationResponse {
  data: { id: string };
  error?: string;
}

interface GenerateResponse {
  data: { artifact_id: string; content: { message: string } };
  error?: string;
}

export function DraftReTouchButton({
  contactId,
  contactName,
  lastInteractionAt,
  category,
  size = "sm",
}: DraftReTouchButtonProps) {
  const router = useRouter();
  const showToast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDraftReTouch() {
    setLoading(true);
    try {
      // Step 1: get/create a conversation for this contact
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact_session", contact_id: contactId }),
      });
      if (!convRes.ok) throw new Error(`Conversation failed (${convRes.status})`);
      const convJson: ConversationResponse = await convRes.json();
      if (convJson.error) throw new Error(convJson.error);
      const conversationId = convJson.data.id;

      // Step 2: build user_instructions including relationship context
      const catLabel = category ? CATEGORY_LABEL[category] : null;
      const lastTouchLabel = relativeTime(lastInteractionAt);
      const instructions = [
        catLabel ? `This is a "${catLabel}" relationship.` : null,
        `Last interaction: ${lastTouchLabel}.`,
        "Write a warm re-touch message to reconnect.",
      ]
        .filter(Boolean)
        .join(" ");

      // Generate follow_up_draft (one retry on cold-start 500)
      const genBody = JSON.stringify({
        artifact_type: "follow_up_draft",
        contact_id: contactId,
        conversation_id: conversationId,
        user_instructions: instructions,
      });
      const callGen = () =>
        fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: genBody,
        });
      let genRes = await callGen();
      if (!genRes.ok) {
        await new Promise((r) => setTimeout(r, 1200));
        genRes = await callGen();
      }
      if (!genRes.ok) throw new Error(`Generate failed (${genRes.status})`);
      const genJson: GenerateResponse = await genRes.json();
      if (genJson.error) throw new Error(genJson.error);

      const firstName = contactName.split(" ")[0];
      showToast(`Re-touch draft ready for ${firstName}.`);
      router.push(`/v2/contacts/${contactId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Draft generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Btn
      variant="sienna-soft"
      size={size}
      icon={loading ? undefined : Icon.Edit}
      disabled={loading}
      onClick={() => void handleDraftReTouch()}
    >
      {loading ? "Drafting…" : "Draft re-touch"}
    </Btn>
  );
}
