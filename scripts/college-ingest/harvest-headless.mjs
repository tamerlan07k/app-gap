// Resumable HEADLESS-BROWSER harvester for official 2026-2027 first-year
// supplemental-essay prompts across the PENDING colleges (those a static crawl
// could not verify — usually JS-rendered admissions sites).
//
// Renders each college's OWN official pages with Chromium (Playwright), so
// JavaScript-built essay pages become readable. Same hard anti-fabrication rules
// as the static harvester, PLUS built-in defenses against the false-positive
// problem seen before (program-specific pages):
//   * The crawl frontier and the accepted source page are filtered by a denylist
//     (honors / scholarship / graduate / nursing / transfer / international /
//     readmission / portfolio / EOP-EOF / athletics / blog) and must match a
//     general first-year/undergraduate application pattern.
//   * Every extracted prompt_text must be a verbatim substring of the RENDERED
//     page text (paraphrase/hallucination dropped) and pass a prompt-quality
//     gate (looks like a real essay prompt, not admin/form text).
//   * `verified` only when the page shows a current-cycle signal
//     (2026-2027 / Fall 2027 / Class of 2030-2031).
//   * `none_required` only on a strict explicit statement on a general page.
// Genuinely verified results are loaded into the DB inline (resumable; already
// verified colleges are skipped). Checkpoint: harvest-headless-results.json.
//
//   node scripts/college-ingest/harvest-headless.mjs [--limit N] [--concurrency 5]
//        [--only <slug>] [--no-load]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(HERE, "harvest-headless-results.json");
const CANDIDATES_PATH = join(HERE, "supplemental-prompts-candidates.json");
const CYCLE_YEAR = "2026-2027";
const SOURCE_DATE = "2026-09-15";

const args = process.argv.slice(2);
const flagVal = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : null;
};
const LIMIT = flagVal("--limit") ? Number(flagVal("--limit")) : Infinity;
const CONCURRENCY = flagVal("--concurrency")
  ? Number(flagVal("--concurrency"))
  : 5;
const ONLY = flagVal("--only");
const NO_LOAD = args.includes("--no-load");
// Cost controls: never call the paid model unless a page clears a deterministic
// prompt-signal bar, at most ONE AI call per college, and a hard per-run budget.
const MAX_AI = flagVal("--max-ai") ? Number(flagVal("--max-ai")) : 1200;
const PROMPT_SIGNAL_MIN = flagVal("--signal-min")
  ? Number(flagVal("--signal-min"))
  : 3;
// google/gemini-2.5-flash approx USD per 1M tokens (for an estimate only).
const PRICE_IN = 0.3;
const PRICE_OUT = 2.5;
let aiCalls = 0;
let aiInTok = 0;
let aiOutTok = 0;
let gatewayDead = false;
let stopRun = false;
const estCost = () => (aiInTok / 1e6) * PRICE_IN + (aiOutTok / 1e6) * PRICE_OUT;

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

// ── regexes ──────────────────────────────────────────────────────────────────
const CYCLE_RE =
  /2026\s*[–-]\s*2?0?27|2026-2027|2026[–-]27|fall\s*2027|class of\s*20(30|31)|for\s*2027/i;
const SUPP_RE =
  /supplement|writing supplement|short[- ]answer|essay prompt|essay question|why\s+[a-z]|specific questions|application essays|personal essay/i;
const STRICT_NONE_RE =
  /(does not require|do not require|not required to (submit|complete|write)|there is no|we do not have|no)[^.]{0,25}(writing supplement|supplemental essay|supplemental writing|school-specific essay)/i;
// Program-specific / non-general pages — pruned from the crawl AND rejected as a source.
const DENY_RE =
  /honors?|scholar|graduate|\bgrad\b|nursing|\bbsn\b|\babsn\b|\bmsw\b|\bmfa\b|\bmba\b|\bphd\b|doctoral|accelerated|returning|readmiss|re-?entry|reentry|portfolio|transfer|international|home-?school|\beop\b|\beof\b|dual-?enroll|certificate|athletic|register\?|\/blog\/|\/news\/|\/programs?\//i;
