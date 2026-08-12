// Server-side data access for My Colleges. Reads the public college reference
// tables plus the user's saved list. Rounds are scoped to CURRENT_CYCLE_YEAR so
// we never surface a prior cycle's deadlines.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollegeFieldData } from "./evaluate";
import {
  type ApplicationRound,
  type CollegeCycle,
  type CollegeWithData,
  CURRENT_CYCLE_YEAR,
  type FieldResource,
  type FieldStrengthRecord,
  type MatchProfile,
} from "./types";

// Canonical display order for round types.
const ROUND_ORDER = ["EA", "REA", "ED", "ED_II", "RD", "PRIORITY", "ROLLING"];

interface StatsRow {
  college_id: string;
  source_date: string | null;
  admit_rate: number | null;
  sat_ebrw_25: number | null;
  sat_ebrw_75: number | null;
  sat_math_25: number | null;
  sat_math_75: number | null;
  sat_total_25: number | null;
  sat_total_75: number | null;
  act_composite_25: number | null;
  act_composite_75: number | null;
  gpa_avg: number | null;
}

interface CycleRow {
  id: string;
  college_id: string;
  test_policy: string | null;
  verified_at: string | null;
}

interface RoundRow {
  id: string;
  cycle_id: string;
  round_type: string;
  name: string | null;
  deadline_date: string | null;
  decision_release_date: string | null;
  is_binding: boolean;
  is_restrictive: boolean;
  is_rolling: boolean;
  offered: boolean;
  verified_at: string | null;
}

export async function loadMatchProfile(
  client: SupabaseClient,
  userId: string,
): Promise<MatchProfile | null> {
  const { data } = await client
    .from("profiles")
    .select("unweighted_gpa, sat_score, act_score")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    unweightedGpa: data.unweighted_gpa ?? null,
    satScore: data.sat_score ?? null,
    actScore: data.act_score ?? null,
  };
}

export interface SavedCollege {
  collegeId: string;
  source: string;
  selectedRoundId: string | null;
}

export async function loadUserColleges(
  client: SupabaseClient,
  userId: string,
): Promise<SavedCollege[]> {
  const { data } = await client
    .from("user_colleges")
    .select("college_id, source, selected_round_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    collegeId: r.college_id as string,
    source: (r.source as string) ?? "manual",
    selectedRoundId: (r.selected_round_id as string | null) ?? null,
  }));
}

/** The user's intended-field key (profiles.major_category), or null. */
export async function loadFieldKey(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from("profiles")
    .select("major_category")
    .eq("id", userId)
    .maybeSingle();
  return (data?.major_category as string | null) ?? null;
}

