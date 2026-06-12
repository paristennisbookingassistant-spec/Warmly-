/**
 * POST /api/onboarding/parse-cv
 *
 * Accepts a multipart form upload of a CV/cover-letter/assessment file,
 * extracts plain text, and (for CVs) runs a structured field extraction
 * via MiniMax to pre-fill the onboarding review form.
 *
 * Supported formats: PDF, DOCX, TXT / plain text.
 * Max file size: 8 MB.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { callMiniMax } from "@/lib/ai/minimax";
import {
  unauthorized,
  badRequest,
  internalError,
  logAiCall,
} from "@/lib/api/helpers";
import type { ParseCvResponse, ExtractedFields } from "@/types/onboarding";

// Allow up to 60 s — PDF parse + MiniMax call can be slow on cold starts.
export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
/** Chars sent to the AI — keeps the prompt well under the model context limit */
const MAX_AI_TEXT_CHARS = 20_000;

const KindSchema = z.enum(["cv", "cover_letter", "assessment"]).default("cv");
type Kind = z.infer<typeof KindSchema>;

// ---------------------------------------------------------------------------
// MIME / extension helpers
// ---------------------------------------------------------------------------

type FileFormat = "pdf" | "docx" | "text";

function detectFormat(file: File): FileFormat | null {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "text";

  return null;
}

// ---------------------------------------------------------------------------
// Text extractors
// ---------------------------------------------------------------------------

async function extractFromPdf(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const pdf = await getDocumentProxy(uint8);
  const result = await extractText(pdf, { mergePages: true });
  return result.text;
}

async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractText(file: File, format: FileFormat): Promise<string> {
  switch (format) {
    case "pdf":
      return extractFromPdf(file);
    case "docx":
      return extractFromDocx(file);
    case "text":
      return file.text();
  }
}

// ---------------------------------------------------------------------------
// AI field extraction
// ---------------------------------------------------------------------------

const CV_EXTRACTION_SYSTEM_PROMPT = `You are a structured data extractor. The user will provide the text of a CV/resume.

Your task: extract ONLY information that is explicitly stated in the CV. NEVER invent, infer, or guess any value.

Return a single JSON object with exactly these keys:
{
  "prior_industry": string | null,
  "prior_function": string | null,
  "nationality": string | null,
  "work_authorization": string[],
  "insead_class": string | null,
  "target_industry": string | null,
  "target_role": string | null,
  "target_companies": string[],
  "target_geography": string[]
}

Rules:
- If a field is not present in the CV, set it to null (or [] for arrays).
- "prior_industry": the primary industry the candidate has worked in (e.g. "Management Consulting", "Pharma/Life Sciences").
- "prior_function": the primary functional discipline (e.g. "Strategy", "Finance", "Operations").
- "nationality": nationality as stated (e.g. "French", "Chinese").
- "work_authorization": list of regions/countries where they are authorised to work, if stated.
- "insead_class": INSEAD cohort if mentioned (e.g. "December 2026").
- "target_industry": target industry they are seeking to enter, if stated.
- "target_role": target role or function they want, if stated.
- "target_companies": list of companies they explicitly mention as targets.
- "target_geography": target geographic regions or countries, if stated.

Return JSON only — no prose, no markdown fences, no explanation.`;

async function extractCvFields(
  text: string
): Promise<{ fields: ExtractedFields | null; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined }> {
  const truncated = text.slice(0, MAX_AI_TEXT_CHARS);

  const response = await callMiniMax(
    [{ role: "user", content: truncated }],
    {
      systemPrompt: CV_EXTRACTION_SYSTEM_PROMPT,
      maxTokens: 1200,
      temperature: 0.2,
    }
  );

  const raw = response.content;

  // Strip code fences if present, then find the JSON object
  const stripped = raw.replace(/```(?:json)?/gi, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn("[parse-cv] AI response did not contain a JSON object:", raw.slice(0, 200));
    return { fields: null, usage: response.usage };
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const fields: ExtractedFields = {
      prior_industry: typeof parsed.prior_industry === "string" ? parsed.prior_industry : null,
      prior_function: typeof parsed.prior_function === "string" ? parsed.prior_function : null,
      nationality: typeof parsed.nationality === "string" ? parsed.nationality : null,
      work_authorization: Array.isArray(parsed.work_authorization)
        ? (parsed.work_authorization as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
      insead_class: typeof parsed.insead_class === "string" ? parsed.insead_class : null,
      target_industry: typeof parsed.target_industry === "string" ? parsed.target_industry : null,
      target_role: typeof parsed.target_role === "string" ? parsed.target_role : null,
      target_companies: Array.isArray(parsed.target_companies)
        ? (parsed.target_companies as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
      target_geography: Array.isArray(parsed.target_geography)
        ? (parsed.target_geography as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
    };

    return { fields, usage: response.usage };
  } catch (err) {
    console.warn("[parse-cv] JSON.parse failed on AI output:", err);
    return { fields: null, usage: response.usage };
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Parse multipart form
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Could not parse multipart form data");
  }

  const fileEntry = form.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return badRequest("A file must be provided via the 'file' field");
  }
  const file = fileEntry as File;

  // Validate size
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FILE_TOO_LARGE",
          message: `File exceeds the 8 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        },
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return badRequest("File is empty");
  }

  // Validate kind via Zod (defaults to "cv" when omitted or unrecognised)
  const rawKind = form.get("kind");
  const kindParsed = KindSchema.safeParse(
    rawKind && typeof rawKind === "string" ? rawKind : undefined
  );
  const kind: Kind = kindParsed.success ? kindParsed.data : "cv";

  // Detect format
  const format = detectFormat(file);
  if (!format) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "UNSUPPORTED_FILE_TYPE",
          message:
            `Unsupported file type '${file.type || file.name}'. ` +
            "Please upload a PDF (.pdf), Word document (.docx), or plain text (.txt) file.",
        },
      },
      { status: 415 }
    );
  }

  // Extract text
  let text: string;
  try {
    text = await extractText(file, format);
  } catch (err) {
    console.error("[parse-cv] Text extraction failed:", err);
    return internalError("Could not extract text from the uploaded file");
  }

  if (!text.trim()) {
    return badRequest("The uploaded file appears to be empty or could not be read");
  }

  // For CVs: run structured extraction
  let fields: ExtractedFields | null = null;

  if (kind === "cv") {
    const start = Date.now();
    try {
      const result = await extractCvFields(text);
      fields = result.fields;

      logAiCall({
        route: "POST /api/onboarding/parse-cv",
        model: "MiniMax-M2.7-highspeed",
        tokensInput: result.usage?.prompt_tokens ?? 0,
        tokensOutput: result.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - start,
      });
    } catch (err) {
      // Non-fatal: log and continue — the text is still returned
      console.error("[parse-cv] MiniMax extraction failed:", err);
      fields = null;
    }
  }

  const response: ParseCvResponse = {
    data: {
      // Truncate the returned text to match what the AI saw — avoids
      // sending enormous blobs back to the client unnecessarily.
      text: text.slice(0, MAX_AI_TEXT_CHARS),
      fields,
    },
    error: null,
  };

  return NextResponse.json(response);
}
