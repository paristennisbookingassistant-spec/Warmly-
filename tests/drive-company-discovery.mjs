#!/usr/bin/env node
/**
 * Drives a REAL company-discovery scrape end-to-end through the loaded Warmly
 * extension + an authenticated LinkedIn session (seeded by
 * seed-linkedin-cookies.mjs). Logs into Warmly, opens /v2/discover, triggers
 * "Discover at a company", and captures the DISCOVERY_* event stream + the
 * extension's [WARMLY] logs + screenshots.
 *
 * READ-ONLY: discovery only views profiles. No messages/connections.
 *
 * USAGE: node tests/drive-company-discovery.mjs --company "Bain & Company" --location Paris
 */
import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(REPO_ROOT, 'extension', 'dist');
const USER_DATA_DIR = path.join(REPO_ROOT, '.playwright-profile');
const APP = 'https://ai-networking-coach.vercel.app';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}
const COMPANY = arg('company', 'Bain & Company');
const LOCATION = arg('location', 'Paris');
const EMAIL = 'liyang.guo@essec.edu';
const PASSWORD = '123456789';
const SHOTS = path.join(REPO_ROOT, 'tests');

const events = [];   // DISCOVERY_* relayed events
const warmlyLogs = [];

async function main() {
  for (const n of ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.unlinkSync(path.join(USER_DATA_DIR, n)); } catch {}
  }
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 860 },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      '--window-position=-9999,-9999',
    ],
    ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
  });

  const page = ctx.pages()[0] || await ctx.newPage();

  // Capture console from page + (via the bridge) the DISCOVERY_* events posted to window
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[WARMLY]') || /DISCOVERY_/.test(t)) warmlyLogs.push(t.slice(0, 300));
  });

  // ---- Login to Warmly ----
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  if (page.url().includes('/login')) {
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(5000);
  }
  console.error('[drive] after login url:', page.url());

  // ---- Hook the WARMLY_EXTENSION bridge events on the page ----
  await page.goto(`${APP}/v2/discover`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.__disc = [];
    window.addEventListener('message', (e) => {
      if (e?.data?.source === 'WARMLY_EXTENSION' && /DISCOVERY_/.test(e.data.type || '')) {
        window.__disc.push({ type: e.data.type, payload: e.data.payload });
      }
    });
  });

  // ---- Trigger company discovery DIRECTLY via the bridge (bypass the
  //      rate-limited POST /api/discovery by supplying a pre-made session id).
  //      This exercises the actual extension CDP_DISCOVER scrape in isolation. ----
  const SESSION_ID = arg('session-id', '');
  const USER_ID = 'deed7f54-3c3c-40a9-bf20-2e17bc6192e0';
  await page.evaluate(({ company, loc, sid, uid }) => {
    window.postMessage({
      type: 'WEBAPP_DISCOVER',
      payload: {
        companyName: company,
        user_id: uid,
        schoolId: '5176',
        schoolLabel: 'INSEAD',
        locationLabel: loc,
        functionLabel: '',
        discovery_session_id: sid,
      },
    }, window.location.origin);
  }, { company: COMPANY, loc: LOCATION, sid: SESSION_ID, uid: USER_ID });
  console.error(`[drive] posted WEBAPP_DISCOVER: ${COMPANY} / ${LOCATION} · session ${SESSION_ID}`);

  // ---- Poll for events up to 200s ----
  const start = Date.now();
  let done = false;
  while (Date.now() - start < 200000 && !done) {
    await page.waitForTimeout(5000);
    const disc = await page.evaluate(() => window.__disc || []);
    for (const d of disc) {
      const key = `${d.type}:${d.payload?.profiles_saved ?? ''}`;
      if (!events.find((e) => `${e.type}:${e.payload?.profiles_saved ?? ''}` === key)) events.push(d);
    }
    const last = disc[disc.length - 1];
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.error(`[drive] t+${elapsed}s · events=${disc.length} · last=${last?.type ?? '-'} saved=${last?.payload?.profiles_saved ?? '-'}/${last?.payload?.profiles_total ?? '-'}`);
    if (disc.some((d) => d.type === 'DISCOVERY_DONE' || d.type === 'DISCOVERY_ERROR')) done = true;
  }

  await page.screenshot({ path: path.join(SHOTS, '_drive_result.png') }).catch(() => {});

  const report = {
    company: COMPANY,
    events: events.map((e) => ({ type: e.type, ...e.payload })),
    warmly_log_sample: warmlyLogs.slice(-15),
    final_url: page.url(),
  };
  console.log(JSON.stringify(report, null, 2));
  await ctx.close();
}
main().catch((e) => { console.error('[drive] FATAL', e); process.exit(1); });