/** List-level finalization timestamp, or null if still in exploration. */
export async function loadFinalizedAt(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from("user_college_state")
    .select("finalized_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.finalized_at as string | null) ?? null;
}

// ─── Field-fit data layer ─────────────────────────────────────────────────────

interface FieldStrengthRow {
  college_id: string;
  field_key: string;
  strength: "excellent" | "strong" | "moderate" | "limited" | "unknown";
  headline: string | null;
  notes: string | null;
  source_url: string | null;
  verified_at: string | null;
}

interface FieldResourceRow {
  college_id: string;
  field_key: string | null;
  resource_type: string;
  title: string;
  description: string | null;
  url: string | null;
  verified_at: string | null;
}

export interface FieldDataIndex {
  /** key `${collegeId}:${fieldKey}` → strength record. */
  strengthByKey: Map<string, FieldStrengthRow>;
  /** key `${collegeId}:${fieldKey}` → resource rows. */
  resourcesByKey: Map<string, FieldResourceRow[]>;
}

/**
 * Load the source-attributed field-strength + resource layer. Starts empty (no
 * data invented); scoped narrowly to one field_key when provided to keep it
 * cheap. Fail-soft so the page still works before any field data is ingested.
 */
export async function loadFieldDataIndex(
  client: SupabaseClient,
  fieldKey: string | null,
): Promise<FieldDataIndex> {
  const strengthByKey = new Map<string, FieldStrengthRow>();
  const resourcesByKey = new Map<string, FieldResourceRow[]>();
  if (!fieldKey) return { strengthByKey, resourcesByKey };

  try {
    const [strengthsRes, resourcesRes] = await Promise.all([
      client
        .from("college_field_strengths")
        .select(
          "college_id, field_key, strength, headline, notes, source_url, verified_at",
        )
        .eq("field_key", fieldKey),
      client
        .from("college_field_resources")
        .select(
          "college_id, field_key, resource_type, title, description, url, verified_at",
        )
        .eq("field_key", fieldKey),
    ]);
    for (const s of (strengthsRes.data ?? []) as FieldStrengthRow[]) {
      strengthByKey.set(`${s.college_id}:${s.field_key}`, s);
    }
    for (const r of (resourcesRes.data ?? []) as FieldResourceRow[]) {
      const key = `${r.college_id}:${r.field_key}`;
      if (!resourcesByKey.has(key)) resourcesByKey.set(key, []);
      resourcesByKey.get(key)?.push(r);
    }
  } catch {
    // Field data layer not present yet — degrade to "unknown" everywhere.
  }
  return { strengthByKey, resourcesByKey };
}

/**
 * Load every college with its standardized stats and current-cycle application
 * rounds. Returns a map keyed by college id for easy lookup + the full array.
 */
export async function loadCollegesWithData(client: SupabaseClient): Promise<{
  all: CollegeWithData[];
  byId: Map<string, CollegeWithData>;
}> {
  const [collegesRes, statsRes, cyclesRes] = await Promise.all([
    client
      .from("colleges")
      .select(
        "id, slug, canonical_name, city, state, institution_type, logo_asset_path, logo_variant, official_website",
      )
      .eq("status", "active")
      .order("canonical_name"),
    client
      .from("college_admission_stats")
      .select(
        "college_id, source_date, admit_rate, sat_ebrw_25, sat_ebrw_75, sat_math_25, sat_math_75, sat_total_25, sat_total_75, act_composite_25, act_composite_75, gpa_avg",
      ),
    client
      .from("application_cycles")
      .select("id, college_id, test_policy, verified_at")
      .eq("cycle_year", CURRENT_CYCLE_YEAR),
  ]);

  const colleges = collegesRes.data ?? [];
  const statsRows = (statsRes.data ?? []) as StatsRow[];
  const cycleRows = (cyclesRes.data ?? []) as CycleRow[];

  // Rounds for the current cycle only.
  const cycleIds = cycleRows.map((c) => c.id);
  let roundRows: RoundRow[] = [];
  if (cycleIds.length) {
    const { data } = await client
      .from("application_rounds")
      .select(
        "id, cycle_id, round_type, name, deadline_date, decision_release_date, is_binding, is_restrictive, is_rolling, offered, verified_at",
      )
      .in("cycle_id", cycleIds)
      .eq("offered", true);
    roundRows = (data ?? []) as RoundRow[];
  }

  // Pick the most recent stats row per college.
  const statsByCollege = new Map<string, StatsRow>();
  for (const s of statsRows) {
    const prev = statsByCollege.get(s.college_id);
    if (!prev || (s.source_date ?? "") > (prev.source_date ?? "")) {
      statsByCollege.set(s.college_id, s);
    }
  }

  const roundsByCycle = new Map<string, RoundRow[]>();
  for (const r of roundRows) {
    if (!roundsByCycle.has(r.cycle_id)) roundsByCycle.set(r.cycle_id, []);
    roundsByCycle.get(r.cycle_id)?.push(r);
  }

  const cycleByCollege = new Map<string, CycleRow>();
  for (const c of cycleRows) cycleByCollege.set(c.college_id, c);

  const all: CollegeWithData[] = colleges.map((c) => {
    const s = statsByCollege.get(c.id);
    const cycleRow = cycleByCollege.get(c.id);
    let cycle: CollegeCycle | null = null;
    if (cycleRow) {
      const rounds: ApplicationRound[] = (roundsByCycle.get(cycleRow.id) ?? [])
        .map((r) => ({
          id: r.id,
          roundType: r.round_type,
          name: r.name,
          deadlineDate: r.deadline_date,
          decisionReleaseDate: r.decision_release_date,
          isBinding: r.is_binding,
          isRestrictive: r.is_restrictive,
          isRolling: r.is_rolling,
          verified: r.verified_at != null,
        }))
        .sort((a, b) => {
          const oa = ROUND_ORDER.indexOf(a.roundType);
          const ob = ROUND_ORDER.indexOf(b.roundType);
          if (oa !== ob) return oa - ob;
          return (a.deadlineDate ?? "9999").localeCompare(
            b.deadlineDate ?? "9999",
          );
        });
      cycle = {
        cycleYear: CURRENT_CYCLE_YEAR,
        testPolicy: cycleRow.test_policy,
        verified: cycleRow.verified_at != null,
        rounds,
      };
    }
    return {
      id: c.id,
      slug: c.slug,
      name: c.canonical_name,
      city: c.city,
      state: c.state,
      institutionType: c.institution_type,
      logoAssetPath: c.logo_asset_path,
      logoVariant: c.logo_variant,
      officialWebsite: c.official_website,
      stats: s
        ? {
            admitRate: s.admit_rate,
            satEbrw25: s.sat_ebrw_25,
            satEbrw75: s.sat_ebrw_75,
            satMath25: s.sat_math_25,
            satMath75: s.sat_math_75,
            satTotal25: s.sat_total_25,
            satTotal75: s.sat_total_75,
            actComposite25: s.act_composite_25,
            actComposite75: s.act_composite_75,
            gpaAvg: s.gpa_avg,
          }
        : null,
      cycle,
    };
  });

  const byId = new Map(all.map((c) => [c.id, c]));
  return { all, byId };
}

/** Extract the (college, field) field data from the index, mapped to the
 * public FieldFit input shape. Returns empty data when nothing is ingested. */
export function fieldDataFor(
  index: FieldDataIndex,
  collegeId: string,
  fieldKey: string | null,
): CollegeFieldData {
  if (!fieldKey) return { strength: null, resources: [] };
  const key = `${collegeId}:${fieldKey}`;
  const s = index.strengthByKey.get(key);
  const strength: FieldStrengthRecord | null = s
    ? {
        fieldKey: s.field_key,
        strength: s.strength,
        headline: s.headline,
        notes: s.notes,
        verified: s.verified_at != null,
        sourceUrl: s.source_url,
      }
    : null;
  const resources: FieldResource[] = (index.resourcesByKey.get(key) ?? []).map(
    (r) => ({
      resourceType: r.resource_type,
      title: r.title,
      description: r.description,
      url: r.url,
      verified: r.verified_at != null,
    }),
  );
  return { strength, resources };
}
