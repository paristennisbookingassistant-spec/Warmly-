/**
 * GET  /api/conversations  — List conversations for the authenticated user
 * POST /api/conversations  — Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  internalError,
  buildPaginatedResponse,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  ListConversationsResponse,
  CreateConversationResponse,
} from "@/types/api";
import type { Conversation } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.enum(["general", "contact_session"]).optional(),
  contact_id: z.string().uuid().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

const CreateConversationSchema = z.object({
  type: z.enum(["general", "contact_session"]),
  contact_id: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListConversationsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { page, per_page, type, contact_id, status } = parsed.data;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (type) query = query.eq("type", type);
  if (contact_id) query = query.eq("contact_id", contact_id);
  if (status) query = query.eq("status", status);

  // Most recently updated first — like ChatGPT sidebar
  query = query.order("updated_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("conversations GET error:", error);
    return internalError("Failed to fetch conversations");
  }

  const response: ListConversationsResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as Conversation[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Auto-generate title from contact name if contact_session
  let title = parsed.data.title ?? "New conversation";

  if (parsed.data.type === "contact_session" && parsed.data.contact_id && !parsed.data.title) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("name, company")
      .eq("id", parsed.data.contact_id)
      .eq("user_id", user.id)
      .single();

    if (contact) {
      title = contact.company
        ? `${contact.name} — ${contact.company}`
        : contact.name;
    }
  }

  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      type: parsed.data.type,
      contact_id: parsed.data.contact_id ?? null,
      title,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !newConversation) {
    console.error("conversations POST error:", insertError);
    return internalError("Failed to create conversation");
  }

  const response: CreateConversationResponse = {
    data: newConversation as Conversation,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
