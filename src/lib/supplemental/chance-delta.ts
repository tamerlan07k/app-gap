// Supplemental essays → college chance nudge (pure, client-safe, testable).
//
// This is the ONE place the essay→chancing rule lives. Historically the essay
// signal was deliberately kept out of the chancing math (see status.ts); this
// module is the intentional, bounded exception: a finalized essay the student
// wrote well nudges that college's AppGap estimate up a little, a weak one nudges
// it down. It is small, capped, and recomputed live from the student's own
// finalized+scored essays — never a stored number.
//
// Rules (product spec):
//   • Good essay (AppGap overall ≥ 75) → +weight ; weak essay (< 55) → −weight.
//     55–74 is neutral (no change).
//   • Base weight is 0.5 percentage points per essay.
//   • When the college has exactly ONE supplemental essay, a REQUIRED essay counts
//     double (±1pp) — that single essay carries the whole supplement.
//   • OPTIONAL essays only ever help (good → +weight); a weak optional essay is
//     never a penalty, since writing an optional essay is a bonus.
//   • The total per-college swing is capped at ±3pp so it stays a nudge.
// The value is in PERCENTAGE POINTS (e.g. 1 means +1%), applied to the 0–100
// display; the caller divides by 100 before touching the 0..1 chance.

/** AppGap overall (0–100) at/above which an essay counts as "good". */
export const ESSAY_GOOD_MIN = 75;
/** AppGap overall (0–100) below which an essay counts as "weak/bad". */
export const ESSAY_BAD_MAX = 55;
/** Base per-essay nudge, in percentage points. */
export const ESSAY_BASE_PP = 0.5;
/** A single required essay carries the whole supplement — double weight. */
export const ESSAY_SINGLE_PP = 1;
/** Maximum total per-college swing, in percentage points. */
export const ESSAY_DELTA_CAP_PP = 3;

export type EssayChanceInput = {
  /** status === "finalized". Only finalized essays move the number. */
  finalized: boolean;
  /** Catalog is_required (manual/self-added essays are treated as required). */
  required: boolean;
  /** AppGap overall 0–100, or null when the essay hasn't been scored yet. */
  overall: number | null;
};

/**
 * The chance delta (percentage points) contributed by ALL of a single college's
 * essays. `essays` is every essay the student has for that college (finalized or
 * not) — its length decides the single-essay double-weight; only finalized AND
 * scored essays actually contribute.
 */
export function collegeEssayChanceDelta(essays: EssayChanceInput[]): number {
  const single = essays.length === 1;
  let delta = 0;
  for (const e of essays) {
    if (!e.finalized || e.overall == null) continue;
    const weight = single && e.required ? ESSAY_SINGLE_PP : ESSAY_BASE_PP;
    if (e.overall >= ESSAY_GOOD_MIN) {
      delta += weight;
    } else if (e.overall < ESSAY_BAD_MAX && e.required) {
      // Weak essays only pull down when the essay is required; an optional essay
      // is never a penalty.
      delta -= weight;
    }
  }
  return Math.max(-ESSAY_DELTA_CAP_PP, Math.min(ESSAY_DELTA_CAP_PP, delta));
}
