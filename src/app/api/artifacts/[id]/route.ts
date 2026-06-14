/**
 * GET    /api/artifacts/[id]  — Get a single artifact
 * PUT    /api/artifacts/[id]  — Update artifact content, status, or outcome
 * DELETE /api/artifacts/[id]  — Delete an artifact
 *
 * PUT side-effects:
 * - Increments version if content changed
 * - If status → 'sent' and type is outreach: updates contact.status to 'contacted'
 * - If user_edit_distance provided: triggers style extraction → updates user_memory
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { extractStylePreferences } from "@/lib/ai/context";
import {
  distillLearnings,
  shouldAutoApprove,
  shouldDiscard,
  type LearningCandidate,
} from "@/lib/ai/learnings";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  GetArtifactResponse,
  UpdateArtifactResponse,
  DeleteArtifactResponse,
} from "@/types/api";
import type { Artifact, User } from "@/types/database";
import { computeNextTouchAt } from "@/lib/crm/cadence";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateArtifactSchema = z.object({
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "finalized", "sent", "archived"]).optional(),
  artifact_outcome: z
    .enum(["no_response", "response_received", "meeting_booked", "referral_received"])
    .optional(),
  user_edit_distance: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: artifact, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !artifact) {
    return notFound("Artifact");
  }

  const response: GetArtifactResponse = {
    data: artifact as Artifact,
    error: null,
  };

  return NextResponse.json(response);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = UpdateArtifactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Fetch current artifact to compute version increment
  const { data: current } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) return notFound("Artifact");

  const currentArtifact = current as Artifact;
  const newVersion =
    parsed.data.content !== undefined
      ? currentArtifact.version + 1
      : currentArtifact.version;

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    version: newVersion,
  };

  const { data: updatedArtifact, error: updateError } = await supabase
    .from("artifacts")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updatedArtifact) {
    console.error("artifacts PUT error:", updateError);
    return internalError("Failed to update artifact");
  }

  // Side-effect: if status → 'sent' and outreach type, update contact status
  const outreachTypes = ["connection_note", "outreach_draft", "follow_up_draft"];
  if (
    parsed.data.status === "sent" &&
    outreachTypes.includes(currentArtifact.type)
  ) {
    const nowIso = new Date().toISOString();
    // Fetch current CRM fields to recompute next_touch_at
    const { data: contactForOutreach } = await supabase
      .from("contacts")
      .select("relationship_category, cadence_days")
      .eq("id", currentArtifact.contact_id)
      .eq("user_id", user.id)
      .single();
    const outreachNextTouch = computeNextTouchAt(
      (contactForOutreach?.relationship_category as "nurturing" | "keep_warm" | "inner_circle" | "dormant" | null) ?? null,
      (contactForOutreach?.cadence_days as number | null) ?? null,
      nowIso
    );
    await supabase
      .from("contacts")
      .update({
        status: "contacted",
        last_interaction_at: nowIso,
        next_touch_at: outreachNextTouch,
      })
      .eq("id", currentArtifact.contact_id)
      .eq("user_id", user.id);
  }

  // Side-effect: if meeting_notes created → contact becomes 'met'
  if (parsed.data.status === "sent" && currentArtifact.type === "meeting_notes") {
    const nowIso = new Date().toISOString();
    // Fetch current CRM fields to recompute next_touch_at
    const { data: contactForMeeting } = await supabase
      .from("contacts")
      .select("relationship_category, cadence_days")
      .eq("id", currentArtifact.contact_id)
      .eq("user_id", user.id)
      .single();
    const meetingNextTouch = computeNextTouchAt(
      (contactForMeeting?.relationship_category as "nurturing" | "keep_warm" | "inner_circle" | "dormant" | null) ?? null,
      (contactForMeeting?.cadence_days as number | null) ?? null,
      nowIso
    );
    await supabase
      .from("contacts")
      .update({
        status: "met",
        last_interaction_at: nowIso,
        next_touch_at: meetingNextTouch,
      })
      .eq("id", currentArtifact.contact_id)
      .eq("user_id", user.id);
  }

  // Side-effect: if user_edit_distance provided with content → trigger style learning
  if (
    parsed.data.user_edit_distance !== undefined &&
    parsed.data.content !== undefined
  ) {
    void triggerStyleLearning(
      user.id,
      currentArtifact,
      parsed.data.content,
      supabase
    );
  }

  // Side-effect: when an outreach-family artifact transitions to 'sent',
  // distill 1-3 generalizable learnings from the diff between the original
  // AI draft and the version the user actually sent. Phase C of the
  // self-improvement loop. Confidence >= 8 + no_conflict auto-approves;
  // confidence 5-7 surfaces to the user for explicit approval; <5 discarded.
  const isOutreachSent =
    parsed.data.status === "sent" && outreachTypes.includes(currentArtifact.type);
  if (isOutreachSent) {
    void triggerLessonDistillation(
      user.id,
      currentArtifact,
      (parsed.data.content ?? currentArtifact.content) as Record<string, unknown>,
      supabase
    );
  }

  const response: UpdateArtifactResponse = {
    data: updatedArtifact as Artifact,
    error: null,
  };

  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: existing } = await supabase
    .from("artifacts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Artifact");

  const { error } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("artifacts DELETE error:", error);
    return internalError("Failed to delete artifact");
  }

  const response: DeleteArtifactResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// Style learning helper — PRD Section 5.9
// ---------------------------------------------------------------------------

async function triggerStyleLearning(
  userId: string,
  originalArtifact: Artifact,
  editedContent: Record<string, unknown>,
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("user_memory")
      .eq("id", userId)
      .single();

    if (!userData) return;

    const userTyped = userData as Pick<User, "user_memory">;

    // Extract the text content from artifacts for comparison
    const originalText = extractTextFromContent(originalArtifact.content);
    const editedText = extractTextFromContent(editedContent);

    if (!originalText || !editedText || originalText === editedText) return;

    const result = await extractStylePreferences({
      original_draft: originalText,
      edited_version: editedText,
      current_memory: userTyped.user_memory,
    });

    await supabase
      .from("users")
      .update({ user_memory: result.updated_memory })
      .eq("id", userId);
  } catch (err) {
    console.error("Style learning failed:", err);
  }
}

function extractTextFromContent(content: Record<string, unknown>): string {
  // Most artifact types have a 'message' field; meeting_prep has 'person_summary'
  if (typeof content.message === "string") return content.message;
  if (typeof content.person_summary === "string") return content.person_summary;
  return JSON.stringify(content);
}

// ---------------------------------------------------------------------------
// Phase C — lesson distillation on Mark-as-sent
// ---------------------------------------------------------------------------

/**
 * Fired when the user marks an outreach artifact as sent. Compares what we
 * drafted vs. what they sent, distills 1-3 generalizable learnings, and
 * inserts them into user_learnings with the correct status:
 *   - confidence >= 8 + no_conflict: status='approved' (auto)
 *   - confidence 5-7 or has_conflict: status='pending' (user reviews)
 *   - confidence < 5: discarded (not even inserted)
 */
