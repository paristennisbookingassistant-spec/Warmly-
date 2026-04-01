/**
 * GET  /api/conversations/[id]/messages  — List messages in a conversation
 * POST /api/conversations/[id]/messages  — Send a message and get agent response
 *
 * The POST handler is the primary AI interaction endpoint. It:
 * 1. Saves the user message
 * 2. Loads context (contact profile, summary, recent messages)
 * 3. Calls the coaching AI (Sonnet/Haiku based on content)
 * 4. Detects artifact triggers and generates artifacts if needed
 * 5. Returns both the agent message and any created artifacts
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  ListMessagesResponse,
  SendMessageResponse,
} from "@/types/api";
import type { ConversationMessage, Artifact } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
  after_id: z.string().uuid().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_MESSAGES: ConversationMessage[] = [
  {
    id: "msg-1",
    conversation_id: "conv-contact-1",
    created_at: "2026-04-01T10:00:00Z",
    role: "agent",
    content:
      "Marie Chen is a VP at Sequoia Capital, INSEAD '22. She transitioned from McKinsey — exactly the path you are targeting. She is active on LinkedIn and recently posted about deal sourcing in SE Asia. What would you like to work on first?",
    artifacts_generated: [],
  },
  {
    id: "msg-2",
    conversation_id: "conv-contact-1",
    created_at: "2026-04-01T10:01:00Z",
    role: "user",
    content: "Draft a connection note for her.",
    artifacts_generated: [],
  },
  {
    id: "msg-3",
    conversation_id: "conv-contact-1",
    created_at: "2026-04-01T10:01:30Z",
    role: "agent",
    content:
      "I have drafted a LinkedIn connection note for Marie. It leads with your shared INSEAD background and her consulting-to-VC transition. The draft is 229 characters (within LinkedIn's 300-char limit). Take a look and let me know if you'd like any changes.",
    artifacts_generated: ["artifact-456"],
  },
];

const MOCK_AGENT_RESPONSE = "That is a great question. Based on Marie's background and your goals, I would suggest leading with the INSEAD connection. She made the same consulting-to-VC transition you are targeting, so she will likely be receptive to a peer outreach. Would you like me to draft a connection note or a longer outreach message?";

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
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: conversationId } = await params;
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListMessagesQuerySchema.safeParse(rawQuery);
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

  // TODO: Fetch real messages from DB
  // Sorted by created_at ASC (oldest first for display)
  // Apply cursor-based pagination if after_id provided

  const messages = MOCK_MESSAGES.map((m) => ({
    ...m,
    conversation_id: conversationId,
  }));

  const response: ListMessagesResponse = {
    data: {
      items: messages,
      total: messages.length,
      page: parsed.data.page,
      per_page: parsed.data.per_page,
      has_more: false,
    },
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: conversationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = SendMessageSchema.safeParse(body);
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

  // TODO: Implement real message handling
  // 1. Load conversation, verify ownership
  // 2. Load context (contact if contact_session, recent messages, summary)
  // 3. Check if rolling summarization is needed (>15 messages)
  // 4. Call processCoachingMessage() from lib/ai/coaching.ts
  // 5. Detect artifact trigger → call generateArtifact() if triggered
  // 6. Save user message, agent message, and any artifacts
  // 7. Update conversation.updated_at

  const now = new Date().toISOString();

  const userMessage: ConversationMessage = {
    id: `msg-${Date.now()}-user`,
    conversation_id: conversationId,
    created_at: now,
    role: "user",
    content: parsed.data.content,
    artifacts_generated: [],
  };

  // Detect if this message triggers an artifact (simplified for mock)
  const triggerArtifact = parsed.data.content
    .toLowerCase()
    .includes("connection note");
  const mockArtifactId = triggerArtifact ? `artifact-${Date.now()}` : null;

  const agentMessage: ConversationMessage = {
    id: `msg-${Date.now()}-agent`,
    conversation_id: conversationId,
    created_at: new Date(Date.now() + 100).toISOString(),
    role: "agent",
    content: MOCK_AGENT_RESPONSE,
    artifacts_generated: mockArtifactId ? [mockArtifactId] : [],
  };

  // Mock artifact if triggered
  const artifactsCreated: Artifact[] = mockArtifactId
    ? [
        {
          id: mockArtifactId,
          user_id: "user-abc",
          contact_id: "contact-123",
          conversation_id: conversationId,
          created_at: now,
          updated_at: now,
          type: "connection_note",
          content: {
            message:
              "Hi Marie, I came across your profile and was impressed by your transition from McKinsey to Sequoia. As a fellow INSEAD MBA targeting VC, I would love to connect.",
            hook: "shared INSEAD background",
            char_count: 194,
          },
          status: "draft",
          version: 1,
          artifact_outcome: null,
          user_edit_distance: null,
          metadata: { hook_used: "shared_alma_mater" },
        },
      ]
    : [];

  const response: SendMessageResponse = {
    data: {
      user_message: userMessage,
      agent_message: agentMessage,
      artifacts_created: artifactsCreated,
    },
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
