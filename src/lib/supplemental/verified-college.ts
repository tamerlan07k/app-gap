// Assembles the VERIFIED, citable college information handed to the evaluation
// and chat engines. This is the allowlist that keeps GapCoach honest: it may name
// ONLY resources that appear here, and must say it "can't verify" anything else.
//
// The hard reality of the current dataset (see docs/college-data-architecture):
// the only per-college content that is populated and trustworthy is (a) the
// majors/programs the college offers (federal CIP data — real, machine-sourced),
// (b) verified field-strength headlines for the student's field, and (c) verified
// editorial profile prose (opportunities / campus life / history). There is no
// verified course-catalog, professor, lab, or club data yet, so the coach never
// gets those and will decline to name them. Server-side (Supabase reads).

import type { SupabaseClient } from "@supabase/supabase-js";
import { fieldDataFor, loadFieldDataIndex } from "~/lib/colleges/db";
import { FIELD_LABELS } from "~/lib/colleges/field-fit";

// Cap program lists so the context stays bounded.
const MAX_PROGRAMS = 60;
const MAX_HISTORY_CHARS = 600;

export type VerifiedCollege = {
  collegeId: string;
  collegeName: string;
  /** Formatted block for the LLM, or null when nothing verified is available. */
  block: string | null;
};

interface ProgramRow {
  name: string;
  degree: string | null;
}

/**
 * Build the verified-college block for one college and the student's field.
 * fieldKey is the student's `profiles.major_category` (for field strengths); it
 * may be null. Fail-soft: any missing table degrades to "no data" rather than
 * throwing, so the workspace still works before content is ingested.
 */
export async function loadVerifiedCollege(
  client: SupabaseClient,
  collegeId: string,
  fieldKey: string | null,
): Promise<VerifiedCollege> {
  // College identity.
  const { data: college } = await client
    .from("colleges")
    .select("id, canonical_name")
    .eq("id", collegeId)
    .maybeSingle();
  const collegeName = (college?.canonical_name as string) ?? "";

  const sections: string[] = [];

  // (a) Majors / programs offered — federal CIP data, safe to name.
  try {
    const { data: programs } = await client
      .from("college_programs")
      .select("name, degree")
      .eq("college_id", collegeId)
      .eq("offered", true)
      .order("name")
      .limit(MAX_PROGRAMS);
    const rows = (programs ?? []) as ProgramRow[];
    if (rows.length) {
      const list = rows
        .map((p) => (p.degree ? `${p.name} (${p.degree})` : p.name))
        .join(", ");
      sections.push(
        `Majors/programs offered (verified from federal data — you may reference these by name):\n${list}`,
      );
    }
  } catch {
    // No programs table / rows — skip.
  }

  // (b) Verified field strength for the student's field.
  if (fieldKey) {
    try {
      const index = await loadFieldDataIndex(client, fieldKey);
      const fd = fieldDataFor(index, collegeId, fieldKey);
      const label = FIELD_LABELS[fieldKey] ?? fieldKey;
      if (fd.strength?.verified && fd.strength.headline) {
        sections.push(
          `Field strength in ${label} (verified): ${fd.strength.headline} (rated: ${fd.strength.strength})`,
        );
      }
      const verifiedResources = fd.resources.filter((r) => r.verified);
      if (verifiedResources.length) {
        const list = verifiedResources
          .map(
            (r) => `- ${r.title}${r.description ? `: ${r.description}` : ""}`,
          )
          .join("\n");
        sections.push(`Verified ${label} resources:\n${list}`);
      }
    } catch {
      // Field data layer not present — skip.
    }
  }

  // (c) Verified editorial profile (opportunities / campus life / history).
  try {
    const { data: profile } = await client
      .from("college_profiles")
      .select("history, history_verified_at, fit, fit_verified_at")
      .eq("college_id", collegeId)
      .maybeSingle();
    if (profile) {
      const fit = profile.fit as {
        opportunities?: string | null;
        campusLife?: string | null;
        careerFit?: string | null;
      } | null;
      if (profile.fit_verified_at && fit) {
        const bits: string[] = [];
        if (fit.opportunities) bits.push(`Opportunities: ${fit.opportunities}`);
        if (fit.campusLife) bits.push(`Campus life: ${fit.campusLife}`);
        if (fit.careerFit) bits.push(`Career fit: ${fit.careerFit}`);
        if (bits.length) {
          sections.push(
            `Campus & opportunities (verified):\n${bits.join("\n")}`,
          );
        }
      }
      if (profile.history_verified_at && profile.history) {
        const history = (profile.history as string).slice(0, MAX_HISTORY_CHARS);
        sections.push(`About the college (verified):\n${history}`);
      }
    }
  } catch {
    // Profile table not present — skip.
  }

  const block = sections.length ? sections.join("\n\n") : null;
  return { collegeId, collegeName, block };
}
