/**
 * POST /api/ai/generate
 * Generates an artifact (message, briefing, notes, etc.) for a contact.
 * Routes to Haiku or Sonnet based on artifact type.
 * See PRD Section 5.4.1 for model routing rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelTier } from "@/types/ai";
import type { GenerateArtifactResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ArtifactTypeEnum = z.enum([
  "connection_note",
  "outreach_draft",
  "meeting_prep",
  "meeting_notes",
  "action_plan",
  "follow_up_draft",
]);

const GenerateArtifactSchema = z.object({
  artifact_type: ArtifactTypeEnum,
  contact_id: z.string().uuid("contact_id must be a valid UUID"),
  conversation_id: z.string().uuid("conversation_id must be a valid UUID"),
  user_instructions: z.string().max(500).optional(),
  force_reasoning_model: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Mock content by artifact type
// ---------------------------------------------------------------------------

function getMockContent(artifactType: z.infer<typeof ArtifactTypeEnum>) {
  const mocks = {
    connection_note: {
      message:
        "Hi Marie, I came across your profile and was impressed by your transition from McKinsey to Sequoia. As a fellow INSEAD MBA targeting VC, I'd love to connect and learn from your experience. Would be great to connect!",
      hook: "shared INSEAD background + consulting-to-VC transition",
      char_count: 229,
    },
    outreach_draft: {
      message:
        "Hi Marie,\n\nI hope you're well. I came across your profile while researching PE/VC professionals who made the consulting-to-investment transition, and your journey from McKinsey to Sequoia particularly resonated with me.\n\nI'm currently an INSEAD MBA student (graduating 2026) with a background in [industry], and I'm targeting associate roles in VC/PE in Singapore or Hong Kong. I'd love to hear about your experience making that transition — specifically how you thought about positioning your consulting background for investment roles.\n\nWould you be open to a 20-minute call in the next few weeks?\n\nBest,\nLiyang",
      tone: "warm",
      hook: "shared INSEAD + consulting-to-VC transition path",
      channel: "linkedin_message",
      char_count: 673,
    },
    meeting_prep: {
      person_summary:
        "Marie Chen is VP of Investments at Sequoia Capital, based in Singapore. She made the transition from McKinsey Senior Associate to VC in 2022 after completing her MBA at INSEAD Fontainebleau campus — a path directly parallel to yours. At Sequoia, she focuses on Series A/B investments in Southeast Asia. She has 3 mutual connections with you through INSEAD.",
      company_intel: {
        description:
          "Sequoia Capital is one of the world's leading venture capital firms, with $85B+ AUM. Their Southeast Asia operation focuses on early-to-growth stage investments in technology companies across Singapore, Indonesia, India, and broader APAC.",
        recent_news: [
          {
            headline: "Sequoia India & SEA closed $2.85B fund for early-stage investments",
            date: "2023-10",
          },
          {
            headline: "Sequoia promoted three principals to Partner across India and SEA",
            date: "2024-01",
          },
        ],
        strategic_priorities: [
          "Deep tech and AI investments in SEA",
          "Consumer fintech in Indonesia and Vietnam",
          "Climate tech and sustainable infrastructure",
        ],
      },
      discussion_themes: [
        {
          name: "Her career transition",
          questions: [
            "How did you position your McKinsey experience when applying to VC roles? Did you lead with deal analysis or client work?",
            "What was the biggest knowledge gap you had to close when you moved from consulting to investing?",
            "If you were recruiting for your team today, what would you prioritize in a candidate from consulting?",
          ],
        },
        {
          name: "Sequoia's investment approach in SEA",
          questions: [
            "I saw Sequoia recently raised a new SEA fund — how is the deal pipeline looking in the current market?",
            "What sectors are you most excited about for the next 2-3 years in SEA?",
            "How do you think about sourcing deals in markets like Vietnam or Thailand where Sequoia's network is thinner?",
          ],
        },
      ],
      coaching: {
        do_list: [
          "Lead with specific knowledge of their recent fund announcement — shows you did your homework",
          "Ask about her team's deal flow and sectors — demonstrates genuine interest beyond just career advice",
          "Share a relevant insight or observation about the SEA market to demonstrate you're bringing value, not just extracting it",
        ],
        dont_list: [
          "Don't ask for a referral or job lead on the first call",
          "Don't spend more than 5 minutes on your background — you want to hear from her",
          "Don't ask generic questions like 'what does a day in VC look like'",
        ],
        positioning_advice:
          "Lead with your analytical background and deal exposure from consulting. Position the INSEAD MBA as a deliberate pivot toward investing, not a fallback. If you have any deal analysis work from MBA, reference it.",
        recommended_ask: "advice",
      },
    },
    meeting_notes: {
      key_takeaways: [
        "Marie transitioned by reaching out to Sequoia partners she met through INSEAD network",
        "She emphasized that Excel/financial modeling skills mattered less than intellectual curiosity about markets",
        "Sequoia's SEA team is growing — they're looking for candidates with strong operator networks in Indonesia",
        "She'll share Marie's LinkedIn post about their recent fund for reference",
      ],
      next_steps: [
        {
          description: "Send thank-you note referencing the Indonesian operator network insight",
          timing: "within 24 hours",
          completed: false,
        },
        {
          description: "Connect Marie with INSEAD classmate who has Gojek experience",
          timing: "in 1 week",
          completed: false,
        },
      ],
      user_raw_notes:
        "Great call! She said INSEAD network was key. Focus on operator network angle for SEA. Growing team. Follow up about Gojek connection.",
    },
    action_plan: {
      actions: [
        {
          description: "Send thank-you message referencing the Indonesian operator network discussion",
          timing: "within 24 hours",
          priority: "high",
          completed: false,
          draft: "Hi Marie, thank you so much for the call today. Your point about the importance of operator networks in Indonesia really reframed how I'm thinking about positioning myself. I'll reach out to my INSEAD classmate at Gojek as you suggested.",
        },
        {
          description: "Introduce Marie to INSEAD classmate with Gojek/Indonesian operator experience",
          timing: "in 1 week",
          priority: "medium",
          completed: false,
        },
        {
          description: "Follow up with an update on your deal analysis project from the finance club",
          timing: "in 3 weeks",
          priority: "low",
          completed: false,
        },
      ],
      coaching_note:
        "You are at the 'Met' stage with Marie. The goal now is to provide value before asking for anything. The Gojek introduction is a perfect way to be genuinely helpful. Don't ask about job openings for at least 2 more interactions.",
    },
    follow_up_draft: {
      message:
        "Hi Marie,\n\nThank you for taking the time to chat yesterday — I came away with a much clearer picture of how to position my consulting background for VC roles.\n\nYour point about the value of operator networks in Indonesia really resonated. I mentioned it to my INSEAD classmate Tom, who spent 3 years at Gojek — I think an intro between you two could be genuinely useful, if you're open to it.\n\nI'll be in touch as I make progress on the SE Asia market research you suggested.\n\nBest,\nLiyang",
      reference_to_meeting:
        "Tom's Gojek experience and the Indonesian operator network discussion",
      timing_suggestion: "within 24 hours of the call",
      channel: "linkedin_message",
      tone: "warm",
    },
  };

  return mocks[artifactType];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  const parsed = GenerateArtifactSchema.safeParse(body);
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

  // TODO: Implement real generation
  // const supabase = await getSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return unauthorized();
  // const [contact, conversation, userProfile] = await Promise.all([
  //   fetchContact(parsed.data.contact_id, user.id),
  //   fetchConversation(parsed.data.conversation_id, user.id),
  //   fetchUserProfile(user.id),
  // ]);
  // const companyIntel = artifactType === 'meeting_prep' ? await searchCompanyIntel(contact.company) : undefined;
  // const generationResult = await generateArtifact({ ...parsed.data, context: buildContext(...) });
  // const artifact = await createArtifact(user.id, contact.id, conversation.id, generationResult);

  const mockModel =
    parsed.data.artifact_type === "connection_note" ||
    parsed.data.artifact_type === "meeting_notes"
      ? ModelTier.FAST
      : ModelTier.REASONING;

  const mockArtifactId = `artifact-${Date.now()}`;

  const response: GenerateArtifactResponse = {
    data: {
      artifact_id: mockArtifactId,
      content: getMockContent(parsed.data.artifact_type),
      model_used: mockModel,
      tokens_input: 1250,
      tokens_output: 380,
    },
    error: null,
  };

  return NextResponse.json(response);
}
