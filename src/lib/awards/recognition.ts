// The deterministic Recognition Map engine. Given ONLY a student's awards and
// their intended field, it computes — entirely in code, no AI — what their
// recognition COLLECTIVELY demonstrates, where the recognition gaps are (themes
// the intended field values but the awards don't yet show), and which awards
// mostly reinforce existing recognition. This is deliberately scoped to AWARDS:
// it never reads or analyzes the student's activities — that is the Activities
// section's job. The profile is rendered directly AND handed to the AI as ground
// truth, so the model interprets rather than re-deriving coverage.

import {
  RECOGNITION_THEMES,
  type RecognitionTheme,
  themesForAwardText,
} from "./themes";
import type { AwardRecord, RecognitionProfile, ThemeCoverage } from "./types";

// Scope ranking for award "level" (reuses AWARD_LEVEL_LABELS keys). Higher = more
// selective/broader recognition.
const SCOPE_RANK: Record<string, number> = {
  international: 3,
  "state-national": 2,
  regional: 1,
  school: 0,
};

function scopeRank(level: string): number {
  return SCOPE_RANK[level] ?? 0;
}

// Themes each intended field (profiles.major_category) typically values. Used only
// to surface field-relevant themes the awards don't cover — never to penalize.
const FIELD_VALUED_THEMES: Record<string, RecognitionTheme[]> = {
  cs: ["cs-ai", "quantitative", "research"],
  engineering: ["quantitative", "research", "cs-ai", "entrepreneurship"],
  "bio-premed": ["research", "academic", "service"],
  business: ["entrepreneurship", "leadership", "quantitative"],
  "math-physics": ["quantitative", "research", "academic"],
  polisci: ["leadership", "service", "academic"],
  psych: ["research", "service", "academic"],
  humanities: ["creativity", "academic", "research"],
  design: ["creativity", "entrepreneurship"],
  education: ["service", "leadership", "academic"],
  law: ["leadership", "academic", "service"],
  undecided: [],
  other: [],
};

const themeText = (a: AwardRecord): string =>
  [a.name, a.category, a.description, a.studentExplanation].join(" ");

/** The themes a single award demonstrates (deterministic). */
export function themesForAward(a: AwardRecord): RecognitionTheme[] {
  return themesForAwardText(themeText(a));
}

function strengthFor(
  awardCount: number,
  maxScope: number,
): ThemeCoverage["strength"] {
  if (awardCount === 0) return "none";
  if (awardCount >= 2 || maxScope >= 2) return "strong";
  if (maxScope >= 1) return "present";
  return "emerging";
}

const STRENGTH_ORDER: Record<ThemeCoverage["strength"], number> = {
  strong: 0,
  present: 1,
  emerging: 2,
  none: 3,
};

export function buildRecognitionProfile(input: {
  awards: AwardRecord[];
  fieldKey: string | null;
}): RecognitionProfile {
  const { awards, fieldKey } = input;

  // Accumulate per-theme AWARD evidence (this engine never touches activities).
  const awardIdsByTheme = new Map<RecognitionTheme, string[]>();
  const maxScopeByTheme = new Map<RecognitionTheme, number>();
  const themesByAward = new Map<string, RecognitionTheme[]>();

  for (const award of awards) {
    const themes = themesForAward(award);
    themesByAward.set(award.id, themes);
    for (const t of themes) {
      const ids = awardIdsByTheme.get(t) ?? [];
      ids.push(award.id);
      awardIdsByTheme.set(t, ids);
      maxScopeByTheme.set(
        t,
        Math.max(maxScopeByTheme.get(t) ?? 0, scopeRank(award.level)),
      );
    }
  }

  // Demonstrated coverage — any theme with at least one AWARD (external
  // recognition). Sorted strongest first.
  const demonstrated: ThemeCoverage[] = [];
  for (const theme of RECOGNITION_THEMES) {
    const awardIds = awardIdsByTheme.get(theme) ?? [];
    if (awardIds.length === 0) continue;
    demonstrated.push({
      theme,
      awardIds,
      strength: strengthFor(awardIds.length, maxScopeByTheme.get(theme) ?? 0),
    });
  }
  demonstrated.sort(
    (a, b) =>
      STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] ||
      b.awardIds.length - a.awardIds.length,
  );

  const fieldThemes = fieldKey ? (FIELD_VALUED_THEMES[fieldKey] ?? []) : [];

  // Recognition gaps — themes the intended FIELD values that the student's AWARDS
  // don't cover yet. Framed as opportunities, never as deficiencies. (Scoped to
  // awards + direction; activities are intentionally out of scope here.)
  const gaps: RecognitionProfile["gaps"] = [];
  for (const theme of fieldThemes) {
    const hasAward = (awardIdsByTheme.get(theme) ?? []).length > 0;
    if (!hasAward) gaps.push({ theme, isIntendedField: true });
  }

  // Redundant awards — every theme of the award is shared by at least one OTHER
  // award (so it mostly reinforces existing recognition rather than adding a
  // dimension). An award with no recognizable theme is never "redundant".
  const redundantAwardIds: string[] = [];
  for (const award of awards) {
    const themes = themesByAward.get(award.id) ?? [];
    if (themes.length === 0) continue;
    const allShared = themes.every(
      (t) =>
        (awardIdsByTheme.get(t) ?? []).filter((id) => id !== award.id).length >
        0,
    );
    if (allShared) redundantAwardIds.push(award.id);
  }

  // Field-relevant themes with no AWARD recognition (same set the gaps describe;
  // exposed separately for the Opportunity Finder's ranking).
  const uncoveredFieldThemes: RecognitionTheme[] = gaps.map((g) => g.theme);

  return {
    totalAwards: awards.length,
    demonstrated,
    gaps,
    redundantAwardIds,
    fieldKey,
    uncoveredFieldThemes,
  };
}

/** The set of themes for which the student already has recognition (awards). */
export function recognizedThemes(
  profile: RecognitionProfile,
): Set<RecognitionTheme> {
  return new Set(profile.demonstrated.map((d) => d.theme));
}

/** Themes the student demonstrates STRONGLY (used to detect reinforcement). */
export function strongThemes(
  profile: RecognitionProfile,
): Set<RecognitionTheme> {
  return new Set(
    profile.demonstrated
      .filter((d) => d.strength === "strong")
      .map((d) => d.theme),
  );
}
