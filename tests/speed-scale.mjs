/**
 * speed-scale.mjs — READ-ONLY pressure test: deep-fetch (experience+education)
 * over N profiles at a fixed delay, to find the volume/rate where LinkedIn
 * detection engages. Parameterized version of speed-sustained.mjs.
 *
 * Usage: node tests/speed-scale.mjs <count> <delayMs>
 *   e.g. node tests/speed-scale.mjs 300 700
 *
 * Safety:
 * - Stops on 3 consecutive failures (clear block signal).
 * - Stops if rolling failure rate over the last 30 exceeds 20% (clustering).
 * - Audits ALL non-GET linkedin.com requests against a forbidden-write regex.
 * - The rsc-action POST is a data READ (see docs/LINKEDIN_GUARDRAILS.md).
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROFILE = join(ROOT, ".playwright-profile");
const COUNT = Math.max(1, parseInt(process.argv[2] || "150", 10));
const DELAY_MS = Math.max(0, parseInt(process.argv[3] || "700", 10));
const FORBIDDEN_RE = /\/(messaging\/.*\/(create|send)|invitation|connections\/invite|ugcPosts|\/posts\b|shares\/|reactions|comments\/create|follow\b)/i;

const raw = JSON.parse(readFileSync(join(ROOT, "contact-db", "output", "_probe350.json"), "utf8"));
const profiles = raw.map((r) => ({
  name: r.name,
  publicId: (r.linkedin_url.match(/\/in\/([^/?#]+)/) || [])[1] || "",
  profileId: (r.linkedin_urn || "").replace("urn:li:fsd_profile:", ""),
})).filter((p) => p.publicId && p.profileId).slice(0, COUNT);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, args: ["--window-position=-9999,-9999", "--window-size=1366,1000"],
});
const writes = [];
ctx.on("request", (req) => {
  const u = req.url(), m = req.method();
  if (u.includes("linkedin.com") && m !== "GET" && m !== "OPTIONS" && FORBIDDEN_RE.test(u)) writes.push(`${m} ${u.slice(0,110)}`);
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let consec = 0;
const t0 = Date.now();

try {
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  await sleep(2500);
  if (!page.url().includes("/feed")) { console.log("NOT authed — abort"); await ctx.close(); process.exit(1); }
  console.log(`[scale] ${profiles.length} profiles @ ${DELAY_MS}ms delay\n`);

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const r = await page.evaluate(async ({ publicId, profileId }) => {
      const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1] || "";
      function body(section) {
        const ref = `com.linkedin.sdui.profile.card.ref${profileId}${section}DetailsSection`;
        const payload = { vanityName: publicId, profileId, start: 0, count: 50, detailSectionReplaceableComponentRef: ref };
        const pagerId = `com.linkedin.sdui.pagers.profile.details.${section.toLowerCase()}`;
        return { pagerId, clientArguments: { $type: "proto.sdui.actions.requests.RequestedArguments", payload, requestedStateKeys: [], requestMetadata: { $type: "proto.sdui.common.RequestMetadata" }, states: [] }, paginationRequest: { $type: "proto.sdui.actions.requests.PaginationRequest", pagerId, requestedArguments: { $type: "proto.sdui.actions.requests.RequestedArguments", payload, requestedStateKeys: [], requestMetadata: { $type: "proto.sdui.common.RequestMetadata" } }, trigger: { $case: "itemDistanceTrigger", itemDistanceTrigger: { $type: "proto.sdui.actions.requests.ItemDistanceTrigger", preloadDistance: 3, preloadLength: 250 } }, retryCount: 2 } };
      }
      async function post(section) {
        const pagerId = `com.linkedin.sdui.pagers.profile.details.${section.toLowerCase()}`;
        const url = `https://www.linkedin.com/flagship-web/rsc-action/actions/pagination?sduiid=${pagerId}&parentSpanId=AAAAAAAAAAA%3D`;
        const t = performance.now();
        try {
          const res = await fetch(url, { method: "POST", credentials: "include", headers: { "content-type": "application/json", "csrf-token": csrf, "x-li-rsc-stream": "true", referer: `https://www.linkedin.com/in/${publicId}/details/${section.toLowerCase()}/` }, body: JSON.stringify(body(section)) });
          const text = await res.text();
          return { status: res.status, ms: Math.round(performance.now() - t), len: text.length };
        } catch (e) { return { status: -1, ms: Math.round(performance.now() - t), len: 0 }; }
      }
      const exp = await post("Experience");
      const edu = await post("Education");
      return { exp, edu };
    }, p);

    const ok = r.exp.status === 200 && r.exp.len > 500 && r.edu.status === 200 && r.edu.len > 300;
    const rateLimited = r.exp.status === 429 || r.exp.status === 999 || r.edu.status === 429 || r.edu.status === 999;
    const total = r.exp.ms + r.edu.ms;
    results.push({ i, name: p.name, publicId: p.publicId, ok, total, expStatus: r.exp.status, eduStatus: r.edu.status, expLen: r.exp.len, eduLen: r.edu.len });

    if (!ok || i % 25 === 0 || i === profiles.length - 1)
      console.log(`  #${String(i).padStart(3)} ${ok ? "OK " : "FAIL"} exp=${r.exp.status}/${String(r.exp.len).padStart(6)} edu=${r.edu.status}/${String(r.edu.len).padStart(5)} ${String(total).padStart(5)}ms  ${p.name.slice(0,22)}`);

    if (rateLimited) { console.log(`\n[scale] HARD STOP — rate-limit status (429/999) at #${i}.`); break; }
    if (!ok) { consec++; if (consec >= 3) { console.log(`\n[scale] 3 consecutive failures at #${i} — blocked, stopping.`); break; } }
    else consec = 0;

    // Clustering circuit breaker: >20% failures in the trailing 30
    if (results.length >= 30) {
      const last30 = results.slice(-30);
      const fr = last30.filter((x) => !x.ok).length / 30;
      if (fr > 0.2) { console.log(`\n[scale] Trailing-30 failure rate ${(fr*100).toFixed(0)}% at #${i} — detection onset, stopping.`); break; }
    }

    await sleep(DELAY_MS);
  }
} catch (e) { console.error("ERR", e); } finally {
  const ok = results.filter(r => r.ok);
  const fails = results.filter(r => !r.ok);
  const wall = Math.round((Date.now() - t0) / 1000);
  const avgLat = ok.length ? Math.round(ok.reduce((s,r)=>s+r.total,0)/ok.length) : 0;
  console.log("\n========== SCALE SUMMARY ==========");
  console.log(`params: count=${COUNT} delay=${DELAY_MS}ms`);
  console.log(`tested: ${results.length} | ok: ${ok.length} | failed: ${fails.length} | wall: ${wall}s`);
  console.log(`avg deep-fetch latency: ${avgLat}ms | effective pace: ${results.length ? Math.round(wall*1000/results.length) : 0}ms/profile`);
  if (fails.length) console.log(`failure indices: ${fails.map(f=>f.i).join(", ")}  (clustered-at-end = rate-limit onset; scattered = transient)`);
  const perProfile = avgLat + DELAY_MS;
  console.log(`extrapolated to 1,000 @ this pace: ~${(perProfile*1000/60000).toFixed(0)} min`);
  console.log(`verdict: ${fails.length === 0 ? "CLEAN" : fails.length / Math.max(1,results.length) <= 0.05 ? "MOSTLY CLEAN (within ~2-4% edge-case rate)" : "DEGRADED — anti-bot likely engaging"}`);
  console.log(`forbidden writes: ${writes.length || "0 (clean)"}`);
  writeFileSync(join(ROOT, "contact-db", "output", `_scale_${COUNT}_${DELAY_MS}.json`), JSON.stringify({ count: COUNT, delay: DELAY_MS, results, wall, writes }, null, 2));
  await ctx.close();
}
