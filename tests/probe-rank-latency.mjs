/**
 * probe-rank-latency.mjs — measure MiniMax latency for a realistic deck-rank
 * call (8 trimmed candidates), to decide the client timeout / batch size.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function env(f) { const o = {}; try { for (const l of readFileSync(join(ROOT, f), "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); } } catch {} return o; }
const E = { ...env(".env.local"), ...env(".env.vercel") };
const KEY = E.MINIMAX_API_KEY;

const sys = `You rank networking candidates for a user. Compare candidates against each other and the user's profile, return JSON {"rankings":[{"contact_id","rank","score","tier","reasoning","hook"}]}.`;
const cands = Array.from({ length: 8 }, (_, i) =>
  `### Candidate ${i + 1} · contact_id="id-${i}"\nName: Person ${i}\nCurrent role: Manager at Company ${i}\nLocation: Paris\nCareer: [{"title":"Manager","company":"Co${i}"},{"title":"Analyst","company":"Bank"}]\nEducation: [{"school":"INSEAD","degree":"MBA"}]`
).join("\n\n");
const user = `## User\nLiyang Guo, ex-consulting, targeting AI Product roles in Paris.\n\n## Candidates (8)\n${cands}\n\n## Task\nRank the top 8. Return JSON.`;

async function timeCall(maxTokens) {
  const t = Date.now();
  const res = await fetch("https://api.minimaxi.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: "MiniMax-M2.7-highspeed", messages: [{ role: "system", content: sys }, { role: "user", content: user }], max_tokens: maxTokens, temperature: 0.4 }),
  });
  const ms = Date.now() - t;
  const j = await res.json();
  const content = j.choices?.[0]?.message?.content ?? "";
  const think = (content.match(/<think>[\s\S]*?<\/think>/) || [""])[0].length;
  return { ms, status: res.status, total: j.usage?.total_tokens, completion: j.usage?.completion_tokens, thinkChars: think, len: content.length };
}

for (const mt of [4000, 1500]) {
  try {
    const r = await timeCall(mt);
    console.log(`max_tokens=${mt}: ${r.ms}ms | status ${r.status} | completion=${r.completion} tok | think=${r.thinkChars} chars | content=${r.len} chars`);
  } catch (e) { console.log(`max_tokens=${mt}: ERROR ${e.message}`); }
}
