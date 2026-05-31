/**
 * tests/ref-parser.mjs — REFERENCE implementation of the SDUI flight parser for
 * experience + education, validated offline against captured rsc-action payloads.
 * Once accurate here, this logic ports verbatim into the extension parser.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "probe-out");

// ---------- flight stream -> chunk map (T-length aware) ----------
function advanceBytes(str, start, byteLen) {
  let bytes = 0, i = start;
  while (i < str.length && bytes < byteLen) {
    const cp = str.codePointAt(i);
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    i += cp > 0xffff ? 2 : 1;
  }
  return i;
}
function chunkMap(body) {
  const map = new Map();
  let i = 0;
  const n = body.length;
  while (i < n) {
    const colon = body.indexOf(":", i);
    if (colon < 0) break;
    const id = body.slice(i, colon);
    if (!/^[0-9a-f]+$/.test(id)) {
      const nl = body.indexOf("\n", i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    if (body[colon + 1] === "T") {
      const comma = body.indexOf(",", colon + 1);
      const hexlen = parseInt(body.slice(colon + 2, comma), 16) || 0;
      const textEnd = advanceBytes(body, comma + 1, hexlen);
      map.set(id, body.slice(colon + 1, textEnd));
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
function parseModel(raw) {
  if (raw == null) return undefined;
  const t = raw[0];
  if (t === "I") return { __module: true };
  if (t === "H") return undefined;
  if (t === "T") { const k = raw.indexOf(","); return k >= 0 ? raw.slice(k + 1) : raw.slice(1); }
  try { return JSON.parse(raw); } catch { return raw; }
}

// ---------- walk -> cards + flat leaves ----------
const SKIP = new Set(["SHORT_PRESS", "default", "LONG_PRESS", "SWIPE"]);
function junk(t) {
  if (!t) return true;
  if (SKIP.has(t)) return true;
  if (t[0] === "$") return true;
  if (t.startsWith("var(")) return true;
  if (/^_?[0-9a-f]{6,}$/.test(t)) return true;
  if (t[0] === "{" && t.endsWith("}")) return true; // stray json fragment
  if (/^Thumbnail\b/i.test(t)) return true;
  if (/\bcover photo$/i.test(t)) return true;
  if (t.length > 600) return true;
  return false;
}
function collect(body) {
  const map = chunkMap(body);
  const cards = [];
  const flat = [];
  let cur = null;
  const visited = new Set();
  const push = (t) => {
    t = String(t).trim();
    if (junk(t)) return;
    flat.push(t);
    if (cur) cur.leaves.push(t);
  };
  function walk(node, depth) {
    if (node == null || depth > 240) return;
    if (typeof node === "string") {
      if (node.length > 1 && node[0] === "$" && node !== "$") {
        if (node[1] === "$") return push(node.slice(1));
        const id = node[1] === "L" ? node.slice(2) : node.slice(1);
        if (!map.has(id) || visited.has(id)) return;
        visited.add(id);
        return walk(parseModel(map.get(id)), depth + 1);
      }
      if ((node.startsWith('[["$"') || node.startsWith('["$"')) && node.length > 8) {
        try { return walk(JSON.parse(node), depth + 1); } catch { /* */ }
      }
      return push(node);
    }
    if (Array.isArray(node)) {
      if (node[0] === "$" && node.length >= 4 && typeof node[1] === "string") {
        const props = node[3];
        if (props && typeof props === "object" && typeof props.a11yText === "string") push(props.a11yText);
        return walk(props, depth + 1);
      }
      for (const el of node) walk(el, depth + 1);
      return;
    }
    if (typeof node === "object") {
      if (node.__module) return;
      const ck = node.componentkey || node.componentKey;
      const started = typeof ck === "string" && /entity-collection-item/.test(ck);
      const prev = cur;
      if (started) { cur = { id: ck, leaves: [] }; cards.push(cur); }
      if (typeof node.a11yText === "string") push(node.a11yText);
      if (node.children !== undefined) walk(node.children, depth + 1);
      if (node.textProps !== undefined) walk(node.textProps, depth + 1);
      if (typeof node.text === "string") push(node.text);
      for (const [k, v] of Object.entries(node)) {
        if (["children", "textProps", "text", "componentkey", "componentKey", "className", "style", "a11yText", "accessibilityText"].includes(k)) continue;
        if (v && typeof v === "object") walk(v, depth + 1);
        else if (typeof v === "string" && v[0] === "$" && v !== "$") walk(v, depth + 1);
      }
      if (started) cur = prev;
    }
  }
  for (const [id, raw] of map) {
    if (visited.has(id)) continue;
    const m = parseModel(raw);
    if (m && typeof m === "object" && !m.__module) walk(m, 0);
  }
  return { cards, flat };
}

