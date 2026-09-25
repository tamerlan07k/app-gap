// Scalable, resumable harvester for official 2026-2027 supplemental-essay
// prompts across the ENTIRE college catalog.
//
// Why this exists: the colleges table stores each school's root website but no
// admissions/essay URL, so for every college we crawl its OWN official site
// (homepage -> admissions -> essays/writing-supplement pages), read the visible
// text, and extract the current-cycle supplemental prompts.
//
// Anti-fabrication guarantees (hard rules, never relaxed for coverage):
//   * Only the college's own official domain is fetched (no third-party blogs).
//   * A grounded LLM extracts prompts, then EVERY prompt_text is verified to be
//     a verbatim substring of the fetched official page — hallucinated or
//     paraphrased text is dropped.
//   * `verified` is set ONLY when the page shows a current-cycle signal
//     (2026-2027 / Fall 2027 / Class of 2030-2031) AND at least one prompt
//     survives substring verification (or an explicit "no supplement" statement
//     is found). Everything else is left pending — never guessed.
//
// Output: harvest-results.json (checkpoint, resumable). Load verified results
// into the DB with load-harvest.mjs. Idempotent; safe to re-run/resume.
//
//   node scripts/college-ingest/harvest-supplemental-prompts.mjs [--limit N]
//        [--offset N] [--concurrency 6] [--force] [--only <slug>]
//
// Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   AI_GATEWAY_API_KEY.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(HERE, "harvest-results.json");
const CANDIDATES_PATH = join(HERE, "supplemental-prompts-candidates.json");
const CYCLE_YEAR = "2026-2027";

