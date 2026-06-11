/**
 * probe-paging.mjs — READ-ONLY: one connections-list page fetch to inspect
 * where the paging/total metadata lives in the normalized envelope.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE = join(__dirname, "..", ".playwright-profile");

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, args: ["--window-position=-9999,-9999", "--window-size=1366,1000"],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
try {
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2500));

  const out = await page.evaluate(async () => {
    const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1] || "";
    const url = new URL("https://www.linkedin.com/voyager/api/relationships/dash/connections");
    url.searchParams.set("q", "search");
    url.searchParams.set("count", "40");
    url.searchParams.set("start", "0");
    url.searchParams.set("sortType", "RECENTLY_ADDED");
    url.searchParams.set("decorationId", "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16");
    const res = await fetch(url.toString(), {
      method: "GET", credentials: "include",
      headers: { accept: "application/vnd.linkedin.normalized+json+2.1", "x-restli-protocol-version": "2.0.0", "csrf-token": csrf },
    });
    const body = await res.json();
    const data = body?.data ?? null;
    const profiles = (body?.included ?? []).filter((x) => String(x?.$type ?? "").endsWith("identity.profile.Profile"));
    return {
      status: res.status,
      rootKeys: Object.keys(body ?? {}),
      dataKeys: data ? Object.keys(data) : null,
      dataPaging: data?.paging ?? null,
      rootPaging: body?.paging ?? null,
      nestedData: data?.data ? Object.keys(data.data) : null,
      nestedPaging: data?.data?.paging ?? null,
      elementsLen: Array.isArray(data?.elements) ? data.elements.length : (Array.isArray(data?.["*elements"]) ? data["*elements"].length : null),
      includedLen: (body?.included ?? []).length,
      profileEntities: profiles.length,
      includedTypes: [...new Set((body?.included ?? []).map((x) => String(x?.$type ?? "?")))],
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await ctx.close();
}
