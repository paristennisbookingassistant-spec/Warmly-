/** Prototype: T-length-aware Flight stream parser. Validate it fixes anishka
 * (multi-line descriptions) without regressing mariana. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "probe-out");

// advance JS string index by `byteLen` UTF-8 bytes
function advanceBytes(str, start, byteLen) {
  let bytes = 0, i = start;
  while (i < str.length && bytes < byteLen) {
    const cp = str.codePointAt(i);
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    i += cp > 0xffff ? 2 : 1;
  }
  return i;
}

// T-length-aware chunk map
function buildChunkMap(body) {
  const map = new Map();
  let i = 0;
  const n = body.length;
  while (i < n) {
    const colon = body.indexOf(":", i);
    if (colon < 0) break;
    const id = body.slice(i, colon);
    if (!/^[0-9a-f]+$/.test(id)) {
      // not a real row start — skip to next line
      const nl = body.indexOf("\n", i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    const tag = body[colon + 1];
    if (tag === "T") {
      const comma = body.indexOf(",", colon + 1);
      const hexlen = parseInt(body.slice(colon + 2, comma), 16) || 0;
      const textStart = comma + 1;
      const textEnd = advanceBytes(body, textStart, hexlen);
      map.set(id, body.slice(colon + 1, textEnd)); // includes "T<hex>,<text>"
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
  if (t === "T") { const c = raw.indexOf(","); return c >= 0 ? raw.slice(c + 1) : raw.slice(1); }
  try { return JSON.parse(raw); } catch { return raw; }
}
const SKIP = new Set(["SHORT_PRESS", "default", "LONG_PRESS", "SWIPE"]);
function junk(t) {
  if (!t) return true; if (SKIP.has(t)) return true;
  if (t[0] === "$") return true; if (t.startsWith("var(")) return true;
  if (/^_?[0-9a-f]{6,}$/.test(t)) return true;
  if (t[0] === "{" && t.endsWith("}")) return true;
  if (/^Thumbnail\b/i.test(t)) return true;
  if (t.length > 600) return true; return false;
}
function walk(body) {
  const map = buildChunkMap(body);
  const cards = []; const flat = []; let cur = null; const visited = new Set();
  const push = (v) => { const t = String(v).trim(); if (junk(t)) return; flat.push(t); if (cur) cur.leaves.push(t); };
  function w(node, d) {
    if (node == null || d > 240) return;
    if (typeof node === "string") {
      if (node.length > 1 && node[0] === "$" && node !== "$") {
        if (node[1] === "$") return push(node.slice(1));
        const id = node[1] === "L" ? node.slice(2) : node.slice(1);
        if (!map.has(id) || visited.has(id)) return; visited.add(id);
        return w(parseModel(map.get(id)), d + 1);
      }
      if ((node.startsWith('[["$"') || node.startsWith('["$"')) && node.length > 8) { try { return w(JSON.parse(node), d + 1); } catch {} }
      return push(node);
    }
    if (Array.isArray(node)) {
      if (node[0] === "$" && node.length >= 4 && typeof node[1] === "string") {
        const p = node[3]; if (p && typeof p === "object" && typeof p.a11yText === "string") push(p.a11yText);
        return w(p, d + 1);
      }
      for (const el of node) w(el, d + 1); return;
    }
    if (typeof node === "object") {
      if (node.__module) return;
      const ck = node.componentkey || node.componentKey;
      const started = typeof ck === "string" && /entity-collection-item/.test(ck);
      const prev = cur; if (started) { cur = { id: ck, leaves: [] }; cards.push(cur); }
      if (typeof node.a11yText === "string") push(node.a11yText);
      if (node.children !== undefined) w(node.children, d + 1);
      if (node.textProps !== undefined) w(node.textProps, d + 1);
      if (typeof node.text === "string") push(node.text);
      for (const [k, v] of Object.entries(node)) {
        if (["children","textProps","text","componentkey","componentKey","className","style","a11yText","accessibilityText"].includes(k)) continue;
        if (v && typeof v === "object") w(v, d + 1); else if (typeof v === "string" && v[0] === "$" && v !== "$") w(v, d + 1);
      }
      if (started) cur = prev;
    }
  }
  for (const [id, raw] of map) { if (visited.has(id)) continue; const m = parseModel(raw); if (m && typeof m === "object" && !m.__module) w(m, 0); }
  return { cards, flat };
}

for (const [pid, label] of [["anishka-moona","FIX TARGET"],["puneet-d-b1563aa","FIX TARGET"],["mariana-alvaro","REGRESSION"],["daominhanh10","REGRESSION"]]) {
  let body; try { body = readFileSync(join(OUT, `${pid}_REPLAY_expBody.txt`), "utf8"); } catch { console.log(`${pid}: no body`); continue; }
  if (body.startsWith("URL:")) { const i = body.indexOf("\n\n"); body = i >= 0 ? body.slice(i + 2) : body; }
  const { cards } = walk(body);
  const nonEmpty = cards.filter((c) => c.leaves.length);
  console.log(`\n=== ${pid} (${label}) : ${nonEmpty.length} non-empty cards ===`);
  nonEmpty.forEach((c, i) => { console.log(`  card ${i}:`); c.leaves.forEach((l) => console.log(`      ${l.slice(0, 80)}`)); });
}
