/**
 * GET  /api/conversations  — List conversations for the authenticated user
 * POST /api/conversations  — Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-general-1",
    user_id: "user-abc",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T10:30:00Z",
    type: "general",
    contact_id: null,
    title: "PE networking strategy",
    status: "active",
    summary: null,
  },
  {
    id: "conv-contact-1",
    user_id: "user-abc",
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
    type: "contact_session",
    contact_id: "contact-123",
    title: "Marie Chen — Sequoia",
    status: "active",
    summary: null,
  },
];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListConversationsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  // TODO: Implement real query
  // Sorted by updated_at DESC — most recent first (like ChatGPT sidebar)

  const response: ListConversationsResponse = {
    data: {
      items: MOCK_CONVERSATIONS,
      total: MOCK_CONVERSATIONS.length,
      page: parsed.data.page,
      per_page: parsed.data.per_page,
      has_more: false,
    },
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  // TODO: Implement real creation
  // Auto-generate title from contact name if contact_session type

  const newConversation: Conversation = {
    id: `conv-${Date.now()}`,
    user_id: "user-abc",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: parsed.data.type,
    contact_id: parsed.data.contact_id ?? null,
    title: parsed.data.title ?? "New conversation",
    status: "active",
    summary: null,
  };

  const response: CreateConversationResponse = {
    data: newConversation,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
