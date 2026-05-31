#!/usr/bin/env node
/**
 * tests/timed-sync-50.mjs — bounded, timed, instrumented sync of N contacts
 * through the REAL extension pipeline. Measures Phase 1 + Phase 2 timing and
 * surfaces bugs (parse misses, HTTP errors, missing exp/edu, skips).
 *
 * Sets chrome.storage.local.warmly_sync_test_max = N via the extension service
 * worker, triggers the sync, captures the LinkedIn-tab console, and polls the DB
 * (Supabase REST, service role) until the sync completes or the budget elapses.
 */
import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension", "dist");
const PROFILE = path.join(ROOT, ".playwright-profile");
const SHOTS = path.join(PROFILE, "timed-shots");

const N = Number(process.argv[2] || 50);
const BUDGET_MS = 22 * 60 * 1000;

function env(file) { const o = {}; try { for (const l of fs.readFileSync(path.join(ROOT, file), "utf8").split("\n")) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); } } catch {} return o; }
const E = { ...env(".env.local"), ...env(".env.vercel"), ...env(".env.test") };
const BASE = (process.env.WARMLY_BASE_URL || E.WARMLY_PROD_URL || "https://ai-networking-coach.vercel.app").replace(/\/$/, "");
const SUPA = E.NEXT_PUBLIC_SUPABASE_URL, SVC = E.SUPABASE_SERVICE_ROLE_KEY;
const USER = "deed7f54-3c3c-40a9-bf20-2e17bc6192e0";
const log = (...m) => console.error("[timed]", ...m);
const fmt = (ms) => `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}s`;

async function db() {
  const url = `${SUPA}/rest/v1/contacts?user_id=eq.${USER}&select=name,company,current_title,location,experience,education_v2,linkedin_url&order=updated_at.desc`;
  const r = await fetch(url, { headers: { apikey: SVC, authorization: `Bearer ${SVC}` } });
  if (!r.ok) return { total: 0, withExp: 0, withEdu: 0, rows: [] };
  const rows = await r.json();
  return {
    total: rows.length,
    withExp: rows.filter((c) => Array.isArray(c.experience) && c.experience.length).length,
    withEdu: rows.filter((c) => Array.isArray(c.education_v2) && c.education_v2.length).length,
    rows,
  };
}
async function shot(page, name) { fs.mkdirSync(SHOTS, { recursive: true }); try { await page.screenshot({ path: path.join(SHOTS, `${Date.now()}-${name}.png`) }); } catch {} }