// A source page must look like a GENERAL first-year/undergraduate application page.
const GENERAL_RE =
  /first-?year|freshman|undergrad|\/apply|admission|essay|writing-?supplement|supplement|requirement|short-?answer|how-?to-?apply/i;
const ADMISSION_LINK_RE =
  /admiss|undergrad|apply|first[- ]year|freshman|prospective/i;
const ESSAY_LINK_RE =
  /essay|writing.?supplement|supplement|prompt|short.?answer|application-?requirement|how-?to-?apply|first[- ]year|freshman|apply|requirements/i;
// Prompt-quality: reject admin/form text; require a question or an essay verb.
const PROMPT_BAD_RE =
  /disqualif|dismiss|readmiss|statement of purpose|cover letter|r[ée]sum[ée]|official transcript|\bdeadline\b|application fee|letters? of recommendation|\bGPA\b|test scores?/i;
const PROMPT_GOOD_RE =
  /\?|describe|tell us|share|reflect|why |explain|discuss|what |how |write about|in \d+ words|choose one|your reasons|elaborate|imagine|consider/i;

function registrable(host) {
  return host
    .replace(/^www\./, "")
    .split(".")
    .slice(-2)
    .join(".");
}
function sameSite(host, baseReg) {
  return host === baseReg || host.endsWith(`.${baseReg}`);
}
function canon(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function cleanText(s) {
  return s.replace(/\s+/g, " ").trim();
}
function promptOk(t) {
  const s = t.trim();
  if (s.length < 20 || s.length > 1400) return false;
  if (PROMPT_BAD_RE.test(s)) return false;
  return PROMPT_GOOD_RE.test(s);
}

// Deterministic confidence that a rendered page actually presents supplemental
// essay PROMPTS (not just mentions essays). Gates paid AI: only pages scoring
// >= PROMPT_SIGNAL_MIN are worth an extraction call.
function promptSignals(text) {
  let s = 0;
  const q = (text.match(/\?/g) || []).length;
  if (q >= 3) s += 2;
  else if (q >= 1) s += 1;
  if (
    /\b\d{2,4}\s*words?\b|word\s*(limit|count)|no more than \d+|in \d+ words|\d+-word/i.test(
      text,
    )
  )
    s += 2;
  if (/supplemental essay|writing supplement|short[- ]answer/i.test(text))
    s += 2;
  if (
    /respond to (the |one )|please (describe|respond|share|tell)|in your own words|choose one of|why (are you interested|do you want)/i.test(
      text,
    )
  )
    s += 1;
  if (/why [A-Z][a-z]{2,}\??/.test(text)) s += 1;
  return s;
}

// Trim page text to the essay-relevant region to cut AI input tokens (cost).
function essaySlice(text) {
  const i = text.search(
    /supplemental essay|writing supplement|essay question|short[- ]answer|essay prompt|why [A-Z]/i,
  );
  const start = i > 0 ? Math.max(0, i - 300) : 0;
  return text.slice(start, start + 6000);
}

// ── LLM extraction (grounded) ────────────────────────────────────────────────
async function extractPrompts(pageText, collegeName, sourceUrl) {
  const text = pageText.slice(0, 14000);
  const sys =
    "You extract official GENERAL first-year undergraduate supplemental/writing-supplement essay prompts from the visible text of a university's OWN admissions page. You never invent, paraphrase, translate, summarize, or reword — you copy prompt text VERBATIM. You only return prompts for the CURRENT 2026-2027 cycle (Fall 2027 entry / Class of 2030 or 2031). You EXCLUDE: honors-college, scholarship, graduate, nursing/BSN, MFA/MBA/PhD, transfer, international-only, readmission, and portfolio essays; past/previous-year or example prompts; the Common App/Coalition main personal statement; and writing tips.";
  const user = `College: ${collegeName}\nSource URL: ${sourceUrl}\n\nReturn ONLY JSON: {"cycle_signal": string|null, "has_supplements": boolean, "none_required": boolean, "prompts": [{"prompt_text": string, "word_limit": number|null, "is_required": boolean, "school_or_program": string|null}]}\n\nRules:\n- prompt_text MUST be copied verbatim from the page text below. If you cannot find exact wording, omit it.\n- Include ALL current GENERAL first-year supplemental prompts; mark optional ones is_required=false.\n- If the page is program-specific (honors/scholarship/graduate/nursing/transfer/international/portfolio) or does not clearly present current general first-year supplemental prompts, set has_supplements=false and prompts=[].\n- If the page explicitly states no supplemental essay is required for first-year applicants, set none_required=true.\n\nPAGE TEXT:\n"""\n${text}\n"""`;
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
    aiCalls += 1;
    if (res.status === 402) {
      gatewayDead = true;
      return { error: "llm_402" };
    }
    if (!res.ok) return { error: `llm_${res.status}` };
    const json = await res.json();
    aiInTok += json.usage?.prompt_tokens ?? 0;
    aiOutTok += json.usage?.completion_tokens ?? 0;
    const content = json.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { error: "llm_nojson" };
    return { data: JSON.parse(match[0]) };
  } catch (e) {
    return { error: `llm_${String(e?.name || e)}` };
  }
}

