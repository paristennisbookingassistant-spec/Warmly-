/**
 * POST /api/discovery/resolve-company
 *
 * Given a company name and LinkedIn search results text,
 * uses MiniMax LLM to pick the best matching company URL.
 *
 * Input:  { companyName: string, searchResultsText: string }
 * Output: { companyUrl: string | null, reasoning: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const InputSchema = z.object({
  companyName: z.string().min(1).max(200),
  searchResultsText: z.string().min(10).max(10000),
});

const MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { companyName, searchResultsText } = parsed.data;
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: "MINIMAX_API_KEY not configured" } },
        { status: 500 }
      );
    }

    const prompt = `I searched LinkedIn for the company "${companyName}". Below are the search results showing company names, descriptions, and URLs.

Pick the BEST matching company. Return ONLY a JSON object with:
- "url": the LinkedIn company URL (e.g. "https://www.linkedin.com/company/example/")
- "name": the company name as shown in results
- "reasoning": one sentence explaining why this is the right match

If none of the results match "${companyName}", return {"url": null, "name": null, "reasoning": "No matching company found"}.

Search results:
${searchResultsText}`;

    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(`[resolve-company] MiniMax API error ${response.status}:`, errBody);
      return NextResponse.json(
        { error: { message: `MiniMax API error: ${response.status}` } },
        { status: 500 }
      );
    }

    const result = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      base_resp?: { status_code?: number; status_msg?: string };
    };

    if (result.base_resp?.status_code && result.base_resp.status_code !== 0) {
      console.error("[resolve-company] MiniMax error:", result.base_resp);
      return NextResponse.json(
        { error: { message: `MiniMax error: ${result.base_resp.status_msg}` } },
        { status: 500 }
      );
    }

    let text = result.choices?.[0]?.message?.content ?? "";
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        data: { companyUrl: null, companyName: null, reasoning: "Failed to parse LLM response" },
      });
    }

    const parsed2 = JSON.parse(jsonMatch[0]) as {
      url: string | null;
      name: string | null;
      reasoning: string;
    };

    return NextResponse.json({
      data: {
        companyUrl: parsed2.url,
        companyName: parsed2.name,
        reasoning: parsed2.reasoning,
      },
    });
  } catch (err) {
    console.error("[resolve-company] Error:", err);
    return NextResponse.json(
      { error: { message: "Failed to resolve company" } },
      { status: 500 }
    );
  }
}
