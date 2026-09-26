// College logo backfill — SELF-HOSTED, high-resolution, multi-source.
//
// Goal: every college gets a real, crisp, app-owned official logo. We download
// the best available logo per school, VALIDATE it is a real image (never a
// generic placeholder), upload it to the public Supabase Storage bucket
// `college-logos`, and set colleges.logo_asset_path to its public URL (the UI
// prefers logo_asset_path, so this wins over any older logo_url). Serving from
// our own bucket means no render-time dependency on a third party and no blur
// from tiny favicons.
//
// Source priority (first that yields a real image wins):
//   1. Wikidata P154 (official logo image on Wikimedia Commons), rendered at
//      512px — highest quality; matched on IPEDS unitid (P1771), the same id the
//      profiles ingester uses. ~57% of schools.
//   2. icon.horse — returns the site's best icon (apple-touch-icon ~180px);
//      rejects its known generic-fallback image.
//   3. DuckDuckGo ip3 — small favicon; rejects its 404 placeholder body.
// A school for which NONE yields a real image keeps logo_asset_path = null and
// the UI renders the generated monogram (reported at the end — nothing invented).
//
// Secrets from environment / .env.local, never hard-coded:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
//   node scripts/college-ingest/backfill-logos.mjs            # full run
//   node scripts/college-ingest/backfill-logos.mjs --limit 20 # first N (testing)
//   node scripts/college-ingest/backfill-logos.mjs --dry-run  # resolve only, no writes

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "college-logos";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const UA = "appgap-logo-backfill/1.0 (https://appgap; ktamerlan0714@gmail.com)";
const COMMONS_WIDTH = 512;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
// Retry only the schools that currently fall back to a monogram (logo_variant =
// 'monogram') — used to rescue API gaps with the extra site-icon sources.
const ONLY_MONOGRAMS = args.includes("--only-monograms");
// Re-resolve only the schools whose current logo is a Wikidata photo (wrong P154
// pointing at a campus photograph) — they now skip that P154 and use a real source.
const RESCAN_PHOTOS = args.includes("--rescan-photos");
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg
  ? Number(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1])
  : Infinity;