const args = process.argv.slice(2);
const flag = (name, def = null) => {
  const i = args.indexOf(name);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const LIMIT = flag("--limit") ? Number(flag("--limit")) : Infinity;
const OFFSET = flag("--offset") ? Number(flag("--offset")) : 0;
const CONCURRENCY = flag("--concurrency") ? Number(flag("--concurrency")) : 6;
const FORCE = args.includes("--force");
const ONLY = flag("--only");

// ── env ──────────────────────────────────────────────────────────────────────
const fileEnv = {};
try {
  for (const l of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(
    /\r?\n/,
  )) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const get = (k) => process.env[k] ?? fileEnv[k];
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const AI_KEY = get("AI_GATEWAY_API_KEY");
if (!SUPABASE_URL || !SERVICE_KEY || !AI_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / AI_GATEWAY_API_KEY",
  );
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── helpers ──────────────────────────────────────────────────────────────────
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function normUrl(u) {
  if (!u) return null;
  let s = u.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}
function registrable(host) {
  const parts = host.replace(/^www\./, "").split(".");
  return parts.slice(-2).join(".");
}
function sameSite(host, baseReg) {
  return host === baseReg || host.endsWith(`.${baseReg}`);
}

async function fetchText(url, timeoutMs = 14000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { ok: false, status: res.status, url: res.url };
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype))
      return { ok: false, status: 0, url: res.url };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000)
      return { ok: false, status: 0, url: res.url };
    return { ok: true, html: Buffer.from(buf).toString("utf8"), url: res.url };
  } catch (e) {
    return { ok: false, status: -1, error: String(e?.name || e) };
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&hellip;|&#8230;/g, "…");
}
function htmlToText(html) {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  return decodeEntities(noScript.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (let m = re.exec(html); m !== null; m = re.exec(html)) {
    let href = m[1];
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    try {
      href = new URL(href, baseUrl).toString().split("#")[0];
    } catch {
      continue;
    }
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    links.push({ href, text });
  }
  return links;
}

const CYCLE_RE =
  /2026\s*[–-]\s*2?0?27|2026-2027|2026[–-]27|fall\s*2027|class of\s*20(30|31)|for\s*2027/i;
const SUPP_RE =
  /supplement|writing supplement|short[- ]answer|essay prompt|essay question|why\s+[a-z]|specific questions|application essays/i;
// Strict "no supplement" — an explicit institutional statement, not incidental
// phrasing. Kept deliberately narrow to avoid falsely telling a student that no
// essay is required when one exists.
const STRICT_NONE_RE =
  /(does not require|do not require|not required to (submit|complete|write)|there is no|we do not have|no)[^.]{0,25}(writing supplement|supplemental essay|supplemental writing|school-specific essay)/i;
// Pages that are NOT authoritative for the general "no supplement" claim.
const NONE_URL_EXCLUDE =
  /international|transfer|graduate|home-?school|counselor|espanol|spanish/i;
const ADMISSION_LINK_RE =
  /admiss|undergrad|apply|prospective|first[- ]year|freshman/i;
const ESSAY_LINK_RE =
  /essay|writing.?supplement|supplement|prompt|short.?answer|application-?requirement|how-?to-?apply|first[- ]year|freshman|apply|questions|application/i;

function scoreEssayUrl(u, text) {
  const s = `${u} ${text}`.toLowerCase();
  let score = 0;
  if (/essay|writing-?supplement|prompt|short-?answer/.test(s)) score += 10;
  if (/supplement/.test(s)) score += 6;
  if (/first-?year|freshman/.test(s)) score += 3;
  if (/application-?requirement|how-?to-?apply|apply/.test(s)) score += 2;
  if (/questions/.test(s)) score += 2;
  if (/transfer|graduate|blog|news|financial|visit/.test(s)) score -= 5;
  return score;
}

// ── LLM extraction via Vercel AI Gateway (OpenAI-compatible) ─────────────────
async function extractPrompts(pageText, collegeName, sourceUrl) {
  const text = pageText.slice(0, 14000);
  const sys =
    "You extract official supplemental college-application essay prompts from the visible text of a university's OWN admissions page. You never invent, paraphrase, translate, summarize, or reword. You copy prompt text VERBATIM, exactly as it appears. You only return prompts for the CURRENT 2026-2027 cycle (Fall 2027 entry / Class of 2030 or 2031). You exclude: past/previous-year or example prompts, the Common App/Coalition main personal statement, transfer-only prompts, and writing tips.";
  const user = `College: ${collegeName}\nSource URL: ${sourceUrl}\n\nReturn ONLY a JSON object with this shape:\n{"cycle_signal": string|null, "has_supplements": boolean, "none_required": boolean, "prompts": [{"prompt_text": string, "word_limit": number|null, "is_required": boolean, "school_or_program": string|null}]}\n\nRules:\n- prompt_text MUST be copied verbatim from the page text below (character-for-character). If you cannot find the exact wording, do not include it.\n- Include ALL current supplemental prompts, including school/college/program-specific ones. Mark optional prompts is_required=false.\n- If the page does not clearly present current-cycle supplemental prompts, set has_supplements=false and prompts=[].\n- If the page explicitly states no supplemental essay is required, set none_required=true.\n- cycle_signal = the exact phrase on the page indicating the cycle (e.g. "2026-2027", "Class of 2031"), or null.\n\nPAGE TEXT:\n"""\n${text}\n"""`;
  try {
    const res = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: user },
          ],
        }),
      },
    );
    if (!res.ok) return { error: `llm_${res.status}` };
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { error: "llm_nojson" };
    return { data: JSON.parse(match[0]) };
  } catch (e) {
    return { error: `llm_${String(e?.name || e)}` };
  }
}

