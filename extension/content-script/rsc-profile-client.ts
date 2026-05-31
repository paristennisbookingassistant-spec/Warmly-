/**
 * content-script/rsc-profile-client.ts
 *
 * Fetches deep experience + education for a LinkedIn profile and parses the
 * result. Runs INSIDE the content script so the user's session cookies attach
 * automatically.
 *
 * ── How it works (verified live, 2026-05-31) ───────────────────────────────
 * LinkedIn's profile is now a fully server-driven UI (SDUI). There is NO clean
 * JSON API for experience/education (profileView → 410 Gone; no GraphQL call
 * returns it). The data is delivered as a React Server Components (Flight) wire
 * payload by the SDUI pagination endpoint that the profile page itself calls
 * when you scroll a section:
 *
 *   POST /flagship-web/rsc-action/actions/pagination
 *        ?sduiid=com.linkedin.sdui.pagers.profile.details.{experience|education}
 *        &parentSpanId=<any>            ← NOT validated; a constant works
 *   body: { pagerId, clientArguments:{ payload:{ vanityName, profileId,
 *           start, count, detailSectionReplaceableComponentRef } ... } ... }
 *
 * The body is fully constructible from the public identifier + the fsd_profile
 * id (the connection URN minus its "urn:li:fsd_profile:" prefix) — both of which
 * Phase 1 already captured. One scoped POST per section returns the COMPLETE
 * list (count: 50), not just the SSR'd first page.
 *
 * The response is a Flight stream (newline-separated "id:value" rows with
 * $<id> cross-references). We resolve the references, walk the tree, group
 * leaves by their nearest `entity-collection-item` card (experience) or read the
 * flat ordered leaf stream (education), and structure each card's fields.
 *
 * ── Read-only ──────────────────────────────────────────────────────────────
 * This POST is a DATA READ (it returns the profile's public experience/education
 * exactly as the page renders on scroll). It performs NO state-changing action —
 * no message, connection, post, like, or profile edit. It complies with
 * docs/LINKEDIN_GUARDRAILS.md (which prohibits state-changing actions, not data
 * fetches). The output shape matches the backend bulk-import Zod contract.
 */

import type { VoyagerProfile } from "../shared/types";
import { RateLimitedError } from "./voyager-list-client";

// ---------------------------------------------------------------------------
// Public entry types (match the backend ExperienceEntrySchema / EducationEntrySchema)
// ---------------------------------------------------------------------------

export type ExperienceEntry = VoyagerProfile["experience"][number];
export type EducationEntry = VoyagerProfile["education"][number];

type Section = "experience" | "education";

// ---------------------------------------------------------------------------
// Network: POST the SDUI pagination action for one profile section
// ---------------------------------------------------------------------------

function buildActionBody(publicId: string, profileId: string, section: Section) {
  const Section = section === "experience" ? "Experience" : "Education";
  const pagerId = `com.linkedin.sdui.pagers.profile.details.${section}`;
  const screenId = `com.linkedin.sdui.flagshipnav.profile.Profile${Section}Details`;
  const ref = `com.linkedin.sdui.profile.card.ref${profileId}${Section}DetailsSection`;
  const payload = {
    vanityName: publicId,
    profileId,
    start: 0,
    count: 50,
    detailSectionReplaceableComponentRef: ref,
  };
  const requestedArguments = {
    $type: "proto.sdui.actions.requests.RequestedArguments",
    payload,
    requestedStateKeys: [],
    requestMetadata: { $type: "proto.sdui.common.RequestMetadata" },
  };
  return {
    pagerId,
    clientArguments: { ...requestedArguments, states: [], screenId },
    paginationRequest: {
      $type: "proto.sdui.actions.requests.PaginationRequest",
      pagerId,
      requestedArguments,
      trigger: {
        $case: "itemDistanceTrigger",
        itemDistanceTrigger: {
          $type: "proto.sdui.actions.requests.ItemDistanceTrigger",
          preloadDistance: 3,
          preloadLength: 250,
        },
      },
      retryCount: 2,
    },
  };
}

