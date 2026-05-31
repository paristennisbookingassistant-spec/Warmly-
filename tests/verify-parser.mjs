/** Bundles the REAL extension parser (rsc-profile-client.ts __test exports) and
 * runs it against captured payloads to confirm the TS port matches the verified
 * reference logic before the live test. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(__dirname, "probe-out");
const require = createRequire(join(ROOT, "extension/package.json"));
const esbuild = require("esbuild");

const bundle = join(OUT, "_rsc_parser_bundle.mjs");
await esbuild.build({
  entryPoints: [join(ROOT, "extension/content-script/rsc-profile-client.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundle,
  logLevel: "error",
  plugins: [{
    name: "stub-vlc",
    setup(b) {
      b.onResolve({ filter: /voyager-list-client/ }, () => ({ path: "vlc", namespace: "stub" }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
        contents: "export class RateLimitedError extends Error { constructor(s){ super('rl'); this.status=s; } }",
        loader: "js",
      }));
    },
  }],
});

const { __test } = await import(pathToFileURL(bundle).href);

function load(name) {
  let c = readFileSync(join(OUT, name), "utf8");
  if (c.startsWith("URL:")) { const i = c.indexOf("\n\n"); c = i >= 0 ? c.slice(i + 2) : c; }
  return c;
}

for (const pid of ["mariana-alvaro", "daominhanh10", "anishka-moona", "puneet-d-b1563aa"]) {
  console.log(`\n###### ${pid} ######`);
  const exp = __test.parseExperienceFlight(load(`${pid}_REPLAY_expBody.txt`));
  console.log(`EXPERIENCE (${exp.length}):`);
  exp.forEach((e) => console.log(`  • ${e.title} @ ${e.company} ${e.dateRange.start}→${e.dateRange.end} | ${e.location || "-"}`));
  const edu = __test.parseEducationFlight(load(`${pid}_REPLAY_eduBody.txt`));
  console.log(`EDUCATION (${edu.length}):`);
  edu.forEach((e) => console.log(`  • ${e.school} — ${e.degree || "-"} / ${e.fieldOfStudy || "-"} [${e.dateRange.start}→${e.dateRange.end}]`));
}