// ---------- classification ----------
const TYPES = new Set(["Full-time", "Part-time", "Freelance", "Self-employed", "Contract", "Internship", "Apprenticeship", "Seasonal"]);
const MONTHS = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
const EXP_DATE = /^(?:([A-Z][a-z]{2}) )?(\d{4}) - (Present|(?:([A-Z][a-z]{2}) )?(\d{4}))/;
const EDU_DATE = /^((?:[A-Z][a-z]{2} )?\d{4})\s*[–\-—]\s*((?:[A-Z][a-z]{2} )?(?:\d{4}|Present))$/;
const DURATION = /^[·•\s]*\d+\s*(yr|yrs|mo|mos)\b/;
const WORK_MODE = /\s*[·•]\s*(Hybrid|Remote|On-?site)\s*$/i;

function isLogo(t) { return / logo$/.test(t); }
function logoName(t) { return t.replace(/ logo$/, "").trim(); }
function isType(t) { return TYPES.has(t.trim()); }
function isDuration(t) { return DURATION.test(t.trim()); }
function cleanLocation(t) { return t.replace(WORK_MODE, "").trim(); }
function isDescription(t) { return /^[-•*–]\s/.test(t) || t.includes("\n") || t.length > 140; }
function isLocation(t) {
  const s = cleanLocation(t.trim());
  if (/\b(and|or|for|with)\b/i.test(s) || /&/.test(s)) return false;
  if (/ Area$/.test(s)) return true;
  if (s.length < 80 && /^[A-Za-zÀ-ÿ.''\-\s]+(, [A-Za-zÀ-ÿ.''\-\s]+){1,3}$/.test(s)) return true;
  if (/^(Panama|France|Vietnam|Singapore|Germany|Spain|India|China|Brazil|Mexico|Canada|Australia|Switzerland|Belgium|Netherlands|Italy|Portugal|Japan|Remote)$/.test(s)) return true;
  return false;
}
function parseExpDate(t) {
  const m = t.match(EXP_DATE);
  if (!m) return { startDate: null, endDate: null };
  const start = m[1] ? `${m[2]}-${MONTHS[m[1]] || "01"}` : m[2];
  const end = m[3] === "Present" ? "Present" : (m[4] ? `${m[5]}-${MONTHS[m[4]] || "01"}` : m[5]);
  return { startDate: start, endDate: end };
}
function dedupAdjacent(arr) {
  const out = [];
  for (const x of arr) if (out[out.length - 1] !== x) out.push(x);
  return out;
}

// ---------- EXPERIENCE ----------
function parseExperienceCard(rawLeaves) {
  const leaves = dedupAdjacent(rawLeaves);
  let companyLogo = null;
  for (const l of leaves) if (isLogo(l)) { companyLogo = logoName(l); break; }
  const toks = leaves.filter((l) => !isLogo(l));
  if (!toks.length) return [];

  const dateIdx = [];
  toks.forEach((t, i) => { if (EXP_DATE.test(t)) dateIdx.push(i); });
  if (!dateIdx.length) return [];

  const roles = [];
  if (dateIdx.length === 1) {
    const di = dateIdx[0];
    const date = parseExpDate(toks[di]);
    // company · type line
    let company = companyLogo, type = null;
    const ctLine = toks.find((t, i) => i < di && / · /.test(t) && isType(t.split(" · ").pop().trim()));
    if (ctLine) { const [c, ty] = ctLine.split(" · "); company = company || c.trim(); type = ty.trim(); }
    if (!company && ctLine) company = ctLine.split(" · ")[0].trim();
    // Title is always BEFORE the date (location/desc come after). Do NOT
    // location-filter here — titles with commas ("Consultant, Deal Advisory")
    // would be wrongly dropped.
    const title = toks.find((t, i) => i < di && t !== ctLine && t !== company && !isType(t) && !isDuration(t));
    const after = toks.slice(di + 1);
    const location = after.find((t) => isLocation(t)) || null;
    const description = after.find((t) => !isLocation(t) && !isDuration(t) && !isType(t)) || null;
    roles.push({ title: title || null, company: company || null, employmentType: type, ...date, location, description });
  } else {
    // grouped: company header = first non-(type/dur/loc/date) text
    let company = companyLogo;
    const headerIdx = toks.findIndex((t) => !isType(t) && !isDuration(t) && !isLocation(t) && !EXP_DATE.test(t));
    if (!company && headerIdx >= 0) company = toks[headerIdx];
    const used = new Set();
    if (headerIdx >= 0) used.add(headerIdx);
    // group-level location: first LOCATION token before the first date (shared
    // across roles that don't carry their own).
    let groupLoc = null;
    for (let j = 0; j < dateIdx[0]; j++) { if (isLocation(toks[j])) { groupLoc = toks[j]; break; } }
    let prevDate = -1;
    for (const di of dateIdx) {
      // backward scan for nearest unused title text
      let title = null;
      for (let j = di - 1; j > prevDate; j--) {
        if (used.has(j)) continue;
        const t = toks[j];
        if (isType(t) || isDuration(t) || isLocation(t) || EXP_DATE.test(t)) continue;
        if (t === company) continue;
        title = t; used.add(j); break;
      }
      // employment type near title
      let type = null;
      for (let j = di - 1; j > prevDate; j--) { if (isType(toks[j])) { type = toks[j].trim(); break; } }
      // location after date
      let location = null;
      for (let j = di + 1; j < toks.length && !dateIdx.includes(j); j++) { if (isLocation(toks[j])) { location = toks[j]; break; } }
      roles.push({ title, company: company || null, employmentType: type, ...parseExpDate(toks[di]), location: location || groupLoc, description: null });
      prevDate = di;
    }
  }
  return roles;
}