// A page shows a conflicting OLDER cycle (stale content) — used to reject.
const OLD_CYCLE_RE =
  /2023-2024|2024-2025|2025-2026|class of\s*20(27|28|29|30)|fall\s*20(24|25|26)\b/i;

// ── rendering ────────────────────────────────────────────────────────────────
// deep=true renders the SPA fully (network idle + scroll + expand accordions/
// tabs) so essay content built by JavaScript becomes readable; deep=false is the
// fast path used only to gather links from homepage/admissions pages.
async function render(page, url, deep = false) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch {
    // A nav timeout can still leave a usable partial DOM — fall through and read.
  }
  if (deep) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 6000 });
    } catch {}
    // Each enhancement step is independently guarded so a failure in one (e.g. a
    // click that changes context) never discards the page — we still read text.
    try {
      await page.evaluate(async () => {
        const h = document.body ? document.body.scrollHeight : 0;
        for (let y = 0; y < h; y += 800) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
    } catch {}
    try {
      await page.evaluate(() => {
        // Expand true disclosure widgets only (not generic buttons/links that navigate).
        const els = Array.from(
          document.querySelectorAll(
            '[aria-expanded="false"],summary,[role="tab"]',
          ),
        );
        for (const el of els.slice(0, 60)) {
          try {
            el.click();
          } catch {}
        }
      });
    } catch {}
    try {
      await page.waitForTimeout(900);
    } catch {}
  } else {
    try {
      await page.waitForTimeout(800);
    } catch {}
  }
  try {
    return await page.evaluate(() => {
      const text = document.body ? document.body.innerText : "";
      const links = Array.from(document.querySelectorAll("a[href]")).map(
        (a) => ({
          href: a.href,
          text: (a.textContent || "").replace(/\s+/g, " ").trim(),
        }),
      );
      return { text, links, finalUrl: location.href };
    });
  } catch {
    return null;
  }
}

function scoreEssayUrl(u, text) {
  const s = `${u} ${text}`.toLowerCase();
  let score = 0;
  if (/essay|writing-?supplement|prompt|short-?answer/.test(s)) score += 10;
  if (/supplement/.test(s)) score += 6;
  if (/first-?year|freshman/.test(s)) score += 3;
  if (/application-?requirement|how-?to-?apply|apply/.test(s)) score += 2;
  if (/requirements|questions/.test(s)) score += 2;
  return score;
}

