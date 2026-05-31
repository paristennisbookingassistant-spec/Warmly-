#!/usr/bin/env node
/**
 * tests/live-phase2.mjs — time-boxed live end-to-end test for the NEW deep
 * enrichment (SDUI rsc-action) path.
 *
 * Launches the real extension + seeded LinkedIn session, logs into Warmly,
 * triggers a sync, and polls the DB (Supabase REST, service role) for contacts
 * with experience/education populated. Confirms the FULL pipeline:
 *   content-script fetch+parse → SW → api-client → backend → DB.
 *
 * Also audits linkedin.com traffic: flags only FORBIDDEN writes (message,
 * invitation, post, etc.) — the rsc-action data POSTs are reads and allowed.
 *
 * Stops at TARGET enriched contacts or the time budget, whichever first.
 */
import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension", "dist");
const PROFILE = path.join(ROOT, ".playwright-profile");
const SHOTS = path.join(PROFILE, "live-shots");

const TARGET = 5;                 // stop after this many enriched contacts
const BUDGET_MS = 8 * 60 * 1000;  // hard time budget

function env(file) {
  const o = {}; try {
    for (const line of fs.readFileSync(path.join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {} return o;
}
const E = { ...env(".env.local"), ...env(".env.vercel"), ...env(".env.test") };
const BASE = (E.WARMLY_PROD_URL || "https://ai-networking-coach.vercel.app").replace(/\/$/, "");
const SUPA = E.NEXT_PUBLIC_SUPABASE_URL, SVC = E.SUPABASE_SERVICE_ROLE_KEY;
const USER = "deed7f54-3c3c-40a9-bf20-2e17bc6192e0";
const log = (...m) => console.error("[live]", ...m);

// forbidden = state-changing linkedin endpoints; rsc-action/graphql/voyager GETs are reads
const FORBIDDEN_RE = /\/(messaging|messages|invitation|connections\/invite|posts|shares|ugcPosts|reactions|comments|follow|embergraphql.*create)/i;

async function dbEnriched() {
  const url = `${SUPA}/rest/v1/contacts?user_id=eq.${USER}&select=name,company,current_title,location,experience,education_v2,linkedin_url&order=updated_at.desc`;
  const r = await fetch(url, { headers: { apikey: SVC, authorization: `Bearer ${SVC}` } });
  if (!r.ok) return { total: 0, withExp: 0, withEdu: 0, samples: [] };
  const rows = await r.json();
  const withExp = rows.filter((c) => Array.isArray(c.experience) && c.experience.length);
  const withEdu = rows.filter((c) => Array.isArray(c.education_v2) && c.education_v2.length);
  return { total: rows.length, withExp: withExp.length, withEdu: withEdu.length, samples: withExp.slice(0, 6) };
}

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  try { await page.screenshot({ path: path.join(SHOTS, `${Date.now()}-${name}.png`) }); } catch {}
}

async function main() {
  for (const f of ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try { fs.unlinkSync(path.join(PROFILE, f)); } catch {}
  }
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--window-position=-9999,-9999", "--window-size=1366,900"],
    ignoreDefaultArgs: ["--disable-extensions", "--disable-component-extensions-with-background-pages"],
  });

  const writes = [];
  const rscActions = { exp: 0, edu: 0 };
  ctx.on("request", (req) => {
    const u = req.url(), m = req.method();
    if (!u.includes("linkedin.com")) return;
    if (u.includes("rsc-action/actions/pagination")) {
      if (u.includes("experience")) rscActions.exp++;
      if (u.includes("education")) rscActions.edu++;
    }
    if (m !== "GET" && m !== "OPTIONS" && FORBIDDEN_RE.test(u)) writes.push({ m, u: u.slice(0, 140) });
  });

  const page = ctx.pages()[0] || await ctx.newPage();

  // login
  log("login to Warmly");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  if (page.url().includes("/login") && (await page.locator('input[type="email"]').count()) > 0) {
    await page.fill('input[type="email"]', E.TEST_USER_EMAIL);
    await page.fill('input[type="password"]', E.TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !location.pathname.includes("/login"), { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  log("at", new URL(page.url()).pathname);

  // open LinkedIn tab (sync orchestrator content-script lives here)
  const li = await ctx.newPage();
  await li.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await li.waitForTimeout(4000);
  log("linkedin:", li.url().includes("/feed") ? "authed" : `NOT authed (${li.url()})`);

  // trigger sync
  await page.bringToFront();
  await page.goto(`${BASE}/onboarding/connect-linkedin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, "connect");
  const btn = page.locator("button", { hasText: /Sync my network/i }).first();
  if (await btn.count() === 0) {
    log("NO 'Sync my network' button — card state:", (await page.evaluate(() => document.body.innerText)).slice(0, 300));
    await ctx.close(); process.exit(1);
  }
  await btn.click();
  const t0 = Date.now();
  log("sync triggered");

  // poll DB
  let last = { total: 0, withExp: 0, withEdu: 0, samples: [] };
  while (Date.now() - t0 < BUDGET_MS) {
    await page.waitForTimeout(15000);
    last = await dbEnriched();
    log(`t+${Math.round((Date.now() - t0) / 1000)}s · contacts=${last.total} · withExp=${last.withExp} · withEdu=${last.withEdu} · rscAction exp/edu=${rscActions.exp}/${rscActions.edu} · writes=${writes.length}`);
    if (last.withExp >= TARGET && last.withEdu >= 2) break;
  }

  console.log("\n===== ENRICHED SAMPLES =====");
  for (const c of last.samples) {
    console.log(`\n• ${c.name}  [${c.company || "-"} / ${c.current_title || "-"}]  loc=${c.location || "-"}`);
    (c.experience || []).slice(0, 3).forEach((e) => console.log(`    exp: ${e.title} @ ${e.company} ${JSON.stringify(e.dateRange)} ${e.location || ""}`));
    (c.education_v2 || []).slice(0, 3).forEach((e) => console.log(`    edu: ${e.school} — ${e.degree || "-"} ${JSON.stringify(e.dateRange)}`));
  }

  console.log("\n===== RESULT =====");
  console.log(JSON.stringify({
    contacts_total: last.total, with_experience: last.withExp, with_education: last.withEdu,
    rsc_action_calls: rscActions, forbidden_writes: writes.length, write_samples: writes.slice(0, 3),
    pass: last.withExp >= 3 && last.withEdu >= 1 && writes.length === 0,
  }, null, 2));

  await shot(page, "final");
  await ctx.close();
}
main().catch((e) => { console.error("[live] FATAL", e); process.exit(1); });
