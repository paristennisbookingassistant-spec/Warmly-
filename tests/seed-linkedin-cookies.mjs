#!/usr/bin/env node
/**
 * Seeds the ext-tester persistent profile (.playwright-profile/) with the
 * LinkedIn session cookies already maintained by the /linkedin skill at
 * C:/Users/glygs/AppData/Local/Temp/linkedin_cookies.json.
 *
 * This avoids the manual `--headed --keep-open` LinkedIn login step: if the
 * /linkedin cookie file is alive (verify first with
 * `~/.claude/skills/linkedin/check_and_update_cookie.sh check`), this script
 * injects li_at + JSESSIONID + the rest into the Playwright persistent context
 * so the loaded extension can make authenticated Voyager calls.
 *
 * USAGE:
 *   node tests/seed-linkedin-cookies.mjs [--cookie-file <path>]
 *
 * After running, verify with:
 *   node tests/ext-tester.mjs --url https://www.linkedin.com/feed/ --wait 4000
 *   (should NOT redirect to /login)
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const EXT_DIR = process.env.WARMLY_EXTENSION_DIR
  || path.join(REPO_ROOT, 'extension', 'dist');
const USER_DATA_DIR = path.join(REPO_ROOT, '.playwright-profile');

const DEFAULT_COOKIE_FILE =
  'C:/Users/glygs/AppData/Local/Temp/linkedin_cookies.json';

function parseArgs() {
  const args = process.argv.slice(2);
  let cookieFile = DEFAULT_COOKIE_FILE;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cookie-file') cookieFile = args[++i];
  }
  return { cookieFile };
}

/** Normalize a raw cookie record into Playwright's addCookies() shape. */
function toPlaywrightCookie(c) {
  // Only LinkedIn-domain cookies belong in the LinkedIn jar. The source file
  // also contains ADFS / Symplicity / analytics cookies from other domains;
  // injecting those into linkedin.com would be rejected or ignored.
  const domain = c.domain || '';
  if (!domain.includes('linkedin.com')) return null;

  const sameSiteMap = { lax: 'Lax', strict: 'Strict', none: 'None' };
  const sameSite = sameSiteMap[String(c.sameSite || 'Lax').toLowerCase()] || 'Lax';

  const cookie = {
    name: c.name,
    value: String(c.value),
    domain: c.domain,
    path: c.path || '/',
    httpOnly: Boolean(c.httpOnly),
    // Force secure=true for LinkedIn — the site is https-only and Chrome will
    // drop non-secure cookies on https navigations. The source file marks some
    // as secure:false but they function as secure in the real browser.
    secure: true,
    sameSite,
  };

  // Session cookies use expires -1; persistent cookies need a real epoch.
  if (typeof c.expires === 'number' && c.expires > 0) {
    cookie.expires = c.expires;
  }
  return cookie;
}

async function main() {
  const { cookieFile } = parseArgs();

  if (!fs.existsSync(cookieFile)) {
    console.error(`ERROR: cookie file not found: ${cookieFile}`);
    process.exit(2);
  }
  if (!fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
    console.error(`ERROR: extension not built at ${EXT_DIR}. Run the extension build first.`);
    process.exit(3);
  }

  const raw = JSON.parse(fs.readFileSync(cookieFile, 'utf-8'));
  const all = Array.isArray(raw) ? raw : (raw.cookies || []);

  // Dedup by name+domain+path, keeping the last occurrence (file has dupes).
  const seen = new Map();
  for (const c of all) {
    const pw = toPlaywrightCookie(c);
    if (!pw) continue;
    seen.set(`${pw.name}|${pw.domain}|${pw.path}`, pw);
  }
  const cookies = [...seen.values()];

  const hasLiAt = cookies.some((c) => c.name === 'li_at');
  const hasJsession = cookies.some((c) => c.name === 'JSESSIONID');
  console.error(`[seed] ${cookies.length} linkedin.com cookies to inject`);
  console.error(`[seed] li_at present: ${hasLiAt} · JSESSIONID present: ${hasJsession}`);
  if (!hasLiAt) {
    console.error('ERROR: no li_at cookie found — session would be unauthenticated. Aborting.');
    process.exit(4);
  }

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  for (const name of ['lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { fs.unlinkSync(path.join(USER_DATA_DIR, name)); } catch {}
  }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      '--window-position=-9999,-9999',
      '--window-size=1,1',
    ],
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
    ],
  });

  await context.addCookies(cookies);
  console.error('[seed] cookies added to persistent context');

  // Verify the session is authenticated by loading the feed.
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.linkedin.com/feed/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const finalUrl = page.url();
  const isLoggedIn = !finalUrl.includes('/login') && !finalUrl.includes('/authwall');

  const report = {
    cookies_injected: cookies.length,
    li_at: hasLiAt,
    jsessionid: hasJsession,
    final_url: finalUrl,
    authenticated: isLoggedIn,
    profile_dir: USER_DATA_DIR,
  };
  console.log(JSON.stringify(report, null, 2));

  await context.close();

  if (!isLoggedIn) {
    console.error('WARNING: feed redirected to login/authwall — cookies may be stale despite the check. Re-run the /linkedin cookie refresh.');
    process.exit(5);
  }
  console.error('[seed] SUCCESS — LinkedIn session persisted to test profile.');
}

main().catch((err) => {
  console.error('[seed] FATAL:', err);
  process.exit(1);
});
