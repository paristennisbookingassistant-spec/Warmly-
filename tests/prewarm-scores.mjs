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
// goal-filtered first 8 by name (matches what the deck scores)
const ind=encodeURIComponent('{Tech,"Tech / AI","Venture Capital","Private Equity"}');
const profs=await (await fetch(`${SUPA}/rest/v1/directory_profiles?industries=ov.${ind}&select=id,name,current_title,company,location,experience,education_v2&order=name.asc&limit=8`,{headers:h})).json();
console.log("scoring", profs.length, "profiles:", profs.map(p=>p.name).join(", "));
const SYS=`You rank networking candidates for a user. Compare against each other + the user's profile. Return JSON only {"rankings":[{"contact_id","rank","score","tier","reasoning","hook"}]}. reasoning=ONE specific sentence. tier 1=score>=7.5,2=5-7.4,3=<5.`;
const blocks=[`## User\n${usr.profile_md}`,`## Goals\n${JSON.stringify(usr.goals)}`];
blocks.push("## Candidates\n"+profs.map((p,i)=>`### contact_id="${p.id}" — ${p.name}, ${p.current_title} at ${p.company}, ${p.location}; career=${JSON.stringify((p.experience||[]).slice(0,3).map(e=>({t:e.title,c:e.company})))}; edu=${JSON.stringify((p.education_v2||[]).slice(0,2).map(e=>({s:e.school})))}`).join("\n"));
blocks.push("Rank all. JSON only.");
const r=await fetch("https://api.minimaxi.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:"MiniMax-M2.7-highspeed",messages:[{role:"system",content:SYS},{role:"user",content:blocks.join("\n\n")}],max_tokens:2500,temperature:0.3})});
let c=(await r.json()).choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g,"").trim()??"";
const m=c.match(/\{[\s\S]*\}/); const rk=m?JSON.parse(m[0]).rankings:[];
console.log("got", rk.length, "rankings");
const rows=rk.map(x=>({user_id:U,directory_profile_id:x.contact_id,score:x.score,tier:x.tier,reasoning:x.reasoning,hook:x.hook,scored_at:new Date().toISOString()}));
const up=await fetch(`${SUPA}/rest/v1/directory_scores?on_conflict=user_id,directory_profile_id`,{method:"POST",headers:{...h,"content-type":"application/json",prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
console.log("cache upsert:", up.status, "| cached", rows.length, "scores; sample:", rk[0]?.reasoning?.slice(0,90));
