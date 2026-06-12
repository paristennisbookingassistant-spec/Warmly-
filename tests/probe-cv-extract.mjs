import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function env(f){const o={};try{for(const l of readFileSync(join(ROOT,f),"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}}catch{}return o;}
const E={...env(".env.local"),...env(".env.vercel")};
const cv=readFileSync(join(ROOT,"tests/fixtures/sample-cv.txt"),"utf8");
const sys=`Extract ONLY fields explicitly present in this CV into JSON. If absent, use null (or [] for arrays). NEVER invent. Return JSON only: {"prior_industry","prior_function","nationality","work_authorization":[],"insead_class","target_industry","target_role","target_companies":[],"target_geography":[]}`;
const t=Date.now();
const r=await fetch("https://api.minimaxi.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${E.MINIMAX_API_KEY}`},body:JSON.stringify({model:"MiniMax-M2.7-highspeed",messages:[{role:"system",content:sys},{role:"user",content:cv}],max_tokens:1200,temperature:0.2})});
const j=await r.json(); let c=(j.choices?.[0]?.message?.content??"").replace(/<think>[\s\S]*?<\/think>/g,"").trim();
const m=c.match(/\{[\s\S]*\}/); console.log(`${Date.now()-t}ms status ${r.status}`);
console.log(m?JSON.stringify(JSON.parse(m[0]),null,1):"NO JSON: "+c.slice(0,300));