async function main() {
  for (const f of ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket"]) { try { fs.unlinkSync(path.join(PROFILE, f)); } catch {} }
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, viewport: { width: 1366, height: 900 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--window-position=-9999,-9999", "--window-size=1366,900"],
    ignoreDefaultArgs: ["--disable-extensions", "--disable-component-extensions-with-background-pages"],
  });

  // --- set the test cap via the extension service worker ---
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => null);
  if (!sw) { log("WARN: no service worker found; cap may not apply"); }
  else {
    await sw.evaluate((n) => chrome.storage.local.set({ warmly_sync_test_max: n }), N);
    const check = await sw.evaluate(() => chrome.storage.local.get("warmly_sync_test_max"));
    log("test cap set:", JSON.stringify(check));
  }

  // --- capture LinkedIn-tab console (orchestrator logs live here) ---
  const consoleLines = [];
  const bugs = [];
  function watchConsole(p, tag) {
    p.on("console", (msg) => {
      const t = msg.text();
      if (/RscProfile|ConnectionsSync|RateLimit|HTTP \d{3}|parse error|Error|failed/i.test(t)) {
        consoleLines.push(`[${tag}] ${t}`);
        if (/error|failed|HTTP (4|5)\d\d|RateLimit/i.test(t) && !/Phase|complete|starting/i.test(t)) bugs.push(`[${tag}] ${t}`);
      }
    });
    p.on("pageerror", (e) => { bugs.push(`[${tag}] pageerror: ${String(e).slice(0, 200)}`); });
  }

  const page = ctx.pages()[0] || await ctx.newPage();
  watchConsole(page, "warmly");

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

  // open LinkedIn tab (orchestrator content-script lives here)
  const li = await ctx.newPage();
  watchConsole(li, "linkedin");
  await li.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await li.waitForTimeout(4000);
  log("linkedin:", li.url().includes("/feed") ? "authed" : `NOT authed (${li.url()})`);

  // trigger sync
  await page.bringToFront();
  await page.goto(`${BASE}/onboarding/connect-linkedin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  const btn = page.locator("button", { hasText: /Sync my network/i }).first();
  if (await btn.count() === 0) { log("NO sync button:", (await page.evaluate(() => document.body.innerText)).slice(0, 200)); await ctx.close(); process.exit(1); }
  await btn.click();
  const t0 = Date.now();
  log(`sync triggered (cap=${N})`);

  // --- poll ---
  let phase1DoneAt = null, doneAt = null, last = { total: 0, withExp: 0, withEdu: 0, rows: [] };
  let prevEnriched = 0, lastEnrichTick = t0;
  while (Date.now() - t0 < BUDGET_MS) {
    await page.waitForTimeout(10000);
    last = await db();
    const el = Date.now() - t0;
    if (!phase1DoneAt && last.total >= N) phase1DoneAt = el;
    if (last.withExp > prevEnriched) { prevEnriched = last.withExp; lastEnrichTick = Date.now(); }
    log(`t+${fmt(el)} · contacts=${last.total} · exp=${last.withExp} · edu=${last.withEdu}`);
    // completion: console said complete, OR enriched reached cap, OR enrichment stalled 90s after some progress
    const completeLog = consoleLines.some((l) => /Phase 2 \(RSC\) complete|Sync complete/i.test(l));
    if ((last.withExp >= N - 2 && last.withEdu >= 1) || completeLog) { doneAt = el; break; }
    if (last.total >= N && prevEnriched > 0 && Date.now() - lastEnrichTick > 120000) { doneAt = el; log("enrichment stalled — stopping"); break; }
  }
  await shot(page, "final");

  // --- analyze bugs in the data ---
  const enriched = last.rows.filter((c) => (Array.isArray(c.experience) && c.experience.length) || (Array.isArray(c.education_v2) && c.education_v2.length));
  const noExp = enriched.filter((c) => !(Array.isArray(c.experience) && c.experience.length));
  const noEdu = enriched.filter((c) => !(Array.isArray(c.education_v2) && c.education_v2.length));
  const noBoth = last.rows.filter((c) => !(Array.isArray(c.experience) && c.experience.length) && !(Array.isArray(c.education_v2) && c.education_v2.length));
  // suspicious fields
  const suspicious = [];
  for (const c of enriched) {
    for (const e of (c.experience || [])) {
      if (!e.title || !e.company) suspicious.push(`${c.name}: exp missing title/company → ${JSON.stringify(e).slice(0,120)}`);
      if (e.location && /thumbnail|http|logo|\.{3}|grow your|acquire/i.test(e.location)) suspicious.push(`${c.name}: bad location "${e.location}"`);
      if (e.title && e.title.length > 120) suspicious.push(`${c.name}: long title "${e.title.slice(0,60)}…"`);
    }
    for (const ed of (c.education_v2 || [])) {
      if (!ed.school) suspicious.push(`${c.name}: edu missing school`);
    }
  }

  // --- report ---
  console.log("\n===== SAMPLE (first 4 enriched) =====");
  for (const c of enriched.slice(0, 4)) {
    console.log(`\n• ${c.name}  [${c.company || "-"} / ${c.current_title || "-"}]  loc=${c.location || "-"}  exp=${(c.experience||[]).length} edu=${(c.education_v2||[]).length}`);
    (c.experience || []).slice(0, 2).forEach((e) => console.log(`    exp: ${e.title} @ ${e.company} ${JSON.stringify(e.dateRange)} ${e.location || ""}`));
    (c.education_v2 || []).slice(0, 2).forEach((e) => console.log(`    edu: ${e.school} — ${e.degree || "-"} ${JSON.stringify(e.dateRange)}`));
  }

  console.log("\n===== TIMING =====");
  console.log(`cap (target)          : ${N}`);
  console.log(`Phase 1 (import ${N})    : ${phase1DoneAt ? fmt(phase1DoneAt) : "n/a"}`);
  console.log(`Total to done         : ${doneAt ? fmt(doneAt) : `>budget (${fmt(BUDGET_MS)})`}`);
  if (phase1DoneAt && doneAt) console.log(`Phase 2 (enrich)      : ${fmt(doneAt - phase1DoneAt)}  (~${Math.round((doneAt - phase1DoneAt) / 1000 / Math.max(last.withExp,1))}s/profile)`);

  console.log("\n===== CORRECTNESS =====");
  console.log(`contacts imported     : ${last.total}`);
  console.log(`with experience       : ${last.withExp}`);
  console.log(`with education        : ${last.withEdu}`);
  console.log(`enriched w/o exp      : ${noExp.length}${noExp.length ? " → " + noExp.slice(0,5).map(c=>c.name).join(", ") : ""}`);
  console.log(`enriched w/o edu      : ${noEdu.length}${noEdu.length ? " → " + noEdu.slice(0,5).map(c=>c.name).join(", ") : ""}`);
  console.log(`no exp AND no edu     : ${noBoth.length}${noBoth.length ? " → " + noBoth.slice(0,8).map(c=>c.name).join(", ") : ""}`);

  console.log("\n===== BUGS / WARNINGS =====");
  if (!bugs.length && !suspicious.length) console.log("none surfaced ✅");
  bugs.slice(0, 15).forEach((b) => console.log(`  CONSOLE: ${b.slice(0, 160)}`));
  suspicious.slice(0, 15).forEach((s) => console.log(`  DATA: ${s}`));

  console.log("\n===== KEY CONSOLE (last 12) =====");
  consoleLines.slice(-12).forEach((l) => console.log("  " + l.slice(0, 160)));

  // clear the test cap so it doesn't linger
  if (sw) await sw.evaluate(() => chrome.storage.local.remove("warmly_sync_test_max")).catch(() => {});
  await ctx.close();
}
main().catch((e) => { console.error("[timed] FATAL", e); process.exit(1); });
