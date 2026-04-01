/**
 * lib/api/helpers.ts
 * Shared helpers for API route handlers.
 * Provides typed error responses, auth checks, and common patterns.
 */

import { NextResponse } from "next/server";
import type { ApiError } from "@/types/api";

// ---------------------------------------------------------------------------
// Standard error response builders
// ---------------------------------------------------------------------------

export function unauthorized(): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "UNAUTHORIZED", message: "Authentication required" },
  };
  return NextResponse.json(body, { status: 401 });
}

export function notFound(resource = "Resource"): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "NOT_FOUND", message: `${resource} not found` },
  };
  return NextResponse.json(body, { status: 404 });
}

export function forbidden(): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "FORBIDDEN", message: "Access denied" },
  };
  return NextResponse.json(body, { status: 403 });
}

export function validationError(
  message: string,
  fieldErrors?: Record<string, string[]>
): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "VALIDATION_ERROR", message, field_errors: fieldErrors },
  };
  return NextResponse.json(body, { status: 400 });
}

export function badRequest(message: string): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "BAD_REQUEST", message },
  };
  return NextResponse.json(body, { status: 400 });
}

export function internalError(message = "Internal server error"): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "INTERNAL_ERROR", message },
  };
  return NextResponse.json(body, { status: 500 });
}

export function rateLimitError(message: string): NextResponse {
  const body: ApiError = {
    data: null,
    error: { code: "RATE_LIMIT_EXCEEDED", message },
  };
  return NextResponse.json(body, { status: 429 });
}

// ---------------------------------------------------------------------------
// JSON body parser with error handling
// ---------------------------------------------------------------------------

export async function parseJsonBody(
  request: Request
): Promise<{ data: unknown; error: NextResponse | null }> {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: badRequest("Request body must be valid JSON"),
    };
  }
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number
) {
  return {
    items,
    total,
    page,
    per_page: perPage,
    has_more: page * perPage < total,
  };
}

// ---------------------------------------------------------------------------
// AI call logger — logs model used, tokens consumed, latency for cost monitoring
// ---------------------------------------------------------------------------

export function logAiCall(params: {
  route: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
}) {
  const inputCostPer1M = params.model.includes("haiku") ? 0.25 : 3.0;
  const outputCostPer1M = params.model.includes("haiku") ? 1.25 : 15.0;
  const estimatedCost =
    (params.tokensInput / 1_000_000) * inputCostPer1M +
    (params.tokensOutput / 1_000_000) * outputCostPer1M;

  console.log(
    JSON.stringify({
      type: "ai_call",
      route: params.route,
      model: params.model,
      tokens_input: params.tokensInput,
      tokens_output: params.tokensOutput,
      latency_ms: params.latencyMs,
      estimated_cost_usd: estimatedCost.toFixed(6),
      timestamp: new Date().toISOString(),
    })
  );
}