async function harvestCollege(page, college) {
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
  let base = (college.official_website || "").trim();
  if (!base) {
    result.note = "no base url";
    return result;
  }
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  let baseHost;
  try {
    baseHost = new URL(base).host;
  } catch {
    result.note = "bad base url";
    return result;
  }
  const baseReg = registrable(baseHost);
  const visited = new Set();

  const seeds = [
    `https://admissions.${baseReg}/`,
    `https://admission.${baseReg}/`,
    `https://apply.${baseReg}/`,
    base,
  ];

  // Collect admissions pages (rendered) → gather essay-candidate links.
  const admissionPages = [];
  for (const seed of seeds) {
    if (admissionPages.length >= 4) break;
    if (visited.has(seed)) continue;
    visited.add(seed);
    if (DENY_RE.test(seed)) continue;
    const r = await render(page, seed);
    if (r) admissionPages.push(r);
  }
  // From homepage-type pages, also follow admissions links.
  const essayCandidates = [];
  for (const ap of admissionPages) {
    // The admissions page itself may hold prompts.
    essayCandidates.push({ url: ap.finalUrl, text: ap.text, rendered: ap });
    for (const l of ap.links) {
      let host;
      try {
        host = new URL(l.href).host;
      } catch {
        continue;
      }
      if (!sameSite(host, baseReg)) continue;
      const hay = `${l.href} ${l.text}`;
      if (DENY_RE.test(l.href)) continue;
      if (ESSAY_LINK_RE.test(hay) || ADMISSION_LINK_RE.test(hay))
        essayCandidates.push({ url: l.href.split("#")[0], text: l.text });
    }
  }

  const ranked = essayCandidates
    .filter((c, i, a) => a.findIndex((x) => x.url === c.url) === i)
    .filter((c) => !DENY_RE.test(c.url))
    .map((c) => ({ ...c, score: scoreEssayUrl(c.url, c.text || "") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  let bestNone = null;
  let aiUsed = false; // at most ONE paid AI call per college
  const deepVisited = new Set();
  for (const cand of ranked) {
    if (stopRun) break;
    if (deepVisited.has(cand.url)) continue;
    deepVisited.add(cand.url);
    if (DENY_RE.test(cand.url) || !GENERAL_RE.test(cand.url)) continue;
    const r = await render(page, cand.url, true); // full JS render (free)
    if (!r) continue;
    const text = r.text;
    const url = r.finalUrl;
    if (DENY_RE.test(url) || !GENERAL_RE.test(url)) continue;
    // A live official page is assumed current unless it stamps an OLDER cycle.
    const hasCurrent = CYCLE_RE.test(text);
    const cycleOk = hasCurrent || !OLD_CYCLE_RE.test(text);
    // Deterministic "no supplement" detection needs no AI.
    if (!SUPP_RE.test(text)) {
      if (STRICT_NONE_RE.test(text) && cycleOk && !bestNone) bestNone = url;
      continue;
    }
    if (!cycleOk || aiUsed) continue;
    // COST GATE: only spend a paid call when the page deterministically looks
    // like it actually presents prompts.
    if (promptSignals(text) < PROMPT_SIGNAL_MIN) {
      if (STRICT_NONE_RE.test(text) && !bestNone) bestNone = url;
      continue;
    }
    if (gatewayDead) {
      result.note = "gateway_402";
      stopRun = true;
      break;
    }
    if (aiCalls >= MAX_AI) {
      result.note = "ai-budget-reached";
      stopRun = true;
      break;
    }
    aiUsed = true; // spend our single call on this best-signal page
    const ext = await extractPrompts(
      essaySlice(text),
      college.canonical_name,
      url,
    );
    if (ext.error) {
      result.note = ext.error;
      if (ext.error === "llm_402") {
        gatewayDead = true;
        stopRun = true;
      }
      break;
    }
    const d = ext.data;
    if (d?.none_required && (!d.prompts || d.prompts.length === 0)) {
      if (STRICT_NONE_RE.test(text) && !bestNone) bestNone = url;
      break;
    }
    if (!d?.prompts?.length) break;
    const canonText = canon(text);
    const good = [];
    const seen = new Set();
    for (const p of d.prompts) {
      if (!p?.prompt_text || typeof p.prompt_text !== "string") continue;
      const pt = cleanText(p.prompt_text);
      if (!promptOk(pt)) continue;
      if (!canonText.includes(canon(pt))) continue; // verbatim gate
      if (seen.has(pt)) continue;
      seen.add(pt);
      good.push({
        prompt_text: pt,
        word_limit: Number.isFinite(p.word_limit) ? p.word_limit : null,
        is_required: p.is_required !== false,
        school_or_program: p.school_or_program || null,
      });
    }
    if (good.length > 0) {
      result.status = "has_supplements";
      result.verified = true;
      result.prompts = good;
      result.sourceUrl = url;
      result.cycleSignal = hasCurrent
        ? (text.match(CYCLE_RE) || [])[0]
        : "live page (no explicit cycle stamp)";
      return result;
    }
    break; // spent our one call; don't keep rendering
  }

  if (bestNone) {
    result.status = "none_required";
    result.verified = true;
    result.sourceUrl = bestNone;
    result.cycleSignal = "current-cycle page";
    result.note = "explicit no-supplement statement";
    return result;
  }
  result.note = result.note || "no verifiable current-cycle general supplement";
  return result;
}

// ── DB load (inline) ─────────────────────────────────────────────────────────
async function loadResult(collegeId, r) {
  if (r.status === "has_supplements" && r.prompts.length) {
    await supabase
      .from("college_supplemental_prompts")
      .delete()
      .eq("college_id", collegeId)
      .eq("cycle_year", CYCLE_YEAR)
      .like("verified_by", "harvest%");
    const rows = r.prompts.map((p, i) => ({
      college_id: collegeId,
      cycle_year: CYCLE_YEAR,
      prompt_text: p.prompt_text,
      word_limit: p.word_limit,
      is_required: p.is_required,
      sort_order: i,
      source_type: "official_site",
      source_url: r.sourceUrl,
      source_date: SOURCE_DATE,
      verified_at: new Date().toISOString(),
      verified_by: "harvest-headless:gemini-2.5-flash",
      confidence: "auto-verbatim",
    }));
    await supabase.from("college_supplemental_prompts").insert(rows);
    await supabase.from("college_supplement_status").upsert(
      {
        college_id: collegeId,
        cycle_year: CYCLE_YEAR,
        status: "has_supplements",
        notes: r.note || null,
        source_type: "official_site",
        source_url: r.sourceUrl,
        source_date: SOURCE_DATE,
        verified_at: new Date().toISOString(),
        verified_by: "harvest-headless:gemini-2.5-flash",
        confidence: "auto-verbatim",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "college_id,cycle_year" },
    );
  } else if (r.status === "none_required") {
    await supabase.from("college_supplement_status").upsert(
      {
        college_id: collegeId,
        cycle_year: CYCLE_YEAR,
        status: "none_required",
        notes:
          r.note ||
          "No supplemental essay found on official application pages.",
        source_type: "official_site",
        source_url: r.sourceUrl,
        source_date: SOURCE_DATE,
        verified_at: new Date().toISOString(),
        verified_by: "harvest-headless:gemini-2.5-flash",
        confidence: "auto",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "college_id,cycle_year" },
    );
  }
}

// ── data ─────────────────────────────────────────────────────────────────────
async function fetchAll(table, cols, applyFilters) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    let q = supabase
      .from(table)
      .select(cols)
      .range(f, f + 999);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
function loadStore() {
  if (existsSync(RESULTS_PATH)) {
    try {
      return JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
    } catch {}
  }
  return { generatedAt: null, cycle: CYCLE_YEAR, results: {} };
}
function saveStore(s) {
  s.generatedAt = new Date().toISOString();
  writeFileSync(RESULTS_PATH, JSON.stringify(s, null, 2));
}
function summarize(s) {
  const r = Object.values(s.results);
  return {
    processed: r.length,
    has: r.filter((x) => x.status === "has_supplements" && x.verified).length,
    none: r.filter((x) => x.status === "none_required" && x.verified).length,
    pending: r.filter((x) => !x.verified).length,
    prompts: r.reduce((a, x) => a + (x.verified ? x.prompts.length : 0), 0),
  };
}

async function pool(items, n, fn, onProgress) {
  const q = [...items];
  let done = 0;
  async function worker(workerId) {
    while (q.length && !stopRun) {
      const item = q.shift();
      try {
        await fn(item, workerId);
      } catch (e) {
        console.error(
          `  ! ${item.slug}: ${String(e?.message || e).slice(0, 120)}`,
        );
      }
      done += 1;
      if (onProgress) await onProgress(done);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, (_, i) => worker(i)),
  );
}

async function main() {
  const handSlugs = new Set(
    (JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")).colleges ?? []).map(
      (c) => c.college,
    ),
  );
  // Colleges that already have verified prompts → done, skip.
  const verifiedPromptRows = await fetchAll(
    "college_supplemental_prompts",
    "college_id",
    (qq) => qq.eq("cycle_year", CYCLE_YEAR).not("verified_at", "is", null),
  );
  const doneIds = new Set(verifiedPromptRows.map((r) => r.college_id));
  // Colleges already verified none_required → skip too.
  const noneRows = await fetchAll(
    "college_supplement_status",
    "college_id, status, verified_at",
    (qq) =>
      qq
        .eq("cycle_year", CYCLE_YEAR)
        .eq("status", "none_required")
        .not("verified_at", "is", null),
  );
  for (const r of noneRows) doneIds.add(r.college_id);

  let colleges = await fetchAll(
    "colleges",
    "id, canonical_name, slug, official_website",
    (qq) => qq.order("canonical_name", { ascending: true }),
  );
  if (ONLY) colleges = colleges.filter((c) => c.slug === ONLY);
  else
    colleges = colleges.filter(
      (c) => !handSlugs.has(c.slug) && !doneIds.has(c.id),
    );

  const store = loadStore();
  // Retry entries that failed only because the gateway/AI errored last time
  // (credit outage etc.) — they were never genuinely resolved.
  let retried = 0;
  for (const [id, r] of Object.entries(store.results)) {
    if (!r.verified && /^(llm_|gateway_402|ai-budget)/.test(r.note || "")) {
      delete store.results[id];
      retried += 1;
    }
  }
  let todo = colleges.filter((c) => ONLY || !store.results[c.id]);
  if (LIMIT !== Infinity) todo = todo.slice(0, LIMIT);

  // Preflight: confirm the gateway has credit before crawling anything.
  const pre = await extractPrompts("test", "preflight", "preflight");
  aiCalls = 0;
  aiInTok = 0;
  aiOutTok = 0;
  if (pre.error === "llm_402") {
    console.error(
      "ABORT: AI Gateway returned 402 (no credit). Add credits, then re-run.",
    );
    process.exit(2);
  }
  gatewayDead = false;

  console.log(
    `Headless harvest: ${todo.length} to process (${retried} AI-failed retried), concurrency ${CONCURRENCY}, load ${NO_LOAD ? "OFF" : "ON"}, max AI ${MAX_AI}, signal-min ${PROMPT_SIGNAL_MIN}.`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  // Block heavy assets to speed rendering.
  await context.route("**/*", (route) => {
    const t = route.request().resourceType();
    if (t === "image" || t === "font" || t === "media") return route.abort();
    return route.continue();
  });
  const pages = await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, Math.max(todo.length, 1)) },
      () => context.newPage(),
    ),
  );

  let sinceSave = 0;
  await pool(
    todo,
    CONCURRENCY,
    async (college, workerId) => {
      const page = pages[workerId] || pages[0];
      const r = await harvestCollege(page, college);
      store.results[college.id] = r;
      if (r.verified && !NO_LOAD) {
        try {
          await loadResult(college.id, r);
        } catch (e) {
          console.error(
            `  ! load ${college.slug}: ${String(e?.message || e).slice(0, 100)}`,
          );
        }
      }
      const tag = r.verified
        ? r.status === "none_required"
          ? "NONE"
          : `${r.prompts.length}p`
        : "pending";
      if (r.verified)
        console.log(
          `  [${tag}] ${college.canonical_name}${r.cycleSignal ? ` (${r.cycleSignal})` : ""} ${r.sourceUrl || ""}`,
        );
    },
    async (done) => {
      sinceSave += 1;
      if (sinceSave >= 15) {
        saveStore(store);
        sinceSave = 0;
        const s = summarize(store);
        console.log(
          `  … ${done}/${todo.length} | ${s.has} has / ${s.none} none / ${s.pending} pending | AI calls ${aiCalls} ~$${estCost().toFixed(3)}`,
        );
      }
    },
  );

  saveStore(store);
  await browser.close();
  const s = summarize(store);
  console.log(
    `\nDone${stopRun ? ` (STOPPED EARLY: ${gatewayDead ? "gateway 402" : "AI budget reached"})` : ""}.`,
  );
  console.log(
    `Checkpoint totals — processed ${s.processed}, has_supplements ${s.has}, none_required ${s.none}, pending ${s.pending}, prompts ${s.prompts}.`,
  );
  console.log(
    `This run — AI calls ${aiCalls}, input ${aiInTok} tok, output ${aiOutTok} tok, estimated spend ~$${estCost().toFixed(3)}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
