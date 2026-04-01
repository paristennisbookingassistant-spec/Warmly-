/**
 * POST /api/ai/search
 * Searches for company intelligence to inject into meeting prep prompts.
 * Results cached per company for 7 days. See PRD Section 5.4.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CompanySearchApiResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const CompanySearchSchema = z.object({
  company_name: z.string().min(1).max(200),
  since_date: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RESPONSE: CompanySearchApiResponse = {
  data: {
    company_name: "Sequoia Capital",
    snippets: [
      {
        title: "Sequoia SEA raises $2.85B for new fund",
        body: "Sequoia Capital India & Southeast Asia has closed a new $2.85 billion fund targeting early-stage investments across the region, with a particular focus on AI, fintech, and consumer technology in Indonesia and Vietnam.",
        source_url: "https://techcrunch.com/sequoia-sea-fund",
        published_date: "2023-10-15",
      },
      {
        title: "Sequoia promotes three to Partner in SEA team",
        body: "Sequoia Capital has promoted three principals to Partner roles across its India and Southeast Asia operations, reflecting the firm's growing commitment to the region.",
        published_date: "2024-01-22",
      },
    ],
    cached: false,
  },
  error: null,
};

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

  const parsed = CompanySearchSchema.safeParse(body);
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

  // TODO: Implement real search
  // const result = await searchCompanyIntel(parsed.data.company_name, parsed.data.since_date);
  // return NextResponse.json({ data: { ...result, cached: isCached }, error: null });

  return NextResponse.json({
    ...MOCK_RESPONSE,
    data: {
      ...MOCK_RESPONSE.data!,
      company_name: parsed.data.company_name,
    },
  });
}
