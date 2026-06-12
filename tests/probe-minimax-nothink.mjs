/**
 * probe-minimax-nothink.mjs — try to make MiniMax-M2.7 answer FAST (no <think>).
 * Tests candidate ways to disable reasoning + measures latency + JSON validity.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function env(f){const o={};try{for(const l of readFileSync(join(ROOT,f),"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}}catch{}return o;}
const E={...env(".env.local"),...env(".env.vercel")};
const KEY=E.MINIMAX_API_KEY;

const sys=`You rank networking candidates. Return ONLY compact JSON {"rankings":[{"contact_id","rank","score","tier","reasoning","hook"}]} — no analysis, no preamble.`;
const cands=Array.from({length:8},(_,i)=>`#${i+1} contact_id="id-${i}": Manager at Co${i}, Paris, INSEAD MBA, ex-consulting`).join("\n");
const user=`User: Liyang, ex-consulting → AI Product in Paris.\nCandidates:\n${cands}\nRank all 8. JSON only.`;

async function call(label, extra) {
  const t=Date.now();
  try{
    const res=await fetch("https://api.minimaxi.com/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`},
      body:JSON.stringify({model:"MiniMax-M2.7-highspeed",messages:[{role:"system",content:sys},{role:"user",content:user}],max_tokens:2000,temperature:0.3,...extra}),
    });
    const ms=Date.now()-t;
    const j=await res.json();
    const c=j.choices?.[0]?.message?.content??"";
    const hasThink=/<think>/.test(c);
    const jsonOk=/\{[\s\S]*"rankings"[\s\S]*\}/.test(c.replace(/<think>[\s\S]*?<\/think>/g,""));
    console.log(`${label}: ${ms}ms | status ${res.status} | think=${hasThink} | jsonOk=${jsonOk} | completion=${j.usage?.completion_tokens} | err=${j.base_resp?.status_msg??"-"}`);
  }catch(e){console.log(`${label}: ERROR ${e.message} (${Date.now()-t}ms)`);}
}

await call("baseline", {});
await call("reasoning.effort=minimal", { reasoning: { effort: "minimal" } });
await call("reasoning_effort=low", { reasoning_effort: "low" });
await call("thinking=false", { thinking: false });
await call("enable_thinking=false", { enable_thinking: false });
await call("chat_template_kwargs.enable_thinking=false", { chat_template_kwargs: { enable_thinking: false } });
