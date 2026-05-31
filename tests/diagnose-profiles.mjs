/** Diagnose specific profiles: fetch rsc-action exp+edu with the FIXED parser,
 * and check the basic profile (photo). READ-ONLY. */
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(__dirname, "probe-out");
const PROFILE = join(ROOT, ".playwright-profile");
const require = createRequire(join(ROOT, "extension/package.json"));
const esbuild = require("esbuild");

const PIDS = ["evasinha", "elayachimehdi"];

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, args: ["--window-position=-9999,-9999", "--window-size=1366,900"],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const results = {};
try {
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  for (const pid of PIDS) {
    const out = await page.evaluate(async (publicId) => {
      const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1] || "";
      const vh = { accept: "application/vnd.linkedin.normalized+json+2.1", "csrf-token": csrf, "x-restli-protocol-version": "2.0.0" };
      // resolve URN + basic profile (photo)
      let profileId = "", photo = null, hasPhotoField = false;
      try {
        const res = await fetch(`https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${publicId}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-6`, { headers: vh, credentials: "include" });
        const j = await res.json();
        const s = JSON.stringify(j);
        profileId = (s.match(/urn:li:fsd_profile:([A-Za-z0-9_-]+)/) || [])[1] || "";
        // find a profilePicture displayImageReference rootUrl + artifact
        const prof = (j.included || []).find((e) => (e.$type || "").endsWith("identity.profile.Profile"));
        if (prof) { hasPhotoField = "profilePicture" in prof; photo = prof.profilePicture ? "present" : (prof.profilePicture === null ? "null" : "absent"); }
      } catch (e) { return { err: String(e) }; }

      async function section(section, Section) {
        const pagerId = `com.linkedin.sdui.pagers.profile.details.${section}`;
        const ref = `com.linkedin.sdui.profile.card.ref${profileId}${Section}DetailsSection`;
        const payload = { vanityName: publicId, profileId, start: 0, count: 50, detailSectionReplaceableComponentRef: ref };
        const ra = { $type: "proto.sdui.actions.requests.RequestedArguments", payload, requestedStateKeys: [], requestMetadata: { $type: "proto.sdui.common.RequestMetadata" } };
        const body = { pagerId, clientArguments: { ...ra, states: [], screenId: `com.linkedin.sdui.flagshipnav.profile.Profile${Section}Details` }, paginationRequest: { $type: "proto.sdui.actions.requests.PaginationRequest", pagerId, requestedArguments: ra, trigger: { $case: "itemDistanceTrigger", itemDistanceTrigger: { $type: "proto.sdui.actions.requests.ItemDistanceTrigger", preloadDistance: 3, preloadLength: 250 } }, retryCount: 2 } };
        const res = await fetch(`https://www.linkedin.com/flagship-web/rsc-action/actions/pagination?sduiid=${pagerId}&parentSpanId=AAAAAAAAAAA%3D`, {
          method: "POST", credentials: "include",
          headers: { "content-type": "application/json", "csrf-token": csrf, "x-li-rsc-stream": "true", referer: `https://www.linkedin.com/in/${publicId}/details/${section}/` },
          body: JSON.stringify(body),
        });
        return { status: res.status, text: await res.text() };
      }
      const exp = await section("experience", "Experience");
      const edu = await section("education", "Education");
      return { profileId, photo, hasPhotoField, expStatus: exp.status, expLen: exp.text.length, eduStatus: edu.status, eduLen: edu.text.length, expBody: exp.text, eduBody: edu.text };
    }, pid);

    results[pid] = out;
    if (out.expBody) writeFileSync(join(OUT, `${pid}_DIAG_exp.txt`), out.expBody);
    if (out.eduBody) writeFileSync(join(OUT, `${pid}_DIAG_edu.txt`), out.eduBody);
    console.log(`\n=== ${pid} === profileId=${out.profileId} photo=${out.photo} (field present:${out.hasPhotoField})`);
    console.log(`   exp: status=${out.expStatus} len=${out.expLen} | edu: status=${out.eduStatus} len=${out.eduLen}`);
    await page.waitForTimeout(1500);
  }
} catch (e) { console.error("ERR", e); } finally { await ctx.close(); }

// parse with the FIXED production parser
const bundle = join(OUT, "_rsc_parser_bundle.mjs");
await esbuild.build({ entryPoints: [join(ROOT, "extension/content-script/rsc-profile-client.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "error",
  plugins: [{ name: "s", setup(b) { b.onResolve({ filter: /voyager-list-client/ }, () => ({ path: "v", namespace: "s" })); b.onLoad({ filter: /.*/, namespace: "s" }, () => ({ contents: "export class RateLimitedError extends Error{constructor(s){super('rl');this.status=s;}}", loader: "js" })); } }] });
const { __test } = await import(pathToFileURL(bundle).href);

for (const pid of PIDS) {
  console.log(`\n######## ${pid} (FIXED parser) ########`);
  try {
    const exp = __test.parseExperienceFlight(readFileSync(join(OUT, `${pid}_DIAG_exp.txt`), "utf8"));
    console.log(`EXPERIENCE (${exp.length}):`);
    exp.forEach((e) => console.log(`  • ${e.title} @ ${e.company} ${JSON.stringify(e.dateRange)} ${e.location || ""}`));
  } catch (e) { console.log("exp err:", e.message); }
  try {
    const edu = __test.parseEducationFlight(readFileSync(join(OUT, `${pid}_DIAG_edu.txt`), "utf8"));
    console.log(`EDUCATION (${edu.length}):`);
    edu.forEach((e) => console.log(`  • ${e.school} — ${e.degree || "-"} ${JSON.stringify(e.dateRange)}`));
  } catch (e) { console.log("edu err:", e.message); }
}
