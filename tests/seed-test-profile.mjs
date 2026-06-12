/**
 * seed-test-profile.mjs — give the tester account a real profile_md + goals so
 * scoring/drafting/prep have context. (Test account = Liyang's own; content is
 * his real background. Normally profile_md is LLM-built from onboarding.)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function env(f){const o={};try{for(const l of readFileSync(join(ROOT,f),"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}}catch{}return o;}
const E={...env(".env.local")};
const SUPA=E.NEXT_PUBLIC_SUPABASE_URL, SVC=E.SUPABASE_SERVICE_ROLE_KEY;
const U="deed7f54-3c3c-40a9-bf20-2e17bc6192e0";

const profile_md = `## Who they are
Liyang Guo, a Chinese national based in Paris (Courbevoie). Trilingual: Mandarin (native), French (fluent), English (fluent).

## Education
- INSEAD MBA, Class of December 2026 (Fontainebleau). Member of the INSEAD AI Club and PE & VC Club.
- ESSEC Business School, Master in Strategy & Management of International Business (2016-2018).
- Tongji University, BBA (2012-2016).

## Career history
- 7 years at Monitor Deloitte (2018-2025): Consultant to Senior Consultant to Strategy Manager. Strategy consulting focused on pharma / life sciences: pricing strategy, market access, corporate strategy, and commercial due diligence.

## Their transition
Moving from strategy consulting (pharma/life-sciences) toward Private Equity / Venture Capital and AI product-building / commercial roles. Exploring investor-side roles and operator roles at AI companies.

## Why this person is interesting to talk to
Deep pharma commercial strategy expertise (pricing, market access, due diligence), a China-France-Europe bridge, and hands-on AI product building (vibe-codes tools with Claude Code). Strong on strategy, quantitative analysis, and interpersonal effectiveness.

## Networking hooks per recipient type
- For PE/VC contacts: 7 years of pharma commercial due-diligence and pricing strategy, plus a China angle, are directly relevant to healthcare/life-science investing.
- For AI / tech contacts: leads INSEAD AI Club activity and ships AI products himself; credible on AI commercial fluency.
- For fellow INSEAD alumni: INSEAD MBA 26D, Fontainebleau campus; shared classes and clubs.

## Their voice
Direct and concise. Gets to the point, results-oriented, warm but not effusive.`;

const goals = {
  target_industry: "AI / Tech, Private Equity & Venture Capital",
  target_role: "AI Product Manager / Investing (PE/VC)",
  target_geography: ["Paris", "Europe"],
  target_companies: ["Mistral", "Anthropic", "AI startups", "VC funds"],
  prior_industry: "Strategy Consulting (pharma / life sciences)",
  nationality: "Chinese",
  work_authorization: ["China", "France (student)"],
  insead_class: "MBA 26D",
};

const career_history = [
  { title: "Strategy Manager", company: "Monitor Deloitte", start_date: "2023", end_date: "2025", description: "Pharma/life-sciences strategy: pricing, market access, commercial due diligence." },
  { title: "Senior Consultant", company: "Monitor Deloitte", start_date: "2020", end_date: "2023", description: "Strategy consulting, pharma practice." },
  { title: "Consultant", company: "Monitor Deloitte", start_date: "2018", end_date: "2020", description: "Strategy consulting." },
];

const res = await fetch(`${SUPA}/rest/v1/users?id=eq.${U}`, {
  method: "PATCH",
  headers: { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json", prefer: "return=minimal" },
  body: JSON.stringify({ profile_md, goals, career_history }),
});
console.log(`seed profile: HTTP ${res.status}${res.ok ? " — done" : " — " + (await res.text()).slice(0,300)}`);
