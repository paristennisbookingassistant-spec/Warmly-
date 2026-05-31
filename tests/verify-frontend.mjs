/** Verify the contact detail view renders synced experience + education.
 * Picks an enriched contact from the DB, opens its detail page in the local dev
 * app, and checks the rendered DOM. */
import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROFILE = path.join(ROOT, ".playwright-profile");
const SHOTS = path.join(PROFILE, "fe-shots");
function env(f){const o={};try{for(const l of fs.readFileSync(path.join(ROOT,f),"utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}}catch{}return o;}
const E={...env(".env.local"),...env(".env.vercel"),...env(".env.test")};
const SUPA=E.NEXT_PUBLIC_SUPABASE_URL,SVC=E.SUPABASE_SERVICE_ROLE_KEY,USER="deed7f54-3c3c-40a9-bf20-2e17bc6192e0";
const APP="http://localhost:3000";

// 1) pick an enriched contact (experience not null) with a known name
const r = await fetch(`${SUPA}/rest/v1/contacts?user_id=eq.${USER}&experience=not.is.null&select=id,name,company,experience,education_v2&limit=5`,{headers:{apikey:SVC,authorization:`Bearer ${SVC}`}});
const rows = await r.json();
if (!rows.length) { console.log("no enriched contacts found"); process.exit(1); }
const c = rows.find((x)=>Array.isArray(x.education_v2)&&x.education_v2.length) || rows[0];
const expTitle = c.experience[0]?.title || "";
const expCompany = c.experience[0]?.company || "";
const eduSchool = (c.education_v2&&c.education_v2[0]?.school) || "";
console.log(`target contact: ${c.name} (${c.id})`);
console.log(`  expect exp: "${expTitle}" @ "${expCompany}"  edu: "${eduSchool}"`);

for (const f of ["lockfile","SingletonLock","SingletonCookie","SingletonSocket"]) { try { fs.unlinkSync(path.join(PROFILE,f)); } catch {} }
const ctx = await chromium.launchPersistentContext(PROFILE, { headless:false, viewport:{width:1366,height:900}, args:["--window-position=-9999,-9999","--window-size=1366,900"] });
const page = ctx.pages()[0] || await ctx.newPage();
try {
  await page.goto(`${APP}/login`, { waitUntil:"domcontentloaded", timeout:30000 });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login") && await page.locator('input[type="email"]').count()>0) {
    await page.fill('input[type="email"]', E.TEST_USER_EMAIL);
    await page.fill('input[type="password"]', E.TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(()=>!location.pathname.includes("/login"),{timeout:25000}).catch(()=>{});
    await page.waitForTimeout(1500);
  }
  await page.goto(`${APP}/contacts/${c.id}`, { waitUntil:"domcontentloaded", timeout:30000 });
  await page.waitForTimeout(2500);
  // Tester account may land on onboarding — skip it, then retry.
  if (page.url().includes("/onboarding")) {
    const skip = page.locator('text=/Skip for now/i').first();
    if (await skip.count()>0) { await skip.click().catch(()=>{}); await page.waitForTimeout(1500); }
    await page.goto(`${APP}/contacts/${c.id}`, { waitUntil:"domcontentloaded", timeout:30000 });
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3000); // allow loadContactDetail
  console.log("final url:", page.url());
  fs.mkdirSync(SHOTS,{recursive:true});
  await page.screenshot({ path: path.join(SHOTS, "contact-detail.png"), fullPage:true });
  const body = await page.evaluate(()=>document.body.innerText);
  const has = (s)=> s && body.includes(s);
  console.log("\n=== RENDER CHECK ===");
  console.log("  'Career path' heading:", body.includes("Career path"));
  console.log("  exp title rendered   :", has(expTitle));
  console.log("  exp company rendered :", has(expCompany));
  console.log("  'Education' heading  :", body.includes("Education"));
  console.log("  edu school rendered  :", has(eduSchool));
  const pass = body.includes("Career path") && has(expTitle) && has(expCompany) && (!eduSchool || (body.includes("Education")&&has(eduSchool)));
  console.log("\nRESULT:", pass ? "PASS ✅" : "FAIL ❌");
  console.log("screenshot:", path.join(SHOTS,"contact-detail.png"));
} catch(e){ console.error("ERR",e); } finally { await ctx.close(); }
