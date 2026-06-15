/**
 * backfill-phones.mjs
 *
 * Reads contact-db/output/parsed_people.json (965 INSEAD CV-book entries),
 * normalises each phone, then:
 *
 *  1. Updates directory_profiles.phone — matched by linkedin_url (normalised),
 *     then by exact name as a fallback.
 *  2. Updates contacts.phone — matched by linkedin_url (normalised),
 *     then by exact name as a fallback.
 *
 * Uses the Supabase service-role REST client (bypasses RLS).
 * Run:  node tests/backfill-phones.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Env loader
// ---------------------------------------------------------------------------
function loadEnv(file) {
  const o = {};
  try {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) o[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // file may not exist
  }
  return o;
}
const ENV = { ...loadEnv(".env.local"), ...loadEnv(".env.vercel") };

const SUPA_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
  "content-type": "application/json",
  prefer: "return=minimal",
};

// ---------------------------------------------------------------------------
// URL normalisation: strip protocol prefix, trailing slash, query params,
// lowercase, and ensure consistent https:// prefix for comparison.
// Input may be "linkedin.com/in/foo" or "https://www.linkedin.com/in/foo/"
// Output: "https://www.linkedin.com/in/foo"
// ---------------------------------------------------------------------------
function normaliseLinkedIn(raw) {
  if (!raw) return null;
  let url = raw.trim().toLowerCase();
  // Strip protocol
  url = url.replace(/^https?:\/\//, "");
  // Strip www.
  url = url.replace(/^www\./, "");
  // Strip query string and fragment
  url = url.split("?")[0].split("#")[0];
  // Strip trailing slash
  url = url.replace(/\/+$/, "");
  return "https://www." + url;
}

// ---------------------------------------------------------------------------
// Load source data
// ---------------------------------------------------------------------------
const PEOPLE_PATH = join(ROOT, "contact-db/output/parsed_people.json");
const people = JSON.parse(readFileSync(PEOPLE_PATH, "utf8"));

// Filter to those with a phone
const withPhone = people.filter((p) => p.frontmatter?.phone);
console.log(`[backfill] Source: ${people.length} entries, ${withPhone.length} have a phone`);

// Build lookup maps: normalised linkedin_url → phone, name → phone
const byLinkedIn = new Map(); // normalised URL → { phone, name }
const byName = new Map();     // name → phone

for (const person of withPhone) {
  const phone = person.frontmatter.phone;
  const name = person.name || person.frontmatter?.name;
  const rawLinkedin = person.frontmatter?.linkedin;
  const normLinkedin = normaliseLinkedIn(rawLinkedin);

  if (normLinkedin) {
    byLinkedIn.set(normLinkedin, { phone, name });
  }
  if (name) {
    byName.set(name, phone);
  }
}

console.log(`[backfill] LinkedIn index: ${byLinkedIn.size} entries`);
console.log(`[backfill] Name index: ${byName.size} entries`);

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

/** PATCH a batch of rows by IDs, setting phone. */
async function patchPhones(table, idPhonePairs) {
  // Supabase REST doesn't do batch updates per row, so we do one-by-one
  // but fire them in parallel for speed.
  const results = await Promise.allSettled(
    idPhonePairs.map(({ id, phone }) =>
      fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ phone }),
      }).then((r) => {
        if (!r.ok) {
          return r.text().then((t) => Promise.reject(new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`)));
        }
        return { id, phone };
      })
    )
  );

  let ok = 0, fail = 0;
  for (const r of results) {
    if (r.status === "fulfilled") ok++;
    else { fail++; console.error(`  PATCH error: ${r.reason}`); }
  }
  return { ok, fail };
}

/** Fetch all rows from a table for matching, paginated. */
async function fetchAll(table, select) {
  const PAGE = 1000;
  let offset = 0;
  const rows = [];
  while (true) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${select}&limit=${PAGE}&offset=${offset}`,
      { headers: { ...HEADERS, prefer: "count=exact" } }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`fetchAll ${table} HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    rows.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Helper: match rows against the phone index
// ---------------------------------------------------------------------------
function buildPatches(rows, colLinkedIn, colName) {
  const patches = [];
  const matchedByUrl = new Set();
  const matchedByName = new Set();

  for (const row of rows) {
    if (row.phone) continue; // already has phone, skip

    const normUrl = normaliseLinkedIn(row[colLinkedIn]);
    const name = row[colName];

    if (normUrl && byLinkedIn.has(normUrl)) {
      patches.push({ id: row.id, phone: byLinkedIn.get(normUrl).phone });
      matchedByUrl.add(row.id);
    } else if (name && byName.has(name)) {
      patches.push({ id: row.id, phone: byName.get(name) });
      matchedByName.add(row.id);
    }
  }

  return { patches, matchedByUrl: matchedByUrl.size, matchedByName: matchedByName.size };
}

// ---------------------------------------------------------------------------
// 1. Backfill directory_profiles
// ---------------------------------------------------------------------------
console.log("\n[backfill] Fetching directory_profiles…");
const dirRows = await fetchAll("directory_profiles", "id,linkedin_url,name,phone");
console.log(`[backfill] directory_profiles: ${dirRows.length} rows`);

const { patches: dirPatches, matchedByUrl: dirByUrl, matchedByName: dirByName } = buildPatches(dirRows, "linkedin_url", "name");
console.log(`[backfill] directory_profiles matches: ${dirPatches.length} (${dirByUrl} by URL, ${dirByName} by name)`);

let dirResult = { ok: 0, fail: 0 };
if (dirPatches.length > 0) {
  console.log(`[backfill] Patching ${dirPatches.length} directory_profiles rows…`);
  dirResult = await patchPhones("directory_profiles", dirPatches);
  console.log(`[backfill] directory_profiles: ${dirResult.ok} updated, ${dirResult.fail} failed`);
} else {
  console.log("[backfill] No directory_profiles rows to update.");
}

// ---------------------------------------------------------------------------
// 2. Backfill contacts
// ---------------------------------------------------------------------------
console.log("\n[backfill] Fetching contacts…");
const contactRows = await fetchAll("contacts", "id,linkedin_url,name,phone");
console.log(`[backfill] contacts: ${contactRows.length} rows`);

const { patches: contactPatches, matchedByUrl: contactByUrl, matchedByName: contactByName } = buildPatches(contactRows, "linkedin_url", "name");
console.log(`[backfill] contacts matches: ${contactPatches.length} (${contactByUrl} by URL, ${contactByName} by name)`);

let contactResult = { ok: 0, fail: 0 };
if (contactPatches.length > 0) {
  console.log(`[backfill] Patching ${contactPatches.length} contacts rows…`);
  contactResult = await patchPhones("contacts", contactPatches);
  console.log(`[backfill] contacts: ${contactResult.ok} updated, ${contactResult.fail} failed`);
} else {
  console.log("[backfill] No contacts rows to update.");
}

// ---------------------------------------------------------------------------
// 3. Summary
// ---------------------------------------------------------------------------
console.log("\n=== BACKFILL SUMMARY ===");
console.log(`directory_profiles — matched: ${dirPatches.length}, updated OK: ${dirResult.ok}, failed: ${dirResult.fail}`);
console.log(`contacts           — matched: ${contactPatches.length}, updated OK: ${contactResult.ok}, failed: ${contactResult.fail}`);
