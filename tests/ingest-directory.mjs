/**
 * ingest-directory.mjs — load the INSEAD CV-book into Supabase directory_profiles.
 *
 * Reads the canonical dataset in contact-db/output/ (contacts.jsonl +
 * contact_experiences.csv + contact_educations.csv), builds one row per alum
 * with experience/education_v2 as JSONB (same shape as contacts), and UPSERTS
 * into public.directory_profiles on directory_key (idempotent — re-run to
 * refresh). Shared reference data; uses the service role (bypasses RLS).
 *
 *   node tests/ingest-directory.mjs            # dry run: transform + summary + sample
 *   node tests/ingest-directory.mjs --commit   # actually upsert into Supabase
 *
 * Requires the table to exist first (apply 20260611000000_directory_profiles.sql).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "contact-db", "output");
const COMMIT = process.argv.includes("--commit");

// --- env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) ---
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
const SUPA = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY;

// --- minimal RFC4180 CSV parser (handles quotes, commas + newlines in fields) ---
function parseCSV(text) {
  text = text.replace(/^﻿/, ""); // strip BOM
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const splitList = (s) =>
  (s || "").split(";").map((x) => x.trim()).filter(Boolean);
const orEmpty = (s) => (s && s.trim() ? s.trim() : null);

// --- read sources ---
const people = readFileSync(join(OUT, "contacts.jsonl"), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l));
const exps = parseCSV(readFileSync(join(OUT, "contact_experiences.csv"), "utf8"));
const edus = parseCSV(readFileSync(join(OUT, "contact_educations.csv"), "utf8"));

// group child rows by contact_id, ordered by source_order
const byContact = (rows) => {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.contact_id)) m.set(r.contact_id, []);
    m.get(r.contact_id).push(r);
  }
  for (const arr of m.values())
    arr.sort((a, b) => Number(a.source_order ?? 0) - Number(b.source_order ?? 0));
  return m;
};
const expByC = byContact(exps);
const eduByC = byContact(edus);

function buildExperience(cid) {
  return (expByC.get(cid) ?? []).map((e) => ({
    title: orEmpty(e.title),
    company: orEmpty(e.company_name),
    location: orEmpty(e.location),
    description: orEmpty(e.description),
    dateRange: { start: orEmpty(e.start_date), end: orEmpty(e.end_date) },
  }));
}
function buildEducation(cid) {
  return (eduByC.get(cid) ?? []).map((e) => ({
    school: orEmpty(e.school_name),
    degree: orEmpty(e.degree),
    fieldOfStudy: orEmpty(e.field_of_study),
    dateRange: { start: orEmpty(e.start_date), end: orEmpty(e.end_date) },
  }));
}

const rows = people.map((p) => ({
  directory_key: p.contact_id,
  source: "insead_cv_book",
  name: p.name,
  first_name: orEmpty(p.first_name),
  last_name: orEmpty(p.last_name),
  headline: orEmpty(p.headline),
  current_title: orEmpty(p.current_title),
  company: orEmpty(p.current_company),
  location: orEmpty(p.location),
  photo_url: orEmpty(p.photo_url),
  linkedin_url: null,
  cohort: orEmpty(p.cohort),
  nationality: splitList(p.nationality),
  languages: splitList(p.languages),
  industries: splitList(p.industries),
  functions: splitList(p.functions),
  geography: splitList(p.geography),
  experience: buildExperience(p.contact_id),
  education_v2: buildEducation(p.contact_id),
}));

// --- summary ---
const withExp = rows.filter((r) => r.experience.length).length;
const withEdu = rows.filter((r) => r.education_v2.length).length;
const cohorts = [...new Set(rows.map((r) => r.cohort).filter(Boolean))];
console.log(`[ingest] built ${rows.length} directory rows`);
console.log(`  with experience: ${withExp} | with education: ${withEdu}`);
console.log(`  cohorts: ${cohorts.join(", ")}`);
console.log(`  sample:`, JSON.stringify(rows[0], null, 2).slice(0, 900));

if (!COMMIT) {
  console.log(`\n[ingest] DRY RUN — pass --commit to upsert into Supabase.`);
  process.exit(0);
}
if (!SUPA || !SVC) { console.error("Missing Supabase env."); process.exit(1); }

// --- upsert in chunks ---
const CHUNK = 200;
let done = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const res = await fetch(
    `${SUPA}/rest/v1/directory_profiles?on_conflict=directory_key`,
    {
      method: "POST",
      headers: {
        apikey: SVC,
        authorization: `Bearer ${SVC}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    }
  );
  if (!res.ok) {
    console.error(`[ingest] chunk ${i}-${i + batch.length} FAILED ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  done += batch.length;
  console.log(`[ingest] upserted ${done}/${rows.length}`);
}
console.log(`[ingest] DONE — ${done} directory_profiles upserted.`);