function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // optional
  }
  return env;
}
const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function domainFromWebsite(url) {
  if (!url) return null;
  let s = String(url).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.split(/[/?#]/)[0];
  s = s.replace(/^www\./, "").replace(/:\d+$/, "");
  if (!s || !s.includes(".")) return null;
  const labels = s.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  if (labels[labels.length - 1] === "edu" && labels.length > 2) {
    return labels.slice(-2).join(".");
  }
  return labels.join(".");
}

function hashBytes(buf) {
  let h = 0;
  for (const b of buf) h = (h * 31 + b) | 0;
  return h;
}

const EXT_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

// icon.horse serves a fixed generic image when it has nothing; DuckDuckGo serves
// a fixed 1478-byte placeholder (with a 404). Reject both by signature.
const ICON_HORSE_GENERIC_HASH = -809005656;
const DDG_PLACEHOLDER_BYTES = 1478;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryFetchImage(url, opts = {}) {
  const retries = opts.retries ?? 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      // Wikimedia Commons rate-limits sustained thumbnail requests with 429;
      // back off and retry rather than falling through to a lower-quality source.
      if ((res.status === 429 || res.status === 503) && attempt < retries) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (res.status !== 200) return null;
      const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (!ct.startsWith("image/") && ct !== "application/octet-stream")
        return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < (opts.minBytes ?? 200)) return null;
      if (opts.rejectHash != null && hashBytes(buf) === opts.rejectHash)
        return null;
      if (opts.rejectBytes != null && buf.length === opts.rejectBytes)
        return null;
      const ext = EXT_BY_TYPE[ct] ?? "png";
      return {
        buf,
        contentType: ct === "application/octet-stream" ? "image/png" : ct,
        ext,
      };
    } catch {
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  return null;
}

// ─── Wikidata P154 (official logo) by unitid, in chunks with retries ────────────

async function fetchWikidataLogos(unitids) {
  const out = new Map();
  const CHUNK = 150;
  for (let i = 0; i < unitids.length; i += CHUNK) {
    const values = unitids
      .slice(i, i + CHUNK)
      .map((u) => `"${u}"`)
      .join(" ");
    const q =
      `SELECT ?unitid ?logo WHERE { VALUES ?unitid { ${values} } ` +
      `?item wdt:P1771 ?unitid . ?item wdt:P154 ?logo . }`;
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      try {
        const res = await fetch(
          `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(q)}`,
          {
            headers: {
              "User-Agent": UA,
              Accept: "application/sparql-results+json",
            },
          },
        );
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        const json = await res.json();
        for (const b of json.results?.bindings ?? []) {
          const u = b.unitid?.value;
          const logo = b.logo?.value;
          if (u && logo && !out.has(u)) out.set(u, logo);
        }
        ok = true;
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    process.stdout.write(
      `\r  Wikidata: queried ${Math.min(i + CHUNK, unitids.length)}/${unitids.length}, logos=${out.size}`,
    );
  }
  process.stdout.write("\n");
  return out;
}

// Some Wikidata P154 values are WRONG — they point to a campus photograph (a
// sign, clock tower, statue, aerial, etc.) instead of the logo. Detect those by
// the Commons filename so we skip them and fall through to a real logo source.
// Word boundaries matter: "signature"/"redesigned" are LOGO names, not "sign".
function isLikelyPhotoFile(p154) {
  const f = decodeURIComponent(p154.split("/Special:FilePath/")[1] || p154);
  const LOGO =
    /(logo|wordmark|seal|crest|emblem|insignia|coat.?of.?arms|\barms\b|shield|monogram|signature|brand|identity)/i;
  if (LOGO.test(f)) return false;
  const PHOTO =
    /(\bsign\b|clock.?tower|\bstatue\b|img[ _-]?\d|\baerial\b|\bcampus\b|panoram|\bfacade\b|main.?entrance|\bentrance\b|skyline|\bfountain\b|\bstadium\b|\bexterior\b|\bnight\b|\bwinter\b)/i;
  return PHOTO.test(f);
}

function commonsRenderUrl(p154) {
  // P154 is a Commons file URL; Special:FilePath?width=N rasterizes SVGs and
  // thumbnails rasters to a crisp PNG at that width.
  if (p154.includes("Special:FilePath/")) {
    return `${p154}${p154.includes("?") ? "&" : "?"}width=${COMMONS_WIDTH}`;
  }
  const file = p154.split("/").pop();
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${COMMONS_WIDTH}`;
}

// The school's OWN site icons: apple-touch-icon (≈180px, good quality) declared
// at the well-known path or in the homepage <head>, then favicon.ico as a last
// resort. Used to rescue schools no logo API covers.
async function fetchSiteIcon(domain) {
  const base = `https://${domain}`;
  for (const p of [
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
  ]) {
    const img = await tryFetchImage(base + p, { minBytes: 600, retries: 1 });
    if (img) return img;
  }
  try {
    const res = await fetch(base, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const html = await res.text();
      const tags = [
        ...html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi),
      ].map((m) => m[0]);
      const hrefs = [];
      for (const tag of tags) {
        const h = /href=["']([^"']+)["']/i.exec(tag);
        if (h) hrefs.push({ href: h[1], apple: /apple-touch/i.test(tag) });
      }
      hrefs.sort((a, b) => (b.apple ? 1 : 0) - (a.apple ? 1 : 0));
      for (const { href } of hrefs) {
        const u = href.startsWith("http")
          ? href
          : href.startsWith("//")
            ? `https:${href}`
            : base + (href.startsWith("/") ? "" : "/") + href;
        const img = await tryFetchImage(u, { minBytes: 600, retries: 1 });
        if (img) return img;
      }
    }
  } catch {
    // homepage unreachable → fall through to favicon
  }
  return await tryFetchImage(`${base}/favicon.ico`, {
    minBytes: 400,
    retries: 1,
  });
}

// ─── resolve the best logo bytes for one college ────────────────────────────────

async function resolveLogo(college, wikidataLogos) {
  const p154 = wikidataLogos.get(String(college.ipeds_unitid));
  if (p154 && !isLikelyPhotoFile(p154)) {
    // retries: Commons 429-rate-limits sustained thumbnail requests; keep trying
    // so a school with a real Wikidata logo never silently downgrades to a favicon.
    const img = await tryFetchImage(commonsRenderUrl(p154), {
      minBytes: 400,
      retries: 6,
    });
    if (img) return { ...img, source: "wikidata", sourceUrl: p154 };
  }
  const domain = domainFromWebsite(college.official_website);
  if (domain) {
    const ih = await tryFetchImage(`https://icon.horse/icon/${domain}`, {
      minBytes: 300,
      rejectHash: ICON_HORSE_GENERIC_HASH,
      retries: 2,
    });
    if (ih)
      return { ...ih, source: "iconhorse", sourceUrl: `https://${domain}` };
    // The school's own apple-touch-icon / declared icon (rescues API gaps).
    const site = await fetchSiteIcon(domain);
    if (site)
      return { ...site, source: "site", sourceUrl: `https://${domain}` };
    const ddg = await tryFetchImage(
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      { minBytes: 100, rejectBytes: DDG_PLACEHOLDER_BYTES },
    );
    if (ddg)
      return { ...ddg, source: "duckduckgo", sourceUrl: `https://${domain}` };
  }
  return null;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function loadColleges() {
  const rows = [];
  let from = 0;
  for (;;) {
    let query = db
      .from("colleges")
      .select(
        "id, slug, canonical_name, ipeds_unitid, official_website, logo_source_url",
      )
      .eq("status", "active");
    if (ONLY_MONOGRAMS) query = query.eq("logo_variant", "monogram");
    if (RESCAN_PHOTOS) query = query.like("logo_source_url", "%commons%");
    const { data, error } = await query
      .order("canonical_name")
      .range(from, from + 999);
    if (error) throw new Error(`load colleges: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  // In photo-rescan mode, keep only rows whose stored Wikidata logo is a photo.
  return RESCAN_PHOTOS
    ? rows.filter(
        (r) => r.logo_source_url && isLikelyPhotoFile(r.logo_source_url),
      )
    : rows;
}

async function mapLimit(items, concurrency, fn) {
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const colleges = (await loadColleges()).slice(0, LIMIT);
  console.log(`Loaded ${colleges.length} colleges.`);
  const unitids = colleges
    .map((c) => c.ipeds_unitid)
    .filter((u) => u != null)
    .map(String);
  const wikidataLogos = await fetchWikidataLogos(unitids);

  const summary = {
    wikidata: 0,
    iconhorse: 0,
    site: 0,
    duckduckgo: 0,
    monogram: 0,
    uploaded: 0,
    errors: [],
  };

  // Concurrency 3 keeps us under Wikimedia Commons' sustained-request 429 limit
  // (with the retry/backoff in tryFetchImage as a second guard).
  await mapLimit(colleges, 3, async (c) => {
    let logo;
    try {
      logo = await resolveLogo(c, wikidataLogos);
    } catch (e) {
      summary.errors.push(`${c.canonical_name}: resolve ${e.message}`);
      return;
    }

    if (!logo) {
      summary.monogram++;
      if (!DRY_RUN) {
        await db
          .from("colleges")
          .update({
            logo_asset_path: null,
            logo_url: null,
            logo_variant: "monogram",
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.id);
      }
      return;
    }

    summary[logo.source]++;
    if (DRY_RUN) return;

    const path = `${c.slug}.${logo.ext}`;
    const up = await db.storage
      .from(BUCKET)
      .upload(path, logo.buf, { contentType: logo.contentType, upsert: true });
    if (up.error) {
      summary.errors.push(`${c.canonical_name}: upload ${up.error.message}`);
      return;
    }
    const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await db
      .from("colleges")
      .update({
        logo_asset_path: publicUrl,
        logo_url: null,
        logo_variant: "official",
        logo_source_url: logo.sourceUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) summary.errors.push(`${c.canonical_name}: db ${error.message}`);
    else summary.uploaded++;
  });

  const real =
    summary.wikidata + summary.iconhorse + summary.site + summary.duckduckgo;
  const pct = ((real / colleges.length) * 100).toFixed(1);
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Done over ${colleges.length} colleges.\n` +
      `  real logo: ${real} (${pct}%)  [wikidata=${summary.wikidata} icon.horse=${summary.iconhorse} site=${summary.site} duckduckgo=${summary.duckduckgo}]\n` +
      `  monogram fallback: ${summary.monogram}\n` +
      `${DRY_RUN ? "" : `  uploaded+written: ${summary.uploaded}\n`}` +
      `  errors: ${summary.errors.length}`,
  );
  if (summary.errors.length) {
    console.log(
      `Errors (first 20):\n  ${summary.errors.slice(0, 20).join("\n  ")}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
