/**
 * POST /api/discovery/extract
 *
 * Takes raw LinkedIn profile page text (main.innerText) and uses MiniMax LLM
 * to extract structured profile data. More reliable than rule-based parsing
 * because the LLM understands context (e.g. "On-site" is a work mode, not a title).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const InputSchema = z.object({
  pageText: z.string().min(50).max(50000),
  linkedinUrl: z.string().optional(),
});

const ExtractedProfileSchema = z.object({
  name: z.string(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  experiences: z.array(z.object({
    title: z.string(),
    company: z.string(),
    duration: z.string(),
  })),
  educations: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    dates: z.string().optional(),
  })),
});

const MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { pageText } = parsed.data;
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      console.error("[extract] MINIMAX_API_KEY not set");
      return NextResponse.json(
        { error: { message: "MINIMAX_API_KEY not configured" } },
        { status: 500 }
      );
    }

    const prompt = `Extract structured profile data from this LinkedIn profile page text. Return ONLY valid JSON, no other text.

Rules:
- For experiences: extract only actual job TITLES (e.g. "Chief Product Officer", "Software Engineer").
- IGNORE work mode labels (On-site, Remote, Hybrid), locations, descriptions, "more", "Show all".
- IGNORE company group headers that aren't job titles (e.g. if "Parloa" appears as a group with sub-roles, don't create a separate entry for "Parloa").
- For grouped roles at the same company, list each role separately with the same company name.
- Duration should include dates and length (e.g. "May 2025 - Present · 1 yr").
- For education: extract school name, degree/program, and dates.

Return this exact JSON structure:
{
  "name": "Person's full name",
  "headline": "Their headline/tagline or null",
  "location": "Their location or null",
  "experiences": [
    { "title": "Job Title", "company": "Company Name", "duration": "Date range" }
  ],
  "educations": [
    { "school": "School Name", "degree": "Degree/Program", "dates": "Date range" }
  ]
}

Profile text:
${pageText.slice(0, 8000)}`;

    console.log(`[extract] Calling MiniMax: ${pageText.length} chars input, Exp:${pageText.includes("Experience")}, Edu:${pageText.includes("Education")}`);

    // Call MiniMax with retry — the model sometimes spends all tokens on <think>
    // reasoning and returns empty content. A retry after a short delay usually works.
    let text = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await fetch(MINIMAX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error(`[extract] MiniMax API error ${response.status} (attempt ${attempt}):`, errBody);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return NextResponse.json(
          { error: { message: `MiniMax API error: ${response.status}`, detail: errBody } },
          { status: 500 }
        );
      }

      const result = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        base_resp?: { status_code?: number; status_msg?: string };
      };

      if (result.base_resp?.status_code && result.base_resp.status_code !== 0) {
        console.error("[extract] MiniMax error:", result.base_resp);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return NextResponse.json(
          { error: { message: `MiniMax error: ${result.base_resp.status_msg}` } },
          { status: 500 }
        );
      }

      text = result.choices?.[0]?.message?.content ?? "";
      text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      console.log(`[extract] MiniMax response attempt ${attempt} (${text.length} chars): ${text.slice(0, 300)}`);

      // If we got actual content, break out of retry loop
      if (text.length > 10) break;

      // Empty response — retry after delay
      if (attempt < 2) {
        console.warn(`[extract] Empty response on attempt ${attempt}, retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        error: { message: "Failed to parse LLM response", raw: text.slice(0, 500) },
      }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    const validated = ExtractedProfileSchema.safeParse(extracted);

    if (!validated.success) {
      return NextResponse.json({
        data: extracted,
        warning: "Zod validation failed, returning raw LLM output",
      });
    }

    return NextResponse.json({ data: validated.data });
  } catch (err) {
    console.error("[discovery/extract] Error:", err);
    return NextResponse.json(
      { error: { message: "Extraction failed", detail: String(err) } },
      { status: 500 }
    );
  }
}
