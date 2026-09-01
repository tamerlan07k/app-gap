// Pure, framework-free logic for the per-college program/degree selector.
//
// Kept out of the React component so it is unit-testable and shared by both
// hierarchy modes:
//   • School-layer colleges (Cornell, Penn, …): University → School → Program →
//     Degree — school-scoped program lists.
//   • Single-admission colleges (the 531 Tier-A ones): University → Program →
//     Degree — a flat, searchable program list with no school layer.
//
// NONE of this feeds chancing/scoring — it only drives which verified
// college_programs row the student targets (user_colleges.program_id).

export interface SelectorSchool {
  id: string;
  name: string;
  admitsSeparately: boolean;
}

export interface SelectorProgram {
  id: string;
  name: string;
  schoolId: string | null;
  /** Verified degree this program grants (e.g. "B.S."), or null if unknown. */
  degree: string | null;
}

/**
 * A college uses the School → Program layer when it has separately-admitting
 * schools, or simply more than one school. This is the ORIGINAL gate — unchanged
 * — so the 50 curated school-layer universities behave exactly as before.
 */
export function hasSchoolLayer(schools: SelectorSchool[]): boolean {
  return schools.some((s) => s.admitsSeparately) || schools.length > 1;
}

/**
 * The selector is shown when the college has a school layer OR has any verified
 * program. Single-admission colleges (no schools) with ingested programs now
 * qualify — that is the Batch-2 change that surfaces the 581-college data.
 */
export function isSelectorRelevant(
  schools: SelectorSchool[],
  programs: SelectorProgram[],
): boolean {
  return hasSchoolLayer(schools) || programs.length > 0;
}

/**
 * Programs visible for a chosen school: those scoped to it, plus any
 * college-wide (schoolId == null) programs. With no school chosen, all show.
 * (Used only in school-layer mode.)
 */
export function visibleProgramsForSchool(
  programs: SelectorProgram[],
  schoolId: string,
): SelectorProgram[] {
  if (!schoolId) return programs;
  return programs.filter((p) => p.schoolId === schoolId || p.schoolId == null);
}

export interface FilteredPrograms {
  items: SelectorProgram[];
  /** Total matches before the display cap (so the UI can say "+N more"). */
  total: number;
  truncated: boolean;
}

/**
 * Typeahead filter for the single-admission picker. Case-insensitive substring
 * match on the program name; whitespace-insensitive. An empty query returns the
 * head of the list. Results are capped so a 100+-program college never renders a
 * giant DOM list — the cap is a display concern only (`total` is exact).
 */
export function filterProgramsByQuery(
  programs: SelectorProgram[],
  query: string,
  limit = 50,
): FilteredPrograms {
  const q = query.trim().toLowerCase();
  const matches = q
    ? programs.filter((p) => p.name.toLowerCase().includes(q))
    : programs;
  return {
    items: matches.slice(0, limit),
    total: matches.length,
    truncated: matches.length > limit,
  };
}

/**
 * Student-facing degree label for a program: the verified degree, or the honest
 * "Not sure yet" when we don't know it (never a fabricated B.A./B.S.).
 */
export function programDegreeLabel(program: SelectorProgram | null): string {
  return program?.degree ?? "Not sure yet";
}

/**
 * Client-side guard mirroring the server validation in `setCollegeTarget`: a
 * programId is a valid selection only if it belongs to this college's loaded
 * programs and — when a school is also chosen — to that school (or is
 * college-wide). Prevents a stale/foreign program id from being persisted.
 * Empty programId ("Not sure yet") is always valid.
 */
export function isValidProgramSelection(
  programs: SelectorProgram[],
  programId: string,
  schoolId: string,
): boolean {
  if (!programId) return true;
  const program = programs.find((p) => p.id === programId);
  if (!program) return false;
  if (schoolId && program.schoolId && program.schoolId !== schoolId) {
    return false;
  }
  return true;
}
