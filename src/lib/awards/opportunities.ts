// The deterministic Opportunity Finder engine. It takes the verified opportunity
// catalog + the student's recognition profile + grade + intended field + the
// CURRENT DATE, and decides — entirely in code, no AI — which opportunities are
// worth surfacing right now, in what order, with what status and reasons.
//
// This is where the three Awards experiences connect: the SAME recognition
// profile that powers the Recognition Map decides whether an opportunity "adds a
// new dimension" (fills a gap the student lacks recognition for) or merely
// "reinforces" evidence they already have — so the finder never blindly pushes
// another award in a category the student has already saturated.
//
// Timing is date-aware via ~/lib/awards/deadlines: an opportunity whose next
// deadline is sooner than its realistic prep time is marked "not enough time"; a
// short task with a near deadline stays feasible. No AI is used for filtering,
// dates, eligibility, or status — only real data and the clock.

import { resolveTiming } from "./deadlines";
import { recognizedThemes, strongThemes } from "./recognition";
import { THEME_LABELS } from "./themes";
import type {
  Opportunity,
  OpportunityFit,
  OpportunityStatus,
  RecognitionProfile,
} from "./types";

function isGradeEligible(
  eligibleGrades: string[],
  gradeLevel: string | null,
): boolean {
  if (eligibleGrades.length === 0) return true; // no restriction
  if (!gradeLevel) return true; // unknown grade → don't filter out
  if (gradeLevel === "gap") return true; // graduated/gap — let them judge
  return eligibleGrades.includes(gradeLevel);
}

function labelList(themes: readonly string[]): string {
  const labels = themes.map(
    (t) => THEME_LABELS[t as keyof typeof THEME_LABELS] ?? t,
  );
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Rank + classify the opportunity catalog for one student. Ineligible-by-grade
 * opportunities are dropped (we don't recommend what they can't enter). The result
 * is sorted best-first by an internal score that rewards gap-filling + field match
 * + feasible/urgent timing, and penalizes pure duplicates and infeasible timing.
 */
export function rankOpportunities(input: {
  opportunities: Opportunity[];
  profile: RecognitionProfile;
  gradeLevel: string | null;
  fieldKey: string | null;
  now: Date;
}): OpportunityFit[] {
  const { opportunities, profile, gradeLevel, fieldKey, now } = input;

  const recognized = recognizedThemes(profile);
  const strong = strongThemes(profile);
  const gapThemes = new Set(profile.gaps.map((g) => g.theme));
  for (const t of profile.uncoveredFieldThemes) gapThemes.add(t);

  const fits: OpportunityFit[] = [];

  for (const opp of opportunities) {
    const eligible = isGradeEligible(opp.eligibleGrades, gradeLevel);
    if (!eligible) continue; // never surface an opportunity the student can't enter

    const timing = resolveTiming(opp, now);

    // Theme accounting against the recognition profile.
    const addsThemes = opp.evidenceDimensions.filter((t) => !recognized.has(t));
    const reinforcesThemes = opp.evidenceDimensions.filter((t) =>
      strong.has(t),
    );
    const highValueAdds = addsThemes.filter((t) => gapThemes.has(t));

    const matchesFieldSpecific = !!fieldKey && opp.fieldKeys.includes(fieldKey);
    const broadField = opp.fieldKeys.length === 0;
    const matchesField = matchesFieldSpecific || broadField;

    // ─── Status (deterministic) ───
    let status: OpportunityStatus;
    if (timing && !timing.feasible) {
      status = "not_enough_time";
    } else if (highValueAdds.length > 0) {
      status = "good_fit";
    } else if (addsThemes.length > 0) {
      status = matchesFieldSpecific ? "good_fit" : "worth_exploring";
    } else if (reinforcesThemes.length > 0) {
      status = "low_priority"; // mostly duplicates existing recognition
    } else {
      status = matchesFieldSpecific ? "worth_exploring" : "low_priority";
    }
    // Urgency promotes a genuinely worthwhile opportunity to time-sensitive so it
    // surfaces — but never manufactures urgency for a low-value one.
    if (
      timing?.urgent &&
      (status === "good_fit" || status === "worth_exploring")
    ) {
      status = "time_sensitive";
    }

    // ─── Reasons (the deterministic "why AppGap thinks it fits") ───
    const reasons: string[] = [];
    if (highValueAdds.length > 0) {
      reasons.push(
        `Could add recognition for ${labelList(highValueAdds)}, where your profile currently has little`,
      );
    } else if (addsThemes.length > 0) {
      reasons.push(`Adds a new dimension: ${labelList(addsThemes)}`);
    }
    if (matchesFieldSpecific) {
      reasons.push("Aligns with your intended field");
    }
    if (addsThemes.length === 0 && reinforcesThemes.length > 0) {
      reasons.push(
        `Mostly reinforces your existing ${labelList(reinforcesThemes)} recognition`,
      );
    }
    if (timing) {
      if (!timing.feasible) {
        reasons.push(
          "The next deadline is sooner than the preparation this realistically needs",
        );
      } else if (timing.urgent && timing.daysUntil != null) {
        reasons.push(
          `Deadline is coming up (about ${timing.daysUntil} days away)`,
        );
      }
    } else if (opp.isRolling) {
      reasons.push("Open on a rolling basis — you can start any time");
    }

    // ─── Score (ranking only; not shown) ───
    let score = 0;
    score += highValueAdds.length * 4;
    score += (addsThemes.length - highValueAdds.length) * 2;
    if (matchesFieldSpecific) score += 3;
    else if (broadField) score += 1;
    if (addsThemes.length === 0 && reinforcesThemes.length > 0) score -= 2;
    if (timing) {
      if (!timing.feasible) score -= 8;
      else if (timing.urgent) score += 2;
      else score += 1;
    } else if (opp.isRolling) {
      score += 1;
    }

    fits.push({
      opportunity: opp,
      status,
      eligible,
      addsThemes,
      reinforcesThemes,
      matchesField,
      timing,
      reasons,
      score,
    });
  }

  fits.sort((a, b) => b.score - a.score);
  return fits;
}
