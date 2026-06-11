/**
 * apply-migration.mjs — run a SQL migration file against Supabase via the
 * Management API (needs SUPABASE_ACCESS_TOKEN, a Personal Access Token).
 *
 *   node tests/apply-migration.mjs supabase/migrations/<file>.sql
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv(file) {
  const o = {};
  try {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return o;
}
const ENV = { ...loadEnv(".env.local"), ...loadEnv(".env.vercel") };
const PAT = ENV.SUPABASE_ACCESS_TOKEN;
const REF = (ENV.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

const file = process.argv[2];
if (!file) { console.error("usage: node tests/apply-migration.mjs <path.sql>"); process.exit(1); }
if (!PAT || !REF) { console.error("Missing SUPABASE_ACCESS_TOKEN or project ref."); process.exit(1); }

const sql = readFileSync(join(ROOT, file), "utf8");
console.log(`[migrate] applying ${file} (${sql.length} chars) to project ${REF}…`);

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
if (!res.ok) { console.error(`[migrate] FAILED ${res.status}: ${text.slice(0, 800)}`); process.exit(1); }
console.log(`[migrate] OK ${res.status}. ${text.slice(0, 200)}`);
