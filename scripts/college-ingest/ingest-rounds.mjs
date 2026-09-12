// Current application-cycle rounds/deadlines loader.
//
// Loads the round STRUCTURE from rounds-data.mjs and enriches each round with
// the researched CANDIDATE deadlines/decision-dates/source/confidence from
// rounds-candidates.json (WebFetch-derived, official-source, ALL PENDING) into
// application_cycles + application_rounds. Binding/restrictive/rolling are
// derived from the round type (definitional), never stored per-college.
//
// verified_at is set ONLY where rounds-candidates.json marks it: a college with
// `cycle_verified: true` (human-confirmed against the official source) verifies
// its cycle, and each round with `verified: true` AND a real deadline verifies
// that round. Everything else stays verified_at = null. Dates come only from the
// candidate file — none are invented here. The matching engine must consume only
// rows where verified_at is set, so unverified rows stay inert.
//
//   Dry run (no DB writes; prints per-college add/update/remove diff):
//     node scripts/college-ingest/ingest-rounds.mjs --dry-run
//   Live load (writes via the service role):
//     node scripts/college-ingest/ingest-rounds.mjs
//
// Env (from environment / .env.local, never committed):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Idempotent: reconciles each cycle to exactly the desired round set (adds new,
// updates existing, deletes rounds no longer offered), so re-running is a no-op.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { COLLEGE_ROUNDS, CYCLE_YEAR, ROUND_DEFS } from "./rounds-data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const val = (flag) => {
  const a = args.find((x) => x.startsWith(flag));
  return a ? (a.split("=")[1] ?? args[args.indexOf(a) + 1]) : null;
};
const LIMIT = val("--limit") ? Number(val("--limit")) : Infinity;
const CYCLE = val("--cycle") ?? CYCLE_YEAR;
const FILTER = val("--filter");
// Skip colleges that already have a cycle loaded for CYCLE. Used when expanding
// the list so a re-run only writes the new colleges and leaves already-loaded
// cycles/rounds (and their verification) untouched.
const SKIP_EXISTING = args.includes("--skip-existing");

// ─── Candidate facts (researched, all pending) ────────────────────────────────
const candidatesRaw = JSON.parse(
  readFileSync(join(HERE, "rounds-candidates.json"), "utf8"),
);
const CANDIDATE_SOURCE_DATE = candidatesRaw._meta?.source_date ?? null;
const candidateByCollege = new Map(
  candidatesRaw.colleges.map((c) => [c.college, c]),
);

function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    "Live load needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}
// The loader resolves colleges by name, so it needs DB read access even in a
// dry run (to compute the diff). Without creds it validates the data files only.
const db =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const NOW = new Date().toISOString();
const VERIFIED_BY = "official_site_recheck";

const VALID_TEST_POLICIES = new Set([
  "test_required",
  "test_optional",
  "test_blind",
  "test_flexible",
  "unknown",
]);

