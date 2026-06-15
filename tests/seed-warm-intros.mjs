/**
 * seed-warm-intros.mjs
 *
 * Seeds Supabase so that the GET /api/warm-intros feature is immediately
 * testable without real classmates:
 *
 *  User A  = deed7f54-3c3c-40a9-bf20-2e17bc6192e0  (liyang.guo@essec.edu)
 *  User B  = 5b68d845-d4ed-4c33-8a0f-c72995925977  (b00611490@essec.edu)
 *
 * What this script does:
 *  1. Sets A.linkedin_urn = urn:li:fsd_profile:TEST-A, A.share_network_for_intros = true
 *  2. Sets B.linkedin_urn = urn:li:fsd_profile:TEST-B, B.share_network_for_intros = true
 *  3. Upserts a contact row in A's contacts with linkedin_urn = TEST-B  (A↔B bridge)
 *  4. Upserts 3 candidate contacts in B's contacts — PE/VC / AI PM in Paris —
 *     with linkedin_urns NOT in A's contacts.
 *  5. Prints confirmation + the expected curl to test the matching.
 *
 * Run: node tests/seed-warm-intros.mjs
 *
 * Uses service-role REST directly — does NOT start the Next.js server.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------

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
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const USER_A_ID = "deed7f54-3c3c-40a9-bf20-2e17bc6192e0";
const USER_B_ID = "5b68d845-d4ed-4c33-8a0f-c72995925977";
const URN_A = "urn:li:fsd_profile:TEST-A";
const URN_B = "urn:li:fsd_profile:TEST-B";

// Candidate URNs (must NOT be in A's contacts)
const CANDIDATE_URN_1 = "urn:li:fsd_profile:CAND-PE-PARIS-001";
const CANDIDATE_URN_2 = "urn:li:fsd_profile:CAND-VC-PARIS-002";
const CANDIDATE_URN_3 = "urn:li:fsd_profile:CAND-AIPM-PARIS-003";

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

async function restPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${path} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

/**
 * Upsert a contact by checking existence first (partial-index-safe).
 * Matches on user_id + linkedin_url (when present) or user_id + linkedin_urn.
 */
async function upsertContact(contact) {
  // Check for existing row
  const filter = contact.linkedin_url
    ? `user_id=eq.${contact.user_id}&linkedin_url=eq.${encodeURIComponent(contact.linkedin_url)}`
    : `user_id=eq.${contact.user_id}&linkedin_urn=eq.${encodeURIComponent(contact.linkedin_urn)}`;

  const existing = await restGet(`contacts?${filter}&select=id`);

  if (existing.length > 0) {
    // Update existing row
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(contact),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`PATCH contacts failed ${res.status}: ${text}`);
    return { action: "updated", data: JSON.parse(text) };
  } else {
    // Insert new row
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(contact),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`INSERT contacts failed ${res.status}: ${text}`);
    return { action: "inserted", data: JSON.parse(text) };
  }
}

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Step 1 & 2: Set A and B opt-in + urns
// ---------------------------------------------------------------------------

console.log("\n[1/5] Setting A opt-in + URN…");
await restPatch(`users?id=eq.${USER_A_ID}`, {
  linkedin_urn: URN_A,
  share_network_for_intros: true,
});
const [userA] = await restGet(`users?id=eq.${USER_A_ID}&select=id,email,linkedin_urn,share_network_for_intros`);
console.log("  A:", userA);

console.log("[2/5] Setting B opt-in + URN…");
await restPatch(`users?id=eq.${USER_B_ID}`, {
  linkedin_urn: URN_B,
  share_network_for_intros: true,
});
const [userB] = await restGet(`users?id=eq.${USER_B_ID}&select=id,email,linkedin_urn,share_network_for_intros`);
console.log("  B:", userB);

// ---------------------------------------------------------------------------
// Step 3: Give A a contact row for B (so A is "connected" to B)
// ---------------------------------------------------------------------------

console.log("[3/5] Upserting A→B bridge contact in A's contacts…");
const now = new Date().toISOString();
const bridgeContact = {
  user_id: USER_A_ID,
  name: "Test Peer B",
  linkedin_url: "https://www.linkedin.com/in/test-peer-b",
  linkedin_urn: URN_B,
  current_title: "Seed Test User",
  company: "Warmly Test",
  location: "Paris, France",
  source: "manual_url",
  status: "discovered",
  discovered_at: now,
  career_history: [],
  education: [],
};
const bridgeResult = await upsertContact(bridgeContact);
console.log(`  Bridge contact (${bridgeResult.action}):`);
const [aContactForB] = await restGet(
  `contacts?user_id=eq.${USER_A_ID}&linkedin_urn=eq.${encodeURIComponent(URN_B)}&select=id,name,linkedin_urn`
);
console.log("  A→B bridge contact:", aContactForB);

