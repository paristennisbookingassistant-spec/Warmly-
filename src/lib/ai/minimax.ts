/**
 * ai/minimax.ts
 * MiniMax LLM client — replaces Anthropic for all AI calls.
 * Uses MiniMax M2.7-highspeed via OpenAI-compatible API.
 */

const MINIMAX_API_URL = "https://api.minimaxi.com/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

export interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MiniMaxResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Calls MiniMax M2.7-highspeed and returns the text response.
 * Strips <think> reasoning tags automatically.
 */
export async function callMiniMax(
  messages: MiniMaxMessage[],
  options: { maxTokens?: number; temperature?: number; systemPrompt?: string } = {}
): Promise<MiniMaxResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY not configured");
  }

  const allMessages: MiniMaxMessage[] = [];
  if (options.systemPrompt) {
    allMessages.push({ role: "system", content: options.systemPrompt });
  }
  allMessages.push(...messages);

  const response = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: allMessages,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`MiniMax API error ${response.status}: ${errBody}`);
  }

  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    base_resp?: { status_code?: number; status_msg?: string };
  };

  if (result.base_resp?.status_code && result.base_resp.status_code !== 0) {
    throw new Error(`MiniMax error: ${result.base_resp.status_msg}`);
  }

  let content = result.choices?.[0]?.message?.content ?? "";
  // Strip <think> reasoning tags
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  return {
    content,
    usage: result.usage,
  };
}