async function triggerLessonDistillation(
  userId: string,
  sourceArtifact: Artifact,
  sentContent: Record<string, unknown>,
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    // Pull the original draft (what we generated initially — version 1).
    // For now we approximate by comparing the artifact's stored content
    // to the sent content. If they're identical (no edits), we skip —
    // there's nothing meaningful to distill.
    const originalText = extractTextFromContent(sourceArtifact.content);
    const sentText = extractTextFromContent(sentContent);

    if (!originalText || !sentText || originalText === sentText) {
      return;
    }

    // Pull existing approved learnings to feed into the distillation prompt
    const { data: existingLearnings } = await supabase
      .from("user_learnings")
      .select("learning")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);

    const existingTexts = (existingLearnings ?? []).map(
      (l) => l.learning as string
    );

    // Pull contact name for context
    let contactName: string | undefined;
    if (sourceArtifact.contact_id) {
      const { data: contactData } = await supabase
        .from("contacts")
        .select("name")
        .eq("id", sourceArtifact.contact_id)
        .single();
      contactName = contactData?.name as string | undefined;
    }

    const candidates = await distillLearnings({
      original_draft: originalText,
      sent_version: sentText,
      existing_learnings: existingTexts,
      artifact_type: sourceArtifact.type,
      contact_name: contactName,
    });

    if (candidates.length === 0) return;

    const rows = candidates
      .filter((c) => !shouldDiscard(c))
      .map((c: LearningCandidate) => {
        const autoApprove = shouldAutoApprove(c);
        return {
          user_id: userId,
          learning: c.learning,
          status: autoApprove ? "approved" : "pending",
          approved_at: autoApprove ? new Date().toISOString() : null,
          confidence: c.confidence,
          source_artifact_id: sourceArtifact.id,
          category: c.category,
          original_draft_excerpt: originalText.slice(0, 500),
          sent_excerpt: sentText.slice(0, 500),
        };
      });

    if (rows.length === 0) return;

    const { error: insertError } = await supabase
      .from("user_learnings")
      .insert(rows);

    if (insertError) {
      console.error("Lesson insert failed:", insertError);
    }
  } catch (err) {
    console.error("Lesson distillation failed:", err);
  }
}