// Normalise for verbatim substring comparison (whitespace + smart quotes/dashes).
function canon(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function harvestCollege(college) {
  const base = normUrl(college.official_website);
  const result = {
    name: college.canonical_name,
    slug: college.slug,
    status: "pending",
    verified: false,
    prompts: [],
    sourceUrl: null,
    cycleSignal: null,
    note: null,
    checkedAt: new Date().toISOString(),
  };
  if (!base) {
    result.note = "no base url";
    return result;
  }
  const baseHost = new URL(base).host;
  const baseReg = registrable(baseHost);
  const visited = new Set();

  async function get(url) {
    if (visited.has(url)) return null;
    visited.add(url);
    const r = await fetchText(url);
    return r.ok ? r : null;
  }

  // Hop 0: homepage → admissions candidates. Also seed likely admissions hosts
  // directly (essays usually live on admission[s]./apply. subdomains that a JS
  // homepage may not expose as crawlable <a> links).
  const admissionCandidates = [
    `https://admissions.${baseReg}/`,
    `https://admission.${baseReg}/`,
    `https://apply.${baseReg}/`,
  ];
  const home = await get(base);
  if (!home) {
    // Homepage unreachable, but the guessed admissions hosts may still work.
    result.note = "homepage unreachable";
  }
  if (home) {
    for (const l of extractLinks(home.html, home.url)) {
      let host;
      try {
        host = new URL(l.href).host;
      } catch {
        continue;
      }
      if (!sameSite(host, baseReg)) continue;
      if (ADMISSION_LINK_RE.test(`${l.href} ${l.text}`))
        admissionCandidates.push(l.href);
    }
  }
  const admDedup = [...new Set(admissionCandidates)].slice(0, 8);

  // Hop 1: admissions pages → essay candidates.
  const essayCandidates = [];
  for (const admUrl of admDedup) {
    const page = await get(admUrl);
    if (!page) continue;
    // The admissions page itself might already hold prompts.
    essayCandidates.push({ url: page.url, html: page.html, direct: true });
    for (const l of extractLinks(page.html, page.url)) {
      let host;
      try {
        host = new URL(l.href).host;
      } catch {
        continue;
      }
      if (!sameSite(host, baseReg)) continue;
      if (ESSAY_LINK_RE.test(`${l.href} ${l.text}`))
        essayCandidates.push({ url: l.href, text: l.text });
    }
  }
  // Rank essay candidates; fetch the best few.
  const ranked = essayCandidates
    .filter((c, i, a) => a.findIndex((x) => x.url === c.url) === i)
    .map((c) => ({ ...c, score: scoreEssayUrl(c.url, c.text || "") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  let bestNone = null;
  for (const cand of ranked) {
    let html = cand.html;
    let url = cand.url;
    if (!html) {
      const page = await get(cand.url);
      if (!page) continue;
      html = page.html;
      url = page.url;
    }
    const text = htmlToText(html);
    const urlOkForNone = !NONE_URL_EXCLUDE.test(url);
    if (!SUPP_RE.test(text)) {
      if (
        STRICT_NONE_RE.test(text) &&
        CYCLE_RE.test(text) &&
        urlOkForNone &&
        !bestNone
      )
        bestNone = url;
      continue;
    }
    const cycleMatch = text.match(CYCLE_RE);
    // Extract only from pages that look current + supplemental.
    const ext = await extractPrompts(text, college.canonical_name, url);
    if (ext.error) {
      result.note = ext.error;
      continue;
    }
    const d = ext.data;
    if (d?.none_required && (!d.prompts || d.prompts.length === 0)) {
      if (
        CYCLE_RE.test(text) &&
        STRICT_NONE_RE.test(text) &&
        urlOkForNone &&
        !bestNone
      )
        bestNone = url;
      continue;
    }
    if (!d?.prompts?.length) continue;
    const canonText = canon(text);
    const verifiedPrompts = [];
    for (const p of d.prompts) {
      if (!p?.prompt_text || typeof p.prompt_text !== "string") continue;
      const pt = p.prompt_text.trim();
      if (pt.length < 15) continue;
      if (!canonText.includes(canon(pt))) continue; // verbatim gate
      verifiedPrompts.push({
        prompt_text: pt,
        word_limit: Number.isFinite(p.word_limit) ? p.word_limit : null,
        is_required: p.is_required !== false,
        school_or_program: p.school_or_program || null,
      });
    }
    if (verifiedPrompts.length > 0 && cycleMatch) {
      result.status = "has_supplements";
      result.verified = true;
      result.prompts = verifiedPrompts;
      result.sourceUrl = url;
      result.cycleSignal = cycleMatch[0];
      return result; // success — stop crawling this college
    }
    if (verifiedPrompts.length > 0 && !cycleMatch) {
      // Prompts found but no current-cycle proof → keep looking; remember weakly.
      if (!result.prompts.length) {
        result.prompts = verifiedPrompts;
        result.sourceUrl = url;
        result.note = "no current-cycle signal";
      }
    }
  }

  if (bestNone) {
    result.status = "none_required";
    result.verified = true;
    result.sourceUrl = bestNone;
    result.cycleSignal = "current-cycle page";
    result.note = "explicit no-supplement statement";
    return result;
  }
  // Prompts without a cycle signal are NOT trusted → stay pending.
  if (result.verified === false) result.prompts = [];
  if (!result.note)
    result.note = "no verifiable current-cycle supplement found";
  return result;
}

// ── pool runner ──────────────────────────────────────────────────────────────
async function pool(items, n, fn, onProgress) {
  const q = [...items.entries()];
  let done = 0;
  async function worker() {
    while (q.length) {
      const [idx, item] = q.shift();
      try {
        await fn(item, idx);
      } catch (e) {
        console.error(`  ! ${item.slug}: ${String(e?.message || e)}`);
      }
      done += 1;
      if (onProgress) onProgress(done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

function loadResults() {
  if (existsSync(RESULTS_PATH)) {
    try {
      return JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
    } catch {}
  }
  return { generatedAt: null, cycle: CYCLE_YEAR, results: {} };
}
function saveResults(store) {
  store.generatedAt = new Date().toISOString();
  writeFileSync(RESULTS_PATH, JSON.stringify(store, null, 2));
}

function summarize(store) {
  const r = Object.values(store.results);
  const has = r.filter(
    (x) => x.status === "has_supplements" && x.verified,
  ).length;
  const none = r.filter(
    (x) => x.status === "none_required" && x.verified,
  ).length;
  const pending = r.filter((x) => !x.verified).length;
  const prompts = r.reduce(
    (a, x) => a + (x.verified ? x.prompts.length : 0),
    0,
  );
  return { processed: r.length, has, none, pending, prompts };
}

async function fetchAllColleges() {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase
      .from("colleges")
      .select("id, canonical_name, slug, official_website")
      .order("canonical_name", { ascending: true })
      .range(f, f + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  // Skip the hand-verified colleges already in candidates.json.
  const handSlugs = new Set(
    (JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")).colleges ?? []).map(
      (c) => c.college,
    ),
  );

  let colleges = await fetchAllColleges();
  if (ONLY) colleges = colleges.filter((c) => c.slug === ONLY);
  else colleges = colleges.filter((c) => !handSlugs.has(c.slug));

  const store = loadResults();
  const todo = colleges
    .filter((c) => FORCE || ONLY || !store.results[c.id])
    .slice(
      OFFSET,
      OFFSET === 0 && LIMIT === Infinity ? undefined : OFFSET + LIMIT,
    );

  console.log(
    `Harvesting ${todo.length} college(s) (of ${colleges.length} not hand-verified; ${Object.keys(store.results).length} already in checkpoint). Concurrency ${CONCURRENCY}.`,
  );

  let sinceSave = 0;
  await pool(
    todo,
    CONCURRENCY,
    async (college) => {
      const r = await harvestCollege(college);
      store.results[college.id] = r;
      const tag = r.verified
        ? r.status === "none_required"
          ? "NONE"
          : `${r.prompts.length}p`
        : "pending";
      console.log(
        `  [${tag}] ${college.canonical_name}${r.cycleSignal ? ` (${r.cycleSignal})` : ""}`,
      );
    },
    (done) => {
      sinceSave += 1;
      if (sinceSave >= 10) {
        saveResults(store);
        sinceSave = 0;
        const s = summarize(store);
        console.log(
          `  … progress ${done}/${todo.length} | checkpoint: ${s.has} has / ${s.none} none / ${s.pending} pending / ${s.prompts} prompts`,
        );
      }
    },
  );
  saveResults(store);
  const s = summarize(store);
  console.log(
    `\nDone. Checkpoint totals — processed ${s.processed}, has_supplements ${s.has}, none_required ${s.none}, pending ${s.pending}, prompts ${s.prompts}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
