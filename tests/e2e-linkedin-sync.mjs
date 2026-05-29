#!/usr/bin/env node
/**
 * End-to-end test harness for LinkedIn Network Sync (v1).
 *
 * Drives the FULL flow in a real Chromium with the Warmly extension loaded
 * and the LinkedIn session pre-seeded (see tests/seed-linkedin-cookies.mjs):
 *   1. Log into Warmly with .env.test credentials
 *   2. Open a linkedin.com tab (the sync orchestrator's content script lives there)
 *   3. Visit /onboarding/connect-linkedin, detect the sync-card state
 *   4. (full mode) Click "Sync my network", poll progress, verify enrichment
 *   5. Analyze captured network traffic for throttle compliance + no write actions
 *
 * Modes:
 *   --mode smoke   Login + state detection + screenshot. ~1 min. De-risks setup.
 *   --mode full    Everything, including the ~20 min sync. Default budget 30 min.
 *
 * USAGE:
 *   node tests/e2e-linkedin-sync.mjs --mode smoke
 *   node tests/e2e-linkedin-sync.mjs --mode full --timeout 1800000
 *
 * Reads credentials from .env.test (TEST_USER_EMAIL, TEST_USER_PASSWORD,
 * WARMLY_PROD_URL). Outputs a structured JSON report to stdout.
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(REPO_ROOT, 'extension', 'dist');
const USER_DATA_DIR = path.join(REPO_ROOT, '.playwright-profile');
const SHOT_DIR = path.join(REPO_ROOT, '.playwright-profile', 'e2e-shots');

// ---------------------------------------------------------------------------
// Args + env
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { mode: 'smoke', timeout: 1800000, headed: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode') opts.mode = args[++i];
    else if (args[i] === '--timeout') opts.timeout = parseInt(args[++i], 10);
    else if (args[i] === '--headed') opts.headed = true;
  }
  return opts;
}

function loadEnvTest() {
  const p = path.join(REPO_ROOT, '.env.test');
  if (!fs.existsSync(p)) {
    console.error('ERROR: .env.test not found');
    process.exit(2);
  }
  const env = {};
  for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  if (!env.TEST_USER_EMAIL || !env.TEST_USER_PASSWORD) {
    console.error('ERROR: .env.test missing TEST_USER_EMAIL / TEST_USER_PASSWORD');
    process.exit(2);
  }
  env.WARMLY_PROD_URL = env.WARMLY_PROD_URL || 'https://ai-networking-coach.vercel.app';
  return env;
}

const log = (...m) => console.error('[e2e]', ...m);
const nowIso = () => new Date().toISOString();

async function shot(page, name) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const p = path.join(SHOT_DIR, `${Date.now()}-${name}.png`);
  try { await page.screenshot({ path: p, fullPage: false }); return p; }
  catch (e) { log('screenshot failed:', e.message); return null; }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const env = loadEnvTest();
  const BASE = env.WARMLY_PROD_URL;

  if (!fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
    console.error(`ERROR: extension not built at ${EXT_DIR}`);
    process.exit(3);
  }

  // Per-criterion result accumulator
  const results = {};
  const setRes = (k, pass, detail) => { results[k] = { pass, detail }; log(`  [${pass ? 'PASS' : 'FAIL'}] ${k}: ${detail}`); };

  // Voyager network capture
  const voyagerCalls = []; // { ts, method, url, kind }
  const linkedinWrites = []; // any non-GET to linkedin.com

  for (const f of ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {}
  }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: opts.headed ? null : { width: 1366, height: 900 },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      ...(opts.headed ? [] : ['--window-position=-9999,-9999', '--window-size=1366,900']),
    ],
    ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
  });

  // Capture requests across all pages/contexts
  context.on('request', (req) => {
    const url = req.url();
    const method = req.method();
    if (url.includes('linkedin.com')) {
      if (url.includes('/voyager/api/')) {
        let kind = 'other';
        if (url.includes('relationships/dash/connections')) kind = 'list';
        else if (url.includes('identity/dash/profiles')) kind = 'batch';
        voyagerCalls.push({ ts: Date.now(), method, url: url.slice(0, 120), kind });
      }
      if (method !== 'GET' && method !== 'OPTIONS') {
        linkedinWrites.push({ ts: Date.now(), method, url: url.slice(0, 120) });
      }
    }
  });

  const page = context.pages()[0] || await context.newPage();

  // -------------------------------------------------------------------------
  // STEP 1 — Login to Warmly
  // -------------------------------------------------------------------------
  log('STEP 1: login to Warmly');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  // Persisted Supabase session may auto-redirect /login → /chat. Detect that.
  const emailInput = page.locator('input[type="email"]');
  const alreadyAuthed = !page.url().includes('/login') || (await emailInput.count()) === 0;
  if (alreadyAuthed) {
    setRes('login', true, `already authenticated (session persisted), at ${new URL(page.url()).pathname}`);
  } else {
    try {
      await page.fill('input[type="email"]', env.TEST_USER_EMAIL, { timeout: 10000 });
      await page.fill('input[type="password"]', env.TEST_USER_PASSWORD, { timeout: 10000 });
      await shot(page, 'login-filled');
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 25000 });
      await page.waitForTimeout(2000);
      setRes('login', true, `landed on ${new URL(page.url()).pathname}`);
    } catch (e) {
      setRes('login', false, `login failed: ${e.message}`);
      await shot(page, 'login-failed');
      console.log(JSON.stringify({ mode: opts.mode, results, voyager_calls: 0 }, null, 2));
      await context.close();
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 2 — Open a LinkedIn tab (sync content script lives here)
  // Workaround for finding #1 (sync requires an open LinkedIn tab).
  // -------------------------------------------------------------------------
  log('STEP 2: open LinkedIn tab + verify session');
  const liPage = await context.newPage();
  await liPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await liPage.waitForTimeout(4000);
  const liUrl = liPage.url();
  const liLoggedIn = !liUrl.includes('/login') && !liUrl.includes('/authwall');
  setRes('linkedin_session', liLoggedIn, liLoggedIn ? 'feed loaded, authenticated' : `redirected to ${liUrl}`);
  await shot(liPage, 'linkedin-feed');

  // -------------------------------------------------------------------------
  // STEP 3 — Onboarding connect-linkedin page, detect sync-card state
  // -------------------------------------------------------------------------
  log('STEP 3: detect sync card state');
  await page.bringToFront();
  await page.goto(`${BASE}/onboarding/connect-linkedin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000); // allow extension detection handshake (2s) + render
  const bodyText = await page.evaluate(() => document.body.innerText);
  await shot(page, 'connect-linkedin');

  const showsInstall = /Install the Warmly browser extension|Install extension/i.test(bodyText);
  const showsLogin = /Log into LinkedIn first|Open LinkedIn/i.test(bodyText);
  const showsReady = /Sync my network|Ready to sync/i.test(bodyText);

  // Criterion 1: extension detected (should NOT show install card, since ext is loaded)
  setRes('c1_install_detection', !showsInstall, showsInstall ? 'shows Install card despite extension loaded' : 'extension detected (no install card)');
  // Criterion 2: LinkedIn session recognized (should NOT show login card)
  setRes('c2_linkedin_check', !showsLogin && showsReady, showsReady ? 'shows Ready state' : `login card=${showsLogin} ready=${showsReady}`);

  if (opts.mode === 'smoke') {
    log('SMOKE complete');
    console.log(JSON.stringify({
      mode: 'smoke', results,
      page_text_excerpt: bodyText.slice(0, 400),
      shots_dir: SHOT_DIR,
    }, null, 2));
    await context.close();
    return;
  }

  // -------------------------------------------------------------------------
  // STEP 4 — Trigger sync, poll progress
  // -------------------------------------------------------------------------
  log('STEP 4: trigger sync');
  if (!showsReady) {
    setRes('c3_phase1_progress', false, 'cannot start: not in ready state');
    console.log(JSON.stringify({ mode: 'full', results, voyager_calls: voyagerCalls.length }, null, 2));
    await context.close();
    process.exit(1);
  }

  const syncBtn = page.locator('button', { hasText: /Sync my network/i }).first();
  await syncBtn.click();
  const syncStart = Date.now();
  log('sync started at', nowIso());

  // Helper: read contact count from the app's API in the page session
  async function contactCount() {
    try {
      return await page.evaluate(async (base) => {
        const r = await fetch(`${base}/api/contacts?limit=1`, { credentials: 'include' });
        if (!r.ok) return -1;
        const j = await r.json();
        // tolerate various shapes
        if (typeof j.total === 'number') return j.total;
        if (Array.isArray(j.data)) return j.data.length;
        if (j.data && typeof j.data.total === 'number') return j.data.total;
        return -2;
      }, BASE);
    } catch { return -3; }
  }

  // Poll loop
  let phase1Seen = false, phase1At = null;
  const deadline = syncStart + opts.timeout;
  let lastCount = 0;
  const checkpoints = [30000, 300000]; // 30s, 5min
  let nextCp = 0;

  while (Date.now() < deadline) {
    await page.waitForTimeout(15000);
    const elapsed = Date.now() - syncStart;
    const cnt = await contactCount();
    if (cnt > lastCount) lastCount = cnt;
    log(`  t+${Math.round(elapsed/1000)}s · contacts=${cnt} · voyager=${voyagerCalls.length} (list=${voyagerCalls.filter(v=>v.kind==='list').length} batch=${voyagerCalls.filter(v=>v.kind==='batch').length})`);

    if (!phase1Seen && cnt >= 40) { phase1Seen = true; phase1At = elapsed; }

    if (nextCp < checkpoints.length && elapsed >= checkpoints[nextCp]) {
      await shot(page, `progress-t${Math.round(checkpoints[nextCp]/1000)}s`);
      nextCp++;
    }

    // Completion detection: page shows "Sync complete" OR batch calls stopped growing for a while
    const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (/Sync complete/i.test(txt)) { log('detected Sync complete'); break; }
  }

  const elapsedTotal = Date.now() - syncStart;
  await shot(page, 'sync-final');

  // Criterion 3: Phase 1 visible progress (>=40 contacts within ~30s)
  setRes('c3_phase1_progress', phase1Seen && phase1At <= 60000, phase1Seen ? `40+ contacts at t+${Math.round((phase1At||0)/1000)}s` : 'never reached 40 contacts');
  // Criterion 4: Phase 1 completes (list calls happened, contacts populated)
  const listCalls = voyagerCalls.filter(v => v.kind === 'list').length;
  setRes('c4_phase1_complete', listCalls > 0 && lastCount >= 40, `list calls=${listCalls}, final contacts=${lastCount}`);

  // -------------------------------------------------------------------------
  // STEP 5 — Verify deep enrichment on sample contacts
  // -------------------------------------------------------------------------
  log('STEP 5: verify enrichment on sample contacts');
  let enrichedSample = { checked: 0, withExp: 0, withEdu: 0 };
  try {
    enrichedSample = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/contacts?limit=10`, { credentials: 'include' });
      const j = await r.json();
      const list = Array.isArray(j.data) ? j.data : (j.data?.contacts || j.contacts || []);
      let withExp = 0, withEdu = 0, checked = 0;
      for (const c of list.slice(0, 10)) {
        checked++;
        if (c.experience && (Array.isArray(c.experience) ? c.experience.length : true)) withExp++;
        if ((c.education_v2 && (Array.isArray(c.education_v2) ? c.education_v2.length : true))) withEdu++;
      }
      return { checked, withExp, withEdu };
    }, BASE);
  } catch (e) { log('enrichment check failed:', e.message); }
  const enrichRate = enrichedSample.checked ? enrichedSample.withExp / enrichedSample.checked : 0;
  setRes('c5_phase2_enrichment', enrichRate >= 0.5, `${enrichedSample.withExp}/${enrichedSample.checked} have experience, ${enrichedSample.withEdu} have education`);

  // -------------------------------------------------------------------------
  // STEP 6 — Throttle compliance (criterion 6)
  // -------------------------------------------------------------------------
  const sorted = [...voyagerCalls].sort((a, b) => a.ts - b.ts);
  let minListGap = Infinity, minBatchGap = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].ts - sorted[i - 1].ts;
    if (sorted[i].kind === 'list') minListGap = Math.min(minListGap, gap);
    if (sorted[i].kind === 'batch') minBatchGap = Math.min(minBatchGap, gap);
  }
  // Allow some slack below nominal (3s list / 10s batch) for jitter lower bound
  const throttleOk = (minListGap === Infinity || minListGap >= 1800) && (minBatchGap === Infinity || minBatchGap >= 6000);
  setRes('c6_throttle', throttleOk, `min list gap=${minListGap===Infinity?'n/a':Math.round(minListGap)+'ms'}, min batch gap=${minBatchGap===Infinity?'n/a':Math.round(minBatchGap)+'ms'}`);

  // Criterion 10: no write actions to LinkedIn
  setRes('c10_no_writes', linkedinWrites.length === 0, linkedinWrites.length === 0 ? 'zero non-GET requests to linkedin.com' : `${linkedinWrites.length} write requests detected`);

  // -------------------------------------------------------------------------
  // Final report
  // -------------------------------------------------------------------------
  const passCount = Object.values(results).filter(r => r.pass).length;
  console.log(JSON.stringify({
    mode: 'full',
    elapsed_seconds: Math.round(elapsedTotal / 1000),
    final_contact_count: lastCount,
    voyager_calls: { total: voyagerCalls.length, list: listCalls, batch: voyagerCalls.filter(v => v.kind === 'batch').length },
    linkedin_writes: linkedinWrites.length,
    results,
    pass_count: passCount,
    total_criteria: Object.keys(results).length,
    shots_dir: SHOT_DIR,
  }, null, 2));

  await context.close();
}

main().catch((err) => { console.error('[e2e] FATAL:', err); process.exit(1); });
