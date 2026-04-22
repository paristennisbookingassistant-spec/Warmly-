/**
 * tests/e2e/extension-bookmark.spec.ts
 *
 * End-to-end test for the Chrome extension bookmark flow:
 * LinkedIn profile page → click "Save this profile to contacts" → "Saved to contacts!"
 *
 * How this works:
 * 1. Launches Chromium with the built extension loaded (extension/dist/)
 * 2. Intercepts https://www.linkedin.com/in/test-user/ → serves a mock HTML fixture
 *    that has the exact DOM structure the dom-reader selectors expect
 * 3. Intercepts POST /api/contacts → returns a mock 201 response (no real auth needed)
 * 4. Seeds chrome.storage.local with a fake auth token via the auth-bridge postMessage
 * 5. Opens the extension popup and clicks save
 * 6. Asserts "Saved to contacts!" appears in the popup
 *
 * Prerequisites:
 * - Extension must be built first: cd extension && node build.mjs
 * - Next.js dev server running on localhost:3000 (for auth-bridge seeding)
 *   OR skip auth seeding if you only care about extraction (the mock API skips auth)
 */

import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { readFileSync } from "fs";

/**
 * Builds a fake JWT that passes the extension's isAuthenticated() check.
 * The extension only decodes the payload to verify expiry — it does NOT
 * verify the cryptographic signature, so a fake one works fine for tests.
 */
function makeFakeJwt(userId: string, expiresInSeconds = 3600): string {
  const b64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: userId,
    user_id: userId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${header}.${payload}.test-signature`;
}

const EXTENSION_PATH = path.resolve(__dirname, "../../extension/dist");
const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/linkedin-profile.html");
const MOCK_LINKEDIN_URL = "https://www.linkedin.com/in/test-user/";

test.describe("Extension bookmark flow", () => {
  test("saves a LinkedIn profile and shows 'Saved to contacts!'", async () => {
    // ---------------------------------------------------------------------------
    // 1. Launch Chrome with the extension loaded
    // ---------------------------------------------------------------------------
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        // Allow the extension to make requests to the mock API
        "--disable-web-security",
      ],
    });

    // ---------------------------------------------------------------------------
    // 2. Get extension ID from service worker
    // ---------------------------------------------------------------------------
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker", { timeout: 10_000 });
    }
    const extensionId = new URL(background.url()).hostname;
    console.log("[test] Extension ID:", extensionId);

    // ---------------------------------------------------------------------------
    // 3. Mock the backend API — POST /api/contacts returns success
    //    This means we don't need a real auth token or Supabase connection
    // ---------------------------------------------------------------------------
    await context.route("**/api/contacts*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "test-contact-id-123",
              name: "Test User",
              current_title: "Senior Engineer",
              company: "Acme Corp",
              status: "discovered",
              relevance_score: null,
              tier: null,
            },
            error: null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ---------------------------------------------------------------------------
    // 4. Seed chrome.storage.local with a fake auth token
    //    We evaluate directly in the service worker context — this is the most
    //    reliable way to set extension storage without needing a running dev server.
    // ---------------------------------------------------------------------------
    const fakeJwt = makeFakeJwt("test-user-id");
    await background.evaluate((token) => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set(
          {
            auth_token: token,
            supabase_session: {
              user_id: "test-user-id",
              access_token: token,
              refresh_token: "test-refresh-token",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          () => resolve()
        );
      });
    }, fakeJwt);
    console.log("[test] Auth token seeded in chrome.storage.local");

    // ---------------------------------------------------------------------------
    // 5. Intercept LinkedIn URL → serve mock fixture HTML
    // ---------------------------------------------------------------------------
    const fixtureHtml = readFileSync(FIXTURE_PATH, "utf-8");
    await context.route(MOCK_LINKEDIN_URL, async (route) => {
      await route.fulfill({ contentType: "text/html", body: fixtureHtml });
    });

    // ---------------------------------------------------------------------------
    // 6. Open the mock LinkedIn profile page
    //    The URL looks like a real linkedin.com/in/ URL so isProfilePage() returns true
    // ---------------------------------------------------------------------------
    const linkedinPage = await context.newPage();
    await linkedinPage.goto(MOCK_LINKEDIN_URL);
    await linkedinPage.waitForLoadState("domcontentloaded");
    console.log("[test] LinkedIn fixture loaded at:", linkedinPage.url());

    // ---------------------------------------------------------------------------
    // 7. Open the extension popup directly
    // ---------------------------------------------------------------------------
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await popupPage.waitForLoadState("domcontentloaded");

    // ---------------------------------------------------------------------------
    // 8. Wait for popup to initialize and find the save button
    //    The popup checks the active tab URL — it should detect linkedin.com/in/
    // ---------------------------------------------------------------------------
    const saveBtn = popupPage.getByText("Save this profile to contacts");
    await expect(saveBtn).toBeVisible({ timeout: 8_000 });

    // ---------------------------------------------------------------------------
    // 9. Click save and assert success
    // ---------------------------------------------------------------------------
    await saveBtn.click();
    await expect(popupPage.getByText("Saved to contacts!")).toBeVisible({ timeout: 8_000 });

    console.log("[test] PASS — bookmark flow works end-to-end");
    await context.close();
  });

  test("shows 'Not a profile page' on non-profile LinkedIn URL", async () => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker", { timeout: 10_000 });
    }
    const extensionId = new URL(background.url()).hostname;

    // Open a non-profile LinkedIn page (feed)
    const feedPage = await context.newPage();
    await context.route("https://www.linkedin.com/feed/", async (route) => {
      await route.fulfill({ contentType: "text/html", body: "<html><body><h1>Feed</h1></body></html>" });
    });
    await feedPage.goto("https://www.linkedin.com/feed/");
    await feedPage.waitForLoadState("domcontentloaded");

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await popupPage.waitForLoadState("domcontentloaded");

    // The save button should not be visible — popup only shows it on /in/ URLs
    const saveBtn = popupPage.getByText("Save this profile to contacts");
    await expect(saveBtn).not.toBeVisible({ timeout: 5_000 });

    await context.close();
  });
});