function parseExperience(body) {
  const { cards } = collect(body);
  const all = [];
  for (const c of cards) all.push(...parseExperienceCard(c.leaves));
  // dedupe
  const seen = new Set();
  return all.filter((e) => {
    if (!e.title && !e.company) return false;
    const k = `${e.title}|${e.company}|${e.startDate}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

// ---------- EDUCATION ----------
function parseEducation(body) {
  const { flat } = collect(body);
  const leaves = dedupAdjacent(flat);
  // find date anchors
  const dateIdx = [];
  leaves.forEach((t, i) => { if (EDU_DATE.test(t)) dateIdx.push(i); });
  const entries = [];
  let prev = -1;
  for (const di of dateIdx) {
    // window = (prev, di)
    const window = [];
    let logo = null;
    for (let j = prev + 1; j < di; j++) {
      const t = leaves[j];
      if (isLogo(t)) { logo = logoName(t); continue; }
      if (/^Activities and societies:/i.test(t)) continue;
      window.push(t);
    }
    if (!window.length && !logo) { prev = di; continue; }
    let school = logo, degree = null, field = null;
    if (logo) {
      // window may contain [schoolDup, degree]
      const nonSchool = window.filter((w) => w !== logo);
      degree = nonSchool.length ? nonSchool[nonSchool.length - 1] : null;
    } else {
      school = window[0] || null;
      degree = window.length > 1 ? window[window.length - 1] : null;
    }
    if (degree) {
      // field = after last comma; or after " - " if it has a known degree prefix
      const cm = degree.lastIndexOf(", ");
      if (cm >= 0) { field = degree.slice(cm + 2).trim(); degree = degree.slice(0, cm).trim(); }
    }
    const m = leaves[di].match(EDU_DATE);
    const startYear = (m[1].match(/\d{4}/) || [])[0] || null;
    const endYear = (m[2].match(/\d{4}/) || [])[0] || (/Present/.test(m[2]) ? "Present" : null);
    // activities trailing
    let activities = null;
    if (di + 1 < leaves.length && /^Activities and societies:/i.test(leaves[di + 1])) {
      activities = leaves[di + 1].replace(/^Activities and societies:\s*/i, "").trim();
    }
    if (school) entries.push({ school, degree, fieldOfStudy: field, startYear, endYear, activities });
    prev = di;
  }
  // dedupe
  const seen = new Set();
  return entries.filter((e) => { const k = `${e.school}|${e.degree}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------- run against captured payloads ----------
function load(name) {
  let c = readFileSync(join(OUT, name), "utf8");
  if (c.startsWith("URL:")) { const i = c.indexOf("\n\n"); c = i >= 0 ? c.slice(i + 2) : c; }
  return c;
}
for (const pid of ["mariana-alvaro", "daominhanh10"]) {
  console.log(`\n############## ${pid} ##############`);
  try {
    const exp = parseExperience(load(`${pid}_REPLAY_expBody.txt`));
    console.log(`\n--- EXPERIENCE (${exp.length}) ---`);
    exp.forEach((e) => console.log(`  • ${e.title} @ ${e.company} [${e.employmentType || "-"}] ${e.startDate}→${e.endDate} | ${e.location || "-"}`));
  } catch (e) { console.log("exp err", e.message); }
  try {
    const edu = parseEducation(load(`${pid}_REPLAY_eduBody.txt`));
    console.log(`\n--- EDUCATION (${edu.length}) ---`);
    edu.forEach((e) => console.log(`  • ${e.school} — ${e.degree || "-"} / ${e.fieldOfStudy || "-"} [${e.startYear}→${e.endYear}]`));
  } catch (e) { console.log("edu err", e.message); }
}
