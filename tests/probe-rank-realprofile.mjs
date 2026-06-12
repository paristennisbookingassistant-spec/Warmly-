/**
 * Faithful repro of /api/directory/rank with the REAL seeded profile + 8 REAL
 * directory candidates, to confirm MiniMax now returns valid ranking JSON.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function env(f){const o={};try{for(const l of readFileSync(join(ROOT,f),"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}}catch{}return o;}
const E={...env(".env.local"),...env(".env.vercel")};
const SUPA=E.NEXT_PUBLIC_SUPABASE_URL, SVC=E.SUPABASE_SERVICE_ROLE_KEY, KEY=E.MINIMAX_API_KEY;
const U="deed7f54-3c3c-40a9-bf20-2e17bc6192e0";
const h={apikey:SVC,authorization:`Bearer ${SVC}`};

const usr=(await (await fetch(`${SUPA}/rest/v1/users?id=eq.${U}&select=profile_md,goals,career_history,education`,{headers:h})).json())[0];
const profs=await (await fetch(`${SUPA}/rest/v1/directory_profiles?select=id,name,current_title,company,location,experience,education_v2&limit=8`,{headers:h})).json();

const SYS=`You rank networking candidates for a specific user. Compare candidates against EACH OTHER and the user's profile, return JSON only: {"rankings":[{"contact_id","rank","score","tier","reasoning","hook"}]}. reasoning = ONE specific sentence. tier 1=score>=7.5, 2=5-7.4, 3=<5. No code fences.`;

const blocks=[];
if (usr.profile_md) blocks.push(`## User identity\n${usr.profile_md.trim()}`);
blocks.push(`## User structured fields\nCareer: ${JSON.stringify(usr.career_history)}\nEducation: ${JSON.stringify(usr.education)}\nGoals: ${JSON.stringify(usr.goals)}`);
const cands=profs.map((p,i)=>{
  const career=(p.experience??[]).slice(0,3).map(e=>({title:e.title,company:e.company}));
  const edu=(p.education_v2??[]).slice(0,2).map(e=>({school:e.school,degree:e.degree}));
  return `### Candidate ${i+1} · contact_id="${p.id}"\nName: ${p.name}\nRole: ${p.current_title} at ${p.company}\nLocation: ${p.location}\nCareer: ${JSON.stringify(career)}\nEducation: ${JSON.stringify(edu)}`;
});
blocks.push(`## Candidates (${profs.length})\n${cands.join("\n\n")}`);
blocks.push(`## Task\nRank the top ${profs.length}. Return JSON only.`);
const prompt=blocks.join("\n\n");
console.log(`prompt chars: ${prompt.length}`);

const t=Date.now();
const res=await fetch("https://api.minimaxi.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:"MiniMax-M2.7-highspeed",messages:[{role:"system",content:SYS},{role:"user",content:prompt}],max_tokens:2500,temperature:0.3})});
const ms=Date.now()-t;
const j=await res.json();
let c=(j.choices?.[0]?.message?.content??"").replace(/<think>[\s\S]*?<\/think>/g,"").trim();
const m=c.match(/\{[\s\S]*\}/);
let ok=false,nRank=0; try{ if(m){const o=JSON.parse(m[0]); ok=Array.isArray(o.rankings); nRank=o.rankings?.length??0;} }catch{}
console.log(`${ms}ms | status ${res.status} | completion=${j.usage?.completion_tokens} | jsonParsed=${ok} | rankings=${nRank} | contentAfterThink=${c.length}chars`);
if (ok && nRank) console.log("sample:", JSON.stringify(JSON.parse(m[0]).rankings[0]));
else console.log("RAW (first 400):", c.slice(0,400));
