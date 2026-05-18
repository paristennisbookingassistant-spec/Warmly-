#!/usr/bin/env node
/**
 * Extension-aware headless tester for Warmly.
 *
 * Uses Playwright's `launchPersistentContext()` — the ONLY launch API that
 * actually loads Chrome extensions. (gstack's `browse` tool uses `launch()`
 * + `newContext()` for its headless mode, which silently fails to load
 * extensions — that's why our [WARMLY] logs never appeared.)
 *
 * What this script does:
 *   1. Launches Chromium with Warmly's `extension/dist` loaded as an
 *      unpacked extension
 *   2. Navigates to a URL (LinkedIn or our web app)
 *   3. Captures all `[WARMLY]`-prefixed console logs from page + content
 *      scripts (the latter only visible because the extension is loaded)
 *   4. Takes a screenshot
 *   5. Returns a structured report (JSON to stdout)
 *
 * Persistent profile is stored at `.playwright-profile/` — gitignored.
 * Once you log in to LinkedIn once in a headed run, the session persists
 * across runs, so subsequent tests don't need re-auth.
 *
 * USAGE:
 *   node tests/ext-tester.mjs --url <url> [--wait <ms>] [--screenshot <path>] [--headed]
 *
 * EXAMPLES:
 *   # Check extension loads on linkedin.com
 *   node tests/ext-tester.mjs --url https://www.linkedin.com --wait 3000
 *
 *   # Headed mode for one-time LinkedIn login
 *   node tests/ext-tester.mjs --url https://www.linkedin.com/login --wait 60000 --headed
 *
 *   # Verify a feature on our web app
 *   node tests/ext-tester.mjs --url https://ai-networking-coach.vercel.app/chat --wait 5000
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

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: null,
    wait: 3000,
    screenshot: null,
    headed: false,
    logFilter: 'WARMLY',
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url') opts.url = args[++i];
    else if (a === '--wait') opts.wait = parseInt(args[++i], 10);
    else if (a === '--screenshot') opts.screenshot = args[++i];
    else if (a === '--headed') opts.headed = true;
    else if (a === '--log-filter') opts.logFilter = args[++i];
  }
  if (!opts.url) {
    console.error('ERROR: --url is required');
    process.exit(2);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  // Verify extension dir exists
  if (!fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
    console.error(`ERROR: No manifest.json at ${EXT_DIR}`);
    console.error('Build the extension first: cd extension && npm run build');
    process.exit(3);
  }

  // Ensure profile dir exists
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.error(`[tester] Loading extension from: ${EXT_DIR}`);
  console.error(`[tester] Persistent profile: ${USER_DATA_DIR}`);
  console.error(`[tester] Window: ${opts.headed ? 'visible' : 'off-screen (extension-compatible "headless")'}`);

  // Launch with launchPersistentContext (REQUIRED for extension loading).
  //
  // CRITICAL: We always launch with `headless: false`, even for "headless"
  // runs. Playwright's true headless mode uses `--headless=old` which
  // silently disables Chrome extensions. To get extension support, we
  // launch with a visible window but position it off-screen and shrink
  // it to 1x1 — same pattern gstack uses internally. The user never
  // sees the window unless they passed --headed.
  //
  // This is why the gstack `browse` tool's headless+extension path was
  // broken: it used `launch()` + `newContext()` with `headless: true`,
  // both of which block extension loading.
  const offScreenArgs = [
    '--window-position=-9999,-9999',
    '--window-size=1,1',
  ];
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, // ALWAYS — see note above
    viewport: opts.headed ? null : { width: 1280, height: 800 },
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      ...(opts.headed ? [] : offScreenArgs),
    ],
    // Playwright adds flags that block extension loading by default
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
    ],
  });

  const page = context.pages()[0] || await context.newPage();

  // Capture logs matching the filter
  const matchedLogs = [];
  const allLogs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    const entry = { type: msg.type(), text };
    allLogs.push(entry);
    if (text.includes(opts.logFilter)) {
      matchedLogs.push(entry);
    }
  });

  // Also capture service worker logs (extension background)
  // Service workers are accessible via context.serviceWorkers()
  const swLogs = [];
  context.on('serviceworker', (sw) => {
    console.error(`[tester] Service worker registered: ${sw.url()}`);
  });

  page.on('pageerror', (err) => {
    console.error(`[tester] Page error: ${err.message}`);
  });

  // Navigate
  console.error(`[tester] Navigating to: ${opts.url}`);
  try {
    await page.goto(opts.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
  } catch (err) {
    console.error(`[tester] Navigation error: ${err.message}`);
  }

  console.error(`[tester] Waiting ${opts.wait}ms for activity...`);
  await page.waitForTimeout(opts.wait);

  // Final URL (after any redirects)
  const finalUrl = page.url();

  // Screenshot
  let screenshotPath = opts.screenshot;
  if (!screenshotPath) {
    screenshotPath = path.join(REPO_ROOT, '.playwright-profile', `last-${Date.now()}.png`);
  }
  try {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  } catch (err) {
    console.error(`[tester] Screenshot error: ${err.message}`);
    screenshotPath = null;
  }

  // List loaded service workers (proves extension service worker is alive)
  const serviceWorkers = context.serviceWorkers().map((sw) => sw.url());

  // Build report
  const report = {
    url_requested: opts.url,
    url_final: finalUrl,
    screenshot: screenshotPath,
    extension_dir: EXT_DIR,
    matched_log_count: matchedLogs.length,
    matched_logs: matchedLogs,
    service_workers: serviceWorkers,
    all_log_count: allLogs.length,
    sample_other_logs: allLogs
      .filter((l) => !l.text.includes(opts.logFilter))
      .slice(0, 5),
  };

  console.log(JSON.stringify(report, null, 2));

  // If --headed and --keep-open, leave the window up for user interaction
  // (used for one-time LinkedIn login to seed the persistent profile)
  if (opts.headed && process.argv.includes('--keep-open')) {
    console.error(`[tester] --keep-open: window stays open. Press Ctrl+C to close when done.`);
    await new Promise(() => {}); // wait forever
  }

  await context.close();
}

main().catch((err) => {
  console.error('[tester] FATAL:', err);
  process.exit(1);
});