// ---------------------------------------------------------------------------
// Step 4: Give B 3 candidate contacts matching A's goal (PE/VC/AI PM in Paris)
// ---------------------------------------------------------------------------

console.log("[4/5] Upserting 3 PE/VC/AI candidates in B's contacts…");
const candidates = [
  {
    user_id: USER_B_ID,
    name: "Claire Fontaine",
    linkedin_url: "https://www.linkedin.com/in/claire-fontaine-pe",
    linkedin_urn: CANDIDATE_URN_1,
    current_title: "Principal",
    company: "Ardian Private Equity",
    location: "Paris, France",
    source: "manual_url",
    status: "discovered",
    discovered_at: now,
    career_history: [],
    education: [],
  },
  {
    user_id: USER_B_ID,
    name: "Thomas Leroy",
    linkedin_url: "https://www.linkedin.com/in/thomas-leroy-vc",
    linkedin_urn: CANDIDATE_URN_2,
    current_title: "Investment Manager",
    company: "Partech Ventures",
    location: "Paris, France",
    source: "manual_url",
    status: "discovered",
    discovered_at: now,
    career_history: [],
    education: [],
  },
  {
    user_id: USER_B_ID,
    name: "Sophie Marceau",
    linkedin_url: "https://www.linkedin.com/in/sophie-marceau-ai",
    linkedin_urn: CANDIDATE_URN_3,
    current_title: "AI Product Manager",
    company: "Mistral AI",
    location: "Paris, France",
    source: "manual_url",
    status: "discovered",
    discovered_at: now,
    career_history: [],
    education: [],
  },
];

for (const c of candidates) {
  const r = await upsertContact(c);
  console.log(`  ${r.action}: ${c.name} @ ${c.company}`);
}

// ---------------------------------------------------------------------------
// Step 5: Verify matching by SQL query (avoids REST URL-length limits for
//         large contact sets). Directly confirm TEST-B is a bridge peer and
//         the 3 candidates appear in B's contacts.
// ---------------------------------------------------------------------------

console.log("\n[5/5] Verifying seed data via targeted queries…");

// 5a: Confirm A has a contact with URN = TEST-B
const aBridgeContacts = await restGet(
  `contacts?user_id=eq.${USER_A_ID}&linkedin_urn=eq.${encodeURIComponent(URN_B)}&select=id,name,linkedin_urn`
);
console.log(`  A→B bridge contact (should be 1): ${aBridgeContacts.length}`, aBridgeContacts);

// 5b: Confirm B is opted in + has the right URN
const [bStatus] = await restGet(
  `users?id=eq.${USER_B_ID}&select=id,email,linkedin_urn,share_network_for_intros`
);
console.log(`  B status:`, bStatus);

// 5c: Fetch B's candidates and confirm the 3 seeded ones are there
const bCandidates = await restGet(
  `contacts?user_id=eq.${USER_B_ID}&linkedin_urn=in.(${CANDIDATE_URN_1},${CANDIDATE_URN_2},${CANDIDATE_URN_3})&select=id,name,current_title,company,location,linkedin_urn`
);
console.log(`\n  B's seeded candidates (expect 3):`, bCandidates.length);
for (const c of bCandidates) {
  console.log(`    - ${c.name} (${c.current_title} @ ${c.company}, ${c.location})`);
}

// 5d: Confirm none of the candidate URNs exist in A's contacts (no conflict)
const conflicts = await restGet(
  `contacts?user_id=eq.${USER_A_ID}&linkedin_urn=in.(${CANDIDATE_URN_1},${CANDIDATE_URN_2},${CANDIDATE_URN_3})&select=id,name,linkedin_urn`
);
console.log(`\n  Conflicts in A's contacts (expect 0): ${conflicts.length}`);

if (bCandidates.length === 3 && aBridgeContacts.length === 1 && conflicts.length === 0) {
  console.log("\n  [PASS] All seed data verified. GET /api/warm-intros should return 3 candidates via Test Peer B.");
} else {
  console.log("\n  [WARN] Some checks failed. Review output above.");
}

console.log("\n[seed] Done. To test the live endpoint:");
console.log("  GET /api/warm-intros  (must be authenticated as user A)");
console.log(`  User A id: ${USER_A_ID}`);
console.log(`  User B id: ${USER_B_ID}`);
