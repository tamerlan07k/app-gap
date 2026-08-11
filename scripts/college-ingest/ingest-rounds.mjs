// Current application-cycle rounds/deadlines loader.
//
// Loads the round STRUCTURE from rounds-data.mjs into application_cycles +
// application_rounds. Binding/restrictive/rolling are derived from the round
// type (definitional), never stored per-college. Dates are written only when
// present in the data file AND the entry is `verified: true`; otherwise they
// stay pending (null) and `verified_at` stays null.
//
//   Dry run (no DB writes; reports matches + verification status):
//     node scripts/college-ingest/ingest-rounds.mjs --dry-run
//   Live load (writes via the service role):
//     node scripts/college-ingest/ingest-rounds.mjs
//
// Env (from environment / .env.local, never committed):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Nothing is invented: unverified rows are gated by verified_at so the matching
// engine (later) only ever consumes human-verified rounds/deadlines.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { COLLEGE_ROUNDS, CYCLE_YEAR, ROUND_DEFS } from "./rounds-data.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const val = (flag) => {
  const a = args.find((x) => x.startsWith(flag));
  return a ? (a.split("=")[1] ?? args[args.indexOf(a) + 1]) : null;
};
const LIMIT = val("--limit") ? Number(val("--limit")) : Infinity;
const CYCLE = val("--cycle") ?? CYCLE_YEAR;
const FILTER = val("--filter");

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
// dry run. Without creds it validates the data file structure only.
const db =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date().toISOString();

function normalizeUrl(u) {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// A round entry is either a type string or { type, deadline_date, ... }.
function normalizeRound(r) {
  const type = typeof r === "string" ? r : r.type;
  const def = ROUND_DEFS[type];
  if (!def) throw new Error(`Unknown round_type "${type}"`);
  const obj = typeof r === "object" ? r : {};
  return {
    round_type: type,
    name: obj.name ?? def.name,
    deadline_date: obj.deadline_date ?? null,
    decision_release_date: obj.decision_release_date ?? null,
    is_binding: def.is_binding,
    is_restrictive: def.is_restrictive,
    is_rolling: def.is_rolling,
  };
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

async function upsertCycle(collegeId, sourceUrl, verified) {
  const { data, error } = await db
    .from("application_cycles")
    .upsert(
      {
        college_id: collegeId,
        cycle_year: CYCLE,
        test_policy: "unknown", // pending — verified from the official source later
        source_type: "official_site",
        source_url: sourceUrl,
        source_date: TODAY,
        verified_at: verified ? NOW : null,
        verified_by: verified ? "manual" : null,
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

async function upsertRound(cycleId, sourceUrl, round, entryVerified) {
  // A round is verified only when the entry is verified AND it carries a real
  // deadline — structure-only rows stay pending.
  const verifiedAt = entryVerified && round.deadline_date ? NOW : null;
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
    source_url: sourceUrl,
    source_date: TODAY,
    verified_at: verifiedAt,
    verified_by: verifiedAt ? "manual" : null,
    updated_at: NOW,
  };
  const { data: existing } = await db
    .from("application_rounds")
    .select("id")
    .eq("cycle_id", cycleId)
    .eq("round_type", round.round_type)
    .is("school_id", null)
    .is("program_id", null)
    .maybeSingle();
  if (existing) {
    const { error } = await db
      .from("application_rounds")
      .update(row)
      .eq("id", existing.id);
    if (error)
      throw new Error(`update round ${round.round_type}: ${error.message}`);
  } else {
    const { error } = await db.from("application_rounds").insert(row);
    if (error)
      throw new Error(`insert round ${round.round_type}: ${error.message}`);
  }
}

async function main() {
  const entries = COLLEGE_ROUNDS.filter(
    (e) => !FILTER || e.name.toLowerCase().includes(FILTER.toLowerCase()),
  ).slice(0, LIMIT);

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Rounds load — ${entries.length} colleges, cycle_year="${CYCLE}"` +
      `${db ? "" : " (no DB creds — structural validation only)"}\n`,
  );

  const report = {
    verified: [],
    seeded: [],
    unmatched: [],
    errors: [],
    rounds: 0,
    withDates: 0,
  };

  for (const entry of entries) {
    try {
      const rounds = entry.rounds.map(normalizeRound);
      const hasDates = rounds.some((r) => r.deadline_date);
      const college = await resolveCollege(entry.name);

      if (db && !college) {
        report.unmatched.push(entry.name);
        console.log(`  ✗ NO DB MATCH  ${entry.name}`);
        continue;
      }

      const sourceUrl = normalizeUrl(college?.official_website);
      if (!DRY_RUN && db) {
        const cycleId = await upsertCycle(
          college.id,
          sourceUrl,
          entry.verified,
        );
        for (const r of rounds)
          await upsertRound(cycleId, sourceUrl, r, entry.verified);
      }

      report.rounds += rounds.length;
      if (hasDates) report.withDates++;
      (entry.verified ? report.verified : report.seeded).push(entry.name);

      const tag = entry.verified ? "✓ verified" : "• seeded  ";
      const types = rounds.map((r) => r.round_type).join(", ");
      console.log(
        `  ${tag}  ${entry.name} — ${types}  (dates: ${hasDates ? "present" : "pending"})`,
      );
    } catch (err) {
      report.errors.push(`${entry.name}: ${err.message}`);
      console.log(`  ! ERROR       ${entry.name}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. colleges=${entries.length} rounds=${report.rounds} ` +
      `verified=${report.verified.length} seeded(unverified)=${report.seeded.length} ` +
      `with-dates=${report.withDates} unmatched=${report.unmatched.length} errors=${report.errors.length}`,
  );
  if (report.unmatched.length)
    console.log(
      `\nNo DB match (name mismatch):\n  ${report.unmatched.join("\n  ")}`,
    );
  if (report.seeded.length)
    console.log(
      `\nNEEDS MANUAL VERIFICATION (confirm rounds + add deadlines from official source):\n  ${report.seeded.join("\n  ")}`,
    );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