/**
 * Fetches the raw Flight stream for a profile section. Returns null on a
 * non-OK/empty response. Throws RateLimitedError on HTTP 429/999.
 */
async function fetchSectionFlight(
  publicId: string,
  profileId: string,
  section: Section,
  csrfToken: string
): Promise<string | null> {
  const pagerId = `com.linkedin.sdui.pagers.profile.details.${section}`;
  const url =
    `https://www.linkedin.com/flagship-web/rsc-action/actions/pagination` +
    `?sduiid=${encodeURIComponent(pagerId)}&parentSpanId=AAAAAAAAAAA%3D`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "csrf-token": csrfToken,
        "x-li-rsc-stream": "true",
        "x-li-anchor-page-key": `d_flagship3_profile_view_base_${section}_details`,
        referer: `https://www.linkedin.com/in/${encodeURIComponent(publicId)}/details/${section}/`,
      },
      body: JSON.stringify(buildActionBody(publicId, profileId, section)),
    });
  } catch (err) {
    console.error(`[RscProfile] Network error fetching ${section} for ${publicId}:`, err);
    return null;
  }

  if (response.status === 429 || response.status === 999) {
    console.warn(`[RscProfile] Rate limited (HTTP ${response.status}) for ${publicId}/${section}`);
    throw new RateLimitedError(response.status);
  }
  if (!response.ok) {
    console.warn(`[RscProfile] HTTP ${response.status} for ${publicId}/${section}`);
    return null;
  }

  try {
    const text = await response.text();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error("[RscProfile] Failed to read response text:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Flight deserialization — chunk map + lazy reference resolution
// ---------------------------------------------------------------------------

interface FlightWalkResult {
  cards: Array<{ id: string; leaves: string[] }>;
  flat: string[];
}

const SKIP_LEAVES = new Set(["SHORT_PRESS", "LONG_PRESS", "SWIPE", "default"]);

function isJunkLeaf(t: string): boolean {
  if (!t) return true;
  if (SKIP_LEAVES.has(t)) return true;
  if (t[0] === "$") return true;
  if (t.startsWith("var(")) return true;
  if (/^_?[0-9a-f]{6,}$/.test(t)) return true;
  if (t[0] === "{" && t.endsWith("}")) return true; // stray json fragment
  // Media alt-text noise — "Thumbnail for <post>", "<X> cover photo", etc.
  // These are image accessibility strings, never experience/education content,
  // and their "X, Y …" shape can be mistaken for a location.
  if (/^Thumbnail\b/i.test(t)) return true;
  if (/\bcover photo$/i.test(t)) return true;
  // Skills-section noise that trails a role: "Skills:", "Skills for X at Y",
  // "SAP IBP, … +6 skills".
  if (/^Skills(:| for )/i.test(t)) return true;
  if (/\+\d+\s+skills?\b/i.test(t)) return true;
  if (t.length > 600) return true;
  return false;
}

/**
 * Advances a JS-string index by `byteLen` UTF-8 bytes. React-Flight text rows
 * (`T<hexlen>,<text>`) declare their length in bytes and the text can contain
 * newlines, so we must honour the byte length rather than split on "\n".
 */
function advanceBytes(str: string, start: number, byteLen: number): number {
  let bytes = 0;
  let i = start;
  while (i < str.length && bytes < byteLen) {
    const cp = str.codePointAt(i)!;
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    i += cp > 0xffff ? 2 : 1;
  }
  return i;
}

/**
 * Builds the Flight chunk map (id → raw row value). CRITICAL: text rows
 * (`T<hexlen>,<text>`) may contain embedded newlines (multi-line job
 * descriptions), so we read exactly `<hexlen>` UTF-8 bytes for those and only
 * split on "\n" for ordinary single-line rows. A naive `body.split("\n")`
 * mis-segments multi-line descriptions into bogus rows, corrupting reference
 * resolution and dropping entire experience cards.
 */
function buildChunkMap(body: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  const n = body.length;
  while (i < n) {
    const colon = body.indexOf(":", i);
    if (colon < 0) break;
    const id = body.slice(i, colon);
    if (!/^[0-9a-f]+$/.test(id)) {
      // Not a real row start (stray continuation) — skip to the next line.
      const nl = body.indexOf("\n", i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    if (body[colon + 1] === "T") {
      const comma = body.indexOf(",", colon + 1);
      const hexlen = parseInt(body.slice(colon + 2, comma), 16) || 0;
      const textEnd = advanceBytes(body, comma + 1, hexlen);
      map.set(id, body.slice(colon + 1, textEnd)); // keep "T<hex>,<text>"
      i = textEnd;
      if (body[i] === "\n") i++;
    } else {
      let nl = body.indexOf("\n", colon + 1);
      if (nl < 0) nl = n;
      map.set(id, body.slice(colon + 1, nl));
      i = nl + 1;
    }
  }
  return map;
}

function parseRowModel(raw: string | undefined): unknown {
  if (raw == null) return undefined;
  const t = raw[0];
  if (t === "I") return { __module: true };
  if (t === "H") return undefined;
  if (t === "T") {
    const c = raw.indexOf(",");
    return c >= 0 ? raw.slice(c + 1) : raw.slice(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Walks the Flight tree, resolving $<id> references (global visited-guard so
 * cycles can't explode), and collects text leaves both globally (flat) and
 * grouped by the nearest `entity-collection-item` card.
 */
function walkFlight(body: string): FlightWalkResult {
  const map = buildChunkMap(body);
  const cards: FlightWalkResult["cards"] = [];
  const flat: string[] = [];
  let current: { id: string; leaves: string[] } | null = null;
  const visited = new Set<string>();

  const push = (value: unknown): void => {
    const t = String(value).trim();
    if (isJunkLeaf(t)) return;
    flat.push(t);
    if (current) current.leaves.push(t);
  };

  const walk = (node: unknown, depth: number): void => {
    if (node == null || depth > 240) return;

    if (typeof node === "string") {
      if (node.length > 1 && node[0] === "$" && node !== "$") {
        if (node[1] === "$") return push(node.slice(1));
        const id = node[1] === "L" ? node.slice(2) : node.slice(1);
        if (!map.has(id) || visited.has(id)) return;
        visited.add(id);
        return walk(parseRowModel(map.get(id)), depth + 1);
      }
      // double-serialized Flight subtree stored as a string → re-parse + recurse
      if ((node.startsWith('[["$"') || node.startsWith('["$"')) && node.length > 8) {
        try {
          return walk(JSON.parse(node), depth + 1);
        } catch {
          /* fall through to push */
        }
      }
      return push(node);
    }

    if (Array.isArray(node)) {
      // Flight element: ["$", type, key, props]
      if (node[0] === "$" && node.length >= 4 && typeof node[1] === "string") {
        const props = node[3] as Record<string, unknown> | null;
        if (props && typeof props === "object" && typeof props.a11yText === "string") {
          push(props.a11yText);
        }
        return walk(props, depth + 1);
      }
      for (const el of node) walk(el, depth + 1);
      return;
    }

    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (obj.__module) return;
      const ck = (obj.componentkey ?? obj.componentKey) as string | undefined;
      const started = typeof ck === "string" && /entity-collection-item/.test(ck);
      const prev = current;
      if (started) {
        current = { id: ck as string, leaves: [] };
        cards.push(current);
      }
      if (typeof obj.a11yText === "string") push(obj.a11yText);
      if (obj.children !== undefined) walk(obj.children, depth + 1);
      if (obj.textProps !== undefined) walk(obj.textProps, depth + 1);
      if (typeof obj.text === "string") push(obj.text);
      for (const [k, v] of Object.entries(obj)) {
        if (
          ["children", "textProps", "text", "componentkey", "componentKey",
            "className", "style", "a11yText", "accessibilityText"].includes(k)
        ) continue;
        if (v && typeof v === "object") walk(v, depth + 1);
        else if (typeof v === "string" && v[0] === "$" && v !== "$") walk(v, depth + 1);
      }
      if (started) current = prev;
    }
  };

  for (const [id, raw] of map) {
    if (visited.has(id)) continue;
    const model = parseRowModel(raw);
    if (model && typeof model === "object" && !(model as Record<string, unknown>).__module) {
      walk(model, 0);
    }
  }

  return { cards, flat };
}

// ---------------------------------------------------------------------------
// Field classification
// ---------------------------------------------------------------------------

const EMPLOYMENT_TYPES = new Set([
  "Full-time", "Part-time", "Freelance", "Self-employed", "Contract",
  "Internship", "Apprenticeship", "Seasonal",
]);

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// Experience date range. Handles BOTH month form ("Jul 2025 - Present",
// "Jan 2025 - Oct 2025") AND year-only form ("2024 - 2025", "2019 - Present"),
// which some profiles use. Groups: 1=startMon? 2=startYear 3=endRaw 4=endMon? 5=endYear.
const EXP_DATE_RE = /^(?:([A-Z][a-z]{2}) )?(\d{4}) - (Present|(?:([A-Z][a-z]{2}) )?(\d{4}))/;
// Education range, e.g. "2018 – 2022" / "Jan 2026 – Dec 2026" (note en-dash)
const EDU_DATE_RE = /^((?:[A-Z][a-z]{2} )?\d{4})\s*[–\-—]\s*((?:[A-Z][a-z]{2} )?(?:\d{4}|Present))$/;
const DURATION_RE = /^[·•\s]*\d+\s*(yr|yrs|mo|mos)\b/;
// Work-mode suffix LinkedIn appends to locations: "Mumbai, India · Hybrid".
const WORK_MODE_RE = /\s*[·•]\s*(Hybrid|Remote|On-?site)\s*$/i;

function isLogo(t: string): boolean {
  return / logo$/.test(t);
}
function logoName(t: string): string {
  return t.replace(/ logo$/, "").trim();
}
function isEmploymentType(t: string): boolean {
  return EMPLOYMENT_TYPES.has(t.trim());
}
function isDuration(t: string): boolean {
  return DURATION_RE.test(t.trim());
}
/** Strips the "· Hybrid/Remote/On-site" work-mode suffix from a location. */
function cleanLocation(t: string): string {
  return t.replace(WORK_MODE_RE, "").trim();
}
function isLocation(t: string): boolean {
  const s = cleanLocation(t.trim());
  // Job-title words ("Assistant Manager, People Team") and connector words
  // ("Manager, Sales and Operations") signal a comma-bearing TITLE, never a
  // place name — reject so titles aren't lost to the location slot.
  if (JOB_WORD_RE.test(s)) return false;
  if (/\b(and|or|for|with)\b/i.test(s) || /&/.test(s)) return false;
  if (/ Area$/.test(s)) return true;
  // "City, Region[, Country]" — 1-3 comma-separated proper-noun segments.
  if (s.length < 80 && /^[A-Za-zÀ-ÿ.''\-\s]+(, [A-Za-zÀ-ÿ.''\-\s]+){1,3}$/.test(s)) return true;
  if (/^(Panama|France|Vietnam|Singapore|Germany|Spain|India|China|Brazil|Mexico|Canada|Australia|Switzerland|Belgium|Netherlands|Italy|Portugal|Japan|Remote)$/.test(s)) return true;
  return false;
}
/** A job-description bullet, not a title — multi-line, leading bullet, or very long. */
function isDescription(t: string): boolean {
  return /^[-•*–]\s/.test(t) || t.includes("\n") || t.length > 140;
}
/**
 * A type/duration meta line that must never be picked as a title, e.g.
 * "Full-time · 4 yrs 6 mos" (employment type + total duration on grouped cards)
 * or a bare duration "3 yrs 4 mos".
 */
function isMetaLine(t: string): boolean {
  const first = t.split(/\s*[·•]\s*/)[0]!.trim();
  return EMPLOYMENT_TYPES.has(first) || isDuration(t);
}
// Role words that disambiguate a "X, Y" comma-title (a job title) from a
// "City, Country" location.
const JOB_WORD_RE = /\b(Manager|Director|Engineer|Analyst|Lead|Head|Officer|Associate|Consultant|Intern|Internship|Coordinator|Specialist|Founder|President|VP|Coach|Advisor|Adviser|Team|Partner|Executive|Strategist|Designer|Developer|Scientist|Architect|Administrator|Supervisor|Representative|Agent|Assistant|Trainee|Fellow|Researcher|Counsel|Controller|Recruiter|Buyer|Planner|Operator|Technician|Editor|Producer|Banker|Trader|Auditor|Accountant|Teacher|Professor|Instructor|Chief|Owner|Principal|Stagiaire|Apprentice)\b/i;
function parseExpDate(t: string): { start: string | null; end: string | null } {
  const m = t.match(EXP_DATE_RE);
  if (!m) return { start: null, end: null };
  const start = m[1] ? `${m[2]}-${MONTHS[m[1]] ?? "01"}` : m[2]!;
  let end: string;
  if (m[3] === "Present") end = "Present";
  else end = m[4] ? `${m[5]}-${MONTHS[m[4]] ?? "01"}` : m[5]!;
  return { start, end };
}
function dedupAdjacent(arr: string[]): string[] {
  const out: string[] = [];
  for (const x of arr) if (out[out.length - 1] !== x) out.push(x);
  return out;
}

// ---------------------------------------------------------------------------
// Experience parsing — one entity-collection-item card → 1+ roles
// ---------------------------------------------------------------------------

function parseExperienceCard(rawLeaves: string[]): ExperienceEntry[] {
  const leaves = dedupAdjacent(rawLeaves);
  let companyLogo: string | null = null;
  for (const l of leaves) {
    if (isLogo(l)) { companyLogo = logoName(l); break; }
  }
  const toks = leaves.filter((l) => !isLogo(l));
  if (!toks.length) return [];

  const dateIdx: number[] = [];
  toks.forEach((t, i) => { if (EXP_DATE_RE.test(t)) dateIdx.push(i); });
  if (!dateIdx.length) return [];

  const roles: ExperienceEntry[] = [];

  if (dateIdx.length === 1) {
    // Single role: [Title, "Company · Type", Date, Location?, Description?]
    const di = dateIdx[0]!;
    const dateRange = parseExpDate(toks[di]!);
    let company = companyLogo;
    const ctLine = toks.find(
      (t, i) => i < di && / · /.test(t) && isEmploymentType(t.split(" · ").pop()!.trim())
    );
    if (ctLine) {
      const parts = ctLine.split(" · ");
      if (!company) company = parts[0]!.trim();
    }
    // Title is always BEFORE the date; never location-filter it (titles can
    // contain commas, e.g. "Consultant, Deal Advisory"), but skip description
    // bullets and type/duration meta lines that can render before the date.
    const title = toks.find(
      (t, i) => i < di && t !== ctLine && t !== company && !isMetaLine(t) && !isDescription(t)
    );
    const after = toks.slice(di + 1);
    const locRaw = after.find((t) => isLocation(t));
    const location = locRaw ? cleanLocation(locRaw) : undefined;
    const description = after.find((t) => !isLocation(t) && !isDuration(t) && !isEmploymentType(t)) ?? undefined;
    if (title && company) {
      roles.push({ title, company, dateRange, ...(location ? { location } : {}), ...(description ? { description } : {}) });
    }
  } else {
    // Grouped: [Company, "Type · TotalDur"?, GroupLoc?, (Title, Type?, Date, Loc?, Desc?)×N]
    let company = companyLogo;
    const headerIdx = toks.findIndex(
      (t) => !isMetaLine(t) && !isLocation(t) && !EXP_DATE_RE.test(t) && !isDescription(t)
    );
    if (!company && headerIdx >= 0) company = toks[headerIdx]!;
    let groupLoc: string | null = null;
    for (let j = 0; j < dateIdx[0]!; j++) {
      if (isLocation(toks[j]!)) { groupLoc = toks[j]!; break; }
    }
    const used = new Set<number>();
    if (headerIdx >= 0) used.add(headerIdx);
    let prevDate = -1;
    for (const di of dateIdx) {
      let title: string | null = null;
      for (let j = di - 1; j > prevDate; j--) {
        if (used.has(j)) continue;
        const t = toks[j]!;
        if (isMetaLine(t) || isLocation(t) || EXP_DATE_RE.test(t) || isDescription(t)) continue;
        if (t === company) continue;
        title = t; used.add(j); break;
      }
      let location: string | null = null;
      for (let j = di + 1; j < toks.length && !dateIdx.includes(j); j++) {
        if (isLocation(toks[j]!)) { location = cleanLocation(toks[j]!); break; }
      }
      const loc = location ?? (groupLoc ? cleanLocation(groupLoc) : null);
      if (title && company) {
        roles.push({ title, company, dateRange: parseExpDate(toks[di]!), ...(loc ? { location: loc } : {}) });
      }
      prevDate = di;
    }
  }
  return roles;
}

function parseExperienceFlight(body: string): ExperienceEntry[] {
  const { cards } = walkFlight(body);
  const all: ExperienceEntry[] = [];
  for (const c of cards) all.push(...parseExperienceCard(c.leaves));
  const seen = new Set<string>();
  return all.filter((e) => {
    if (!e.title || !e.company) return false;
    const key = `${e.title}|${e.company}|${e.dateRange?.start ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Education parsing — flat leaf stream. State machine over the ordered leaves so
// it handles BOTH dated entries (anchored on year ranges) AND dateless ones
// (anchored on the school logo), and schools with no logo. Entry shape in
// document order: [<School> logo?, School, Degree[, Field via comma], Date?,
// Activities/notes?].
// ---------------------------------------------------------------------------

interface EduAcc {
  school: string;
  degree: string | null;
  start: string | null;
  end: string | null;
  dated: boolean;
}

function parseEducationFlight(body: string): EducationEntry[] {
  const { flat } = walkFlight(body);
  const leaves = dedupAdjacent(flat);

  const entries: EducationEntry[] = [];
  let cur: EduAcc | null = null;

  const flush = (): void => {
    if (!cur || !cur.school) { cur = null; return; }
    let degree = cur.degree;
    let field: string | null = null;
    if (degree) {
      const cm = degree.lastIndexOf(", ");
      if (cm >= 0) { field = degree.slice(cm + 2).trim(); degree = degree.slice(0, cm).trim(); }
    }
    entries.push({
      school: cur.school,
      ...(degree ? { degree } : {}),
      ...(field ? { fieldOfStudy: field } : {}),
      dateRange: { start: cur.start, end: cur.end },
    });
    cur = null;
  };
  const newAcc = (school: string): EduAcc => ({ school, degree: null, start: null, end: null, dated: false });
  // Activities / honours / grade / scholarship notes — never a school or degree.
  const isEduNote = (t: string) =>
    /^(Activities and societies:|Grade:)/i.test(t) ||
    /\b(Scholarship|Recipient|Honors|Honours|Dean's List|Cum Laude|Valedictorian|GPA|CGPA)\b/i.test(t) ||
    /^[-•*–]\s/.test(t) || t.includes("\n") || t.length > 160;
  // Leading nav/header noise before the first entry (section title, vanity slug).
  const isHeaderNoise = (t: string) => t === "Education" || /^[a-z][a-z0-9-]+$/.test(t);
  // Detects a logo-less school name so consecutive dateless/dated entries split.
  const SCHOOL_KW = /\b(universit|college|school|institut|academy|academia|colegio|écol|ecol|lyc[eé]e|hochschule|polytechni|gymnasium|seminary|conservator|escuela|faculdad|sciences\s+po|gakuin|daigaku|vidhyalaya|vidyalaya|mahavidyalaya|vidyapeeth)\b/i;
  const BARE_YEAR = /^(?:19|20)\d{2}$/;

  for (const t of leaves) {
    if (isLogo(t)) { flush(); cur = newAcc(logoName(t)); continue; }
    if (!cur && isHeaderNoise(t)) continue;

    const dm = t.match(EDU_DATE_RE);
    if (dm) {
      if (!cur) cur = newAcc("");
      // First date per entry wins — a later date belongs to the NEXT entry and
      // must not overwrite this one (guards logo-less schools we couldn't split).
      if (!cur.dated) {
        cur.start = (dm[1]!.match(/\d{4}/) ?? [])[0] ?? null;
        cur.end = (dm[2]!.match(/\d{4}/) ?? [])[0] ?? (/Present/.test(dm[2]!) ? "Present" : null);
        cur.dated = true;
      }
      continue;
    }
    // bare single year ("2016") — treat as the entry's date, not a degree
    if (cur && !cur.dated && BARE_YEAR.test(t)) { cur.start = t; cur.end = t; cur.dated = true; continue; }

    // plain text leaf
    if (!cur) { if (!isEduNote(t)) cur = newAcc(t); continue; }   // first school
    if (t === cur.school) continue;     // school name repeated after its logo
    if (isEduNote(t)) continue;         // honours / activities / grades — ignore
    // A new logo-less school: only once the current entry already has a degree,
    // so we don't mistake a degree that happens to say "School of …" for a school.
    if (SCHOOL_KW.test(t) && cur.school && cur.degree) { flush(); cur = newAcc(t); continue; }
    if (!cur.school) { cur.school = t; continue; }
    if (!cur.degree) { cur.degree = t; continue; }
    // any further text is a secondary note — ignore
  }
  flush();

  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.school}|${e.degree ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Derives the fsd_profile id (needed for the SDUI body) from a connection URN. */
export function profileIdFromUrn(urn: string): string {
  return urn.replace(/^urn:li:fsd_profile:/, "");
}

/**
 * Fetches + parses a profile's full work experience.
 * @returns parsed entries, or [] on failure. Throws RateLimitedError on 429/999.
 */
export async function fetchExperience(
  publicId: string,
  profileId: string,
  csrfToken: string
): Promise<ExperienceEntry[]> {
  const body = await fetchSectionFlight(publicId, profileId, "experience", csrfToken);
  if (!body) return [];
  try {
    const result = parseExperienceFlight(body);
    console.debug(`[RscProfile] ${publicId}: parsed ${result.length} experience entries`);
    return result;
  } catch (err) {
    console.warn(`[RscProfile] experience parse error for ${publicId}:`, err);
    return [];
  }
}

/**
 * Fetches + parses a profile's full education.
 * @returns parsed entries, or [] on failure. Throws RateLimitedError on 429/999.
 */
export async function fetchEducation(
  publicId: string,
  profileId: string,
  csrfToken: string
): Promise<EducationEntry[]> {
  const body = await fetchSectionFlight(publicId, profileId, "education", csrfToken);
  if (!body) return [];
  try {
    const result = parseEducationFlight(body);
    console.debug(`[RscProfile] ${publicId}: parsed ${result.length} education entries`);
    return result;
  } catch (err) {
    console.warn(`[RscProfile] education parse error for ${publicId}:`, err);
    return [];
  }
}

// Exported for offline unit testing against captured payloads.
export const __test = { parseExperienceFlight, parseEducationFlight, walkFlight };