function normalizeUrl(u) {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// A structure entry is either a type string or { type, name }.
function normalizeStructureRound(r) {
  const type = typeof r === "string" ? r : r.type;
  const def = ROUND_DEFS[type];
  if (!def) throw new Error(`Unknown round_type "${type}"`);
  const obj = typeof r === "object" ? r : {};
  return {
    round_type: type,
    name: obj.name ?? def.name,
    is_binding: def.is_binding,
    is_restrictive: def.is_restrictive,
    is_rolling: def.is_rolling,
  };
}

// Stable identity for a round within a cycle: round_type + name (name
// discriminates same-type rounds such as Georgia Tech's residency-split EA).
const roundKey = (round_type, name) => `${round_type}::${name ?? ""}`;

function buildNotes(confidence, extra, verified) {
  const parts = [];
  if (confidence)
    parts.push(
      `confidence: ${confidence} (${verified ? "verified" : "unverified"})`,
    );
  if (extra) parts.push(extra);
  return parts.length ? parts.join(" | ") : null;
}

// Attach researched candidate facts to the structure rounds. Candidate rounds
// are matched to structure rounds by round_type, in order (handles duplicate
// types). Returns { rounds, mismatch } — mismatch flags a structure/candidate
// disagreement so we never silently mis-align dates.
function enrichRounds(entryName, structureRounds) {
  const cand = candidateByCollege.get(entryName);
  // A college is cycle-verified only when a human confirmed its current-cycle
  // plans against the official source (cycle_verified: true in the candidate
  // file). Each round is verified independently (round.verified) so a confirmed
  // round can stand even when a sibling round's date is still in conflict.
  const cycleVerified = cand?.cycle_verified === true;
  const queues = new Map(); // round_type -> [candidate round, ...] in order
  if (cand) {
    for (const cr of cand.rounds) {
      if (!queues.has(cr.round_type)) queues.set(cr.round_type, []);
      queues.get(cr.round_type).push(cr);
    }
  }

  const rounds = structureRounds.map((sr) => {
    const q = queues.get(sr.round_type);
    const cr = q?.length ? q.shift() : null;
    const roundVerified = cr?.verified === true;
    return {
      ...sr,
      deadline_date: cr?.deadline ?? null,
      decision_release_date: cr?.decision_date ?? null,
      verified: roundVerified,
      notes: cr ? buildNotes(cr.confidence, cr.notes, roundVerified) : null,
    };
  });

  // Structure/candidate agreement: every candidate round should have been
  // consumed, and structure types should all be covered.
  let mismatch = null;
  if (cand) {
    const leftover = [...queues.values()].flat();
    if (leftover.length) {
      mismatch = `candidate has extra rounds not in structure: ${leftover
        .map((r) => r.round_type)
        .join(", ")}`;
    }
    const structTypes = structureRounds.map((r) => r.round_type).sort();
    const candTypes = cand.rounds.map((r) => r.round_type).sort();
    if (structTypes.join(",") !== candTypes.join(",")) {
      mismatch =
        mismatch ??
        `structure [${structTypes.join(", ")}] != candidate [${candTypes.join(", ")}]`;
    }
  }
  return { rounds, cand, mismatch, cycleVerified };
}

async function resolveCollege(name) {
  if (!db) return null;
  const { data, error } = await db
    .from("colleges")
    .select("id, official_website")
    .eq("canonical_name", name)
    .maybeSingle();
  if (error) throw new Error(`resolve "${name}": ${error.message}`);
  return data;
}

async function getCycleId(collegeId) {
  const { data } = await db
    .from("application_cycles")
    .select("id")
    .eq("college_id", collegeId)
    .eq("cycle_year", CYCLE)
    .maybeSingle();
  return data?.id ?? null;
}

async function getExistingRounds(cycleId) {
  if (!cycleId) return [];
  const { data, error } = await db
    .from("application_rounds")
    .select("id, round_type, name, deadline_date, decision_release_date")
    .eq("cycle_id", cycleId)
    .is("school_id", null)
    .is("program_id", null);
  if (error) throw new Error(`list rounds: ${error.message}`);
  return data ?? [];
}

async function upsertCycle(
  collegeId,
  sourceUrl,
  testPolicy,
  testConf,
  verified,
) {
  const { data, error } = await db
    .from("application_cycles")
    .upsert(
      {
        college_id: collegeId,
        cycle_year: CYCLE,
        test_policy: testPolicy,
        test_policy_notes: testConf
          ? `confidence: ${testConf} (${verified ? "verified" : "unverified"})`
          : null,
        source_type: "official_site",
        source_url: sourceUrl,
        source_date: CANDIDATE_SOURCE_DATE,
        // Verified ONLY when a human confirmed this entry against the official
        // source (verified: true in rounds-data.mjs). Otherwise stays pending.
        verified_at: verified ? NOW : null,
        verified_by: verified ? VERIFIED_BY : null,
        confidence: verified ? "verified" : "unverified_seed",
        updated_at: NOW,
      },
      { onConflict: "college_id,cycle_year" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsert cycle: ${error.message}`);
  return data.id;
}

async function upsertRound(cycleId, existing, sourceUrl, round) {
  // A round is verified only when it was confirmed against the official source
  // AND carries a real deadline. Dateless rows (e.g. rolling) stay pending.
  const roundVerified = round.verified === true && !!round.deadline_date;
  const row = {
    cycle_id: cycleId,
    round_type: round.round_type,
    name: round.name,
    deadline_date: round.deadline_date,
    decision_release_date: round.decision_release_date,
    is_binding: round.is_binding,
    is_restrictive: round.is_restrictive,
    is_rolling: round.is_rolling,
    offered: true,
    notes: round.notes,
    source_url: sourceUrl,
    source_date: CANDIDATE_SOURCE_DATE,
    verified_at: roundVerified ? NOW : null,
    verified_by: roundVerified ? VERIFIED_BY : null,
    updated_at: NOW,
  };
  const match = existing.find(
    (e) =>
      roundKey(e.round_type, e.name) === roundKey(round.round_type, round.name),
  );
  if (match) {
    const { error } = await db
      .from("application_rounds")
      .update(row)
      .eq("id", match.id);
    if (error)
      throw new Error(`update round ${round.round_type}: ${error.message}`);
  } else {
    const { error } = await db.from("application_rounds").insert(row);
    if (error)
      throw new Error(`insert round ${round.round_type}: ${error.message}`);
  }
}

// Delete rounds present in the DB but no longer in the desired set (structure
// corrections that REMOVE a round, e.g. CMU's ED_II).
async function reconcileDeletes(existing, desiredRounds) {
  const desired = new Set(
    desiredRounds.map((r) => roundKey(r.round_type, r.name)),
  );
  const stale = existing.filter(
    (e) => !desired.has(roundKey(e.round_type, e.name)),
  );
  for (const s of stale) {
    const { error } = await db
      .from("application_rounds")
      .delete()
      .eq("id", s.id);
    if (error)
      throw new Error(`delete stale round ${s.round_type}: ${error.message}`);
  }
  return stale;
}

// Store the full researched candidate object as provenance (flags, source,
// confidence, ambiguity). Idempotent: replace any prior row for this cycle.
async function recordProvenance(collegeId, cand) {
  if (!cand) return;
  const tag = `rounds-candidate:${CYCLE}`;
  await db
    .from("college_ingest_raw")
    .delete()
    .eq("college_id", collegeId)
    .eq("notes", tag);
  const { error } = await db.from("college_ingest_raw").insert({
    source: "official_site",
    college_id: collegeId,
    payload: cand,
    notes: tag,
  });
  if (error) throw new Error(`record provenance: ${error.message}`);
}

function diffLine(existing, desired) {
  const existingKeys = new Set(
    existing.map((e) => roundKey(e.round_type, e.name)),
  );
  const desiredKeys = new Set(
    desired.map((r) => roundKey(r.round_type, r.name)),
  );
  const added = desired.filter(
    (r) => !existingKeys.has(roundKey(r.round_type, r.name)),
  );
  const removed = existing.filter(
    (e) => !desiredKeys.has(roundKey(e.round_type, e.name)),
  );
  const updated = desired.filter((r) => {
    const m = existing.find(
      (e) => roundKey(e.round_type, e.name) === roundKey(r.round_type, r.name),
    );
    return (
      m &&
      (m.deadline_date !== r.deadline_date ||
        m.decision_release_date !== r.decision_release_date)
    );
  });
  return { added, removed, updated };
}

async function main() {
  let entries = COLLEGE_ROUNDS.filter(
    (e) => !FILTER || e.name.toLowerCase().includes(FILTER.toLowerCase()),
  ).slice(0, LIMIT);

  // Optionally drop colleges that already have a cycle for CYCLE so an expansion
  // run only writes new colleges and leaves existing cycles/rounds untouched.
  let skipped = 0;
  if (SKIP_EXISTING && db) {
    const loaded = new Set();
    // Paginate: past 1000 existing cycles the default PostgREST page cap would
    // silently truncate the skip set, causing already-loaded colleges to be
    // reprocessed (and their rows re-touched) on an expansion run.
    let from = 0;
    for (;;) {
      const { data, error } = await db
        .from("application_cycles")
        .select("college_id, colleges(canonical_name)")
        .eq("cycle_year", CYCLE)
        .range(from, from + 999);
      if (error) throw new Error(`load existing cycles: ${error.message}`);
      for (const r of data ?? []) {
        const n = r.colleges?.canonical_name;
        if (n) loaded.add(n);
      }
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    const before = entries.length;
    entries = entries.filter((e) => !loaded.has(e.name));
    skipped = before - entries.length;
  }

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Rounds load — ${entries.length} colleges` +
      `${skipped ? ` (${skipped} already loaded, skipped)` : ""}, cycle_year="${CYCLE}"` +
      `${db ? "" : " (no DB creds — structural validation only)"}\n`,
  );

  const report = {
    colleges: 0,
    roundsDesired: 0,
    roundsWithDeadline: 0,
    added: 0,
    updated: 0,
    removed: 0,
    unmatched: [],
    mismatches: [],
    missingCandidate: [],
    errors: [],
    verifiedColleges: [],
    verifiedRounds: 0,
  };

  for (const entry of entries) {
    try {
      const structureRounds = entry.rounds.map(normalizeStructureRound);
      const { rounds, cand, mismatch, cycleVerified } = enrichRounds(
        entry.name,
        structureRounds,
      );

      const college = await resolveCollege(entry.name);
      if (db && !college) {
        report.unmatched.push(entry.name);
        console.log(`  ✗ NO DB MATCH  ${entry.name}`);
        continue;
      }
      if (!cand) report.missingCandidate.push(entry.name);
      if (mismatch) report.mismatches.push(`${entry.name}: ${mismatch}`);

      // Candidate source is more precise than the college homepage.
      const sourceUrl = normalizeUrl(cand?.source ?? college?.official_website);
      let testPolicy = cand?.test_policy?.value ?? "unknown";
      if (!VALID_TEST_POLICIES.has(testPolicy)) testPolicy = "unknown";
      const testConf = cand?.test_policy?.confidence ?? null;

      report.colleges++;
      report.roundsDesired += rounds.length;
      report.roundsWithDeadline += rounds.filter((r) => r.deadline_date).length;

      let existing = [];
      if (db) {
        const cycleId = await getCycleId(college.id);
        existing = await getExistingRounds(cycleId);
      }
      const { added, removed, updated } = diffLine(existing, rounds);
      report.added += added.length;
      report.updated += updated.length;
      report.removed += removed.length;

      const roundsVerified = rounds.filter(
        (r) => r.verified && r.deadline_date,
      ).length;
      if (cycleVerified) report.verifiedColleges.push(entry.name);
      report.verifiedRounds += roundsVerified;

      if (!DRY_RUN && db) {
        const cycleId = await upsertCycle(
          college.id,
          sourceUrl,
          testPolicy,
          testConf,
          cycleVerified,
        );
        const existingForWrite = await getExistingRounds(cycleId);
        for (const r of rounds)
          await upsertRound(cycleId, existingForWrite, sourceUrl, r);
        await reconcileDeletes(existingForWrite, rounds);
        await recordProvenance(college.id, cand);
      }

      const withDates = rounds.filter((r) => r.deadline_date).length;
      const flagTag = mismatch ? " ⚠ STRUCTURE MISMATCH" : "";
      const vTag = cycleVerified
        ? ` ✓ VERIFIED (${roundsVerified}/${rounds.length} rounds)`
        : "";
      const diffTag =
        added.length || removed.length || updated.length
          ? `  [+${added.length} ~${updated.length} -${removed.length}]`
          : "  [no change]";
      console.log(
        `  • ${entry.name} — ${rounds.map((r) => r.round_type).join(", ")}` +
          `  (deadlines ${withDates}/${rounds.length})${diffTag}${flagTag}${vTag}`,
      );
      if (removed.length)
        console.log(
          `      removing: ${removed.map((r) => `${r.round_type}/${r.name}`).join(", ")}`,
        );
      if (mismatch) console.log(`      ⚠ ${mismatch}`);
    } catch (err) {
      report.errors.push(`${entry.name}: ${err.message}`);
      console.log(`  ! ERROR       ${entry.name}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. colleges=${report.colleges} rounds(desired)=${report.roundsDesired} ` +
      `with-deadline=${report.roundsWithDeadline}` +
      `\nChanges: +${report.added} added  ~${report.updated} updated  -${report.removed} removed` +
      `\nVerified: cycles=${report.verifiedColleges.length} rounds=${report.verifiedRounds}` +
      `  (all others pending, verified_at=null)`,
  );
  if (report.verifiedColleges.length)
    console.log(
      `\nVERIFIED colleges (official-source re-check):\n  ${report.verifiedColleges.join("\n  ")}`,
    );
  if (report.unmatched.length)
    console.log(`\nNo DB match:\n  ${report.unmatched.join("\n  ")}`);
  if (report.missingCandidate.length)
    console.log(
      `\nNo candidate facts (structure only, dates pending):\n  ${report.missingCandidate.join("\n  ")}`,
    );
  if (report.mismatches.length)
    console.log(
      `\n⚠ STRUCTURE/CANDIDATE MISMATCHES (dates NOT aligned — fix before trusting):\n  ${report.mismatches.join("\n  ")}`,
    );
  if (report.errors.length)
    console.log(`\nERRORS:\n  ${report.errors.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
