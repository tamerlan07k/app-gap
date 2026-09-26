// Server-side loaders + row mappers for the Awards section. Owner-scoped (RLS +
// explicit user_id) for the student's awards; public-read for the opportunity
// catalog. Tolerant of environments where the recognition columns / opportunities
// table aren't migrated yet (degrade to base fields / empty catalog) so the page
// never hard-crashes mid-rollout — the same defensive posture as the supplemental
// and coursework loaders.

import type { SupabaseClient } from "@supabase/supabase-js";
import { coerceThemes } from "./themes";
import type {
  AwardRecord,
  Opportunity,
  OpportunityCategory,
  OpportunityEffort,
} from "./types";

// Rich award columns; select("*") isn't used so a missing column degrades cleanly.
const AWARD_COLS =
  "id, name, organization, year, level, category, placement, grade, selectivity_context, description, evidence_url, student_explanation, sort_order";

function awardFromRow(row: Record<string, unknown>): AwardRecord {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    organization: (row.organization as string) ?? "",
    year: (row.year as string) ?? "",
    level: (row.level as string) ?? "",
    category: (row.category as string) ?? "",
    placement: (row.placement as string) ?? "",
    grade: (row.grade as string) ?? "",
    selectivityContext: (row.selectivity_context as string) ?? "",
    description: (row.description as string) ?? "",
    evidenceUrl: (row.evidence_url as string | null) ?? null,
    studentExplanation: (row.student_explanation as string) ?? "",
  };
}

/**
 * The student's awards (Recognition Map records), in display order. These are the
 * SAME awards captured during onboarding (the `awards` table) — the Awards section
 * auto-populates from the student's profile, exactly like Activities/Coursework;
 * the student never re-enters them.
 *
 * Robust to the recognition columns not being migrated yet: PostgREST does NOT
 * throw on a missing-column error (it returns `{ data: null, error }`), so a plain
 * try/catch would silently swallow the awards and show an empty list. We therefore
 * check `error` explicitly and fall back to the always-present base columns, so
 * onboarding awards ALWAYS surface regardless of migration state.
 */
export async function loadAwards(
  client: SupabaseClient,
  userId: string,
): Promise<AwardRecord[]> {
  const rich = await client
    .from("awards")
    .select(AWARD_COLS)
    .eq("user_id", userId)
    .order("sort_order");
  if (!rich.error) return (rich.data ?? []).map(awardFromRow);

  // Recognition columns not present in this environment — fall back to the base
  // columns that exist in every environment so awards still load.
  const base = await client
    .from("awards")
    .select("id, name, level, grade, sort_order")
    .eq("user_id", userId)
    .order("sort_order");
  return (base.data ?? []).map(awardFromRow);
}

const CATEGORY_VALUES = new Set<OpportunityCategory>([
  "competition",
  "hackathon",
  "olympiad",
  "research",
  "conference",
  "fellowship",
  "entrepreneurship",
  "pitch",
  "academic_challenge",
  "publication",
  "selective_program",
  "service",
  "scholarship",
  "other",
]);
const EFFORT_VALUES = new Set<OpportunityEffort>([
  "quick",
  "moderate",
  "substantial",
  "intensive",
]);

function opportunityFromRow(row: Record<string, unknown>): Opportunity {
  const category = row.category as OpportunityCategory;
  const effort = row.effort as OpportunityEffort;
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    organization: (row.organization as string) ?? "",
    category: CATEGORY_VALUES.has(category) ? category : "other",
    description: (row.description as string) ?? "",
    eligibleGrades: (row.eligible_grades as string[] | null) ?? [],
    eligibilityNotes: (row.eligibility_notes as string) ?? "",
    costNote: (row.cost_note as string) ?? "",
    fieldKeys: (row.field_keys as string[] | null) ?? [],
    evidenceDimensions: coerceThemes(
      row.evidence_dimensions as string[] | null,
    ),
    effort: EFFORT_VALUES.has(effort) ? effort : "moderate",
    estPrepTime: (row.est_prep_time as string) ?? "",
    estPrepDaysMin: (row.est_prep_days_min as number | null) ?? null,
    deadlineMonth: (row.deadline_month as number | null) ?? null,
    deadlineDay: (row.deadline_day as number | null) ?? null,
    deadlineNote: (row.deadline_note as string) ?? "",
    isRolling: (row.is_rolling as boolean) ?? false,
    applicationUrl: (row.application_url as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
  };
}

/**
 * The VERIFIED, active opportunity catalog. Only rows with verified_at set are
 * returned (the project-wide invariant for reference data), so the finder never
 * shows unverified/fabricated opportunities. Returns [] if the table isn't present.
 */
export async function loadOpportunities(
  client: SupabaseClient,
): Promise<Opportunity[]> {
  try {
    const { data } = await client
      .from("opportunities")
      .select(
        "id, name, organization, category, description, eligible_grades, eligibility_notes, cost_note, field_keys, evidence_dimensions, effort, est_prep_time, est_prep_days_min, deadline_month, deadline_day, deadline_note, is_rolling, application_url, source_url",
      )
      .eq("status", "active")
      .not("verified_at", "is", null);
    return (data ?? []).map(opportunityFromRow);
  } catch {
    return [];
  }
}
