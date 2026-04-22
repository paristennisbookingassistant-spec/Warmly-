/**
 * Saves a real LinkedIn profile page as HTML.
 * Opens Chromium with a persistent profile (login persists between runs).
 * Auto-detects login completion — no manual Enter needed.
 *
 * Usage: node scripts/save-linkedin-html.mjs <linkedin-url> <output-filename>
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const url = process.argv[2];
const outputName = process.argv[3] || "linkedin-profile";

if (!url || !url.includes("linkedin.com/in/")) {
  console.error("Usage: node scripts/save-linkedin-html.mjs <linkedin-url> [output-name]");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve("tests/fixtures");
const PROFILE_DIR = path.join(os.homedir(), ".playwright-linkedin-profile");
mkdirSync(PROFILE_DIR, { recursive: true });

async function main() {
  console.log(`Opening Chromium (profile: ${PROFILE_DIR})`);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Auto-detect login: poll until URL contains /in/ (profile loaded)
  console.log("Waiting for profile page to load...");
  for (let i = 0; i < 120; i++) {
    const currentUrl = page.url();
    if (currentUrl.includes("/in/")) {
      console.log("Profile page detected!");
      break;
    }
    if (i === 0 && (currentUrl.includes("/login") || currentUrl.includes("/authwall"))) {
      console.log("Login required — please log in to LinkedIn in the browser window.");
      console.log("The script will auto-continue once the profile page loads.");
    }
    await page.waitForTimeout(2000);
  }

  // Confirm we're on the right page
  if (!page.url().includes("/in/")) {
    console.error("Timed out waiting for profile page. Current URL:", page.url());
    await context.close();
    process.exit(1);
  }

  // Wait for SPA content
  console.log("Waiting for SPA content...");
  await page.waitForTimeout(5000);

  // Scroll to load lazy sections
  console.log("Scrolling to load experience/education...");
  await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 500);
      await new Promise((r) => setTimeout(r, 800));
    }
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(2000);

  const html = await page.content();
  const outputPath = path.join(OUTPUT_DIR, `${outputName}.html`);
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Saved to ${outputPath} (${(html.length / 1024).toFixed(0)} KB)`);

  await context.close();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
