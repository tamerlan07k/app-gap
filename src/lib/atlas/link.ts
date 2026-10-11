// Atlas of Opportunity deep-link builder.
//
// Atlas of Opportunity runs a PUBLIC opportunity Finder (no sign-in, no account).
// We send a student there with their profile pre-applied as query params so the
// Finder loads already filtered. We pass ONLY grade, state, and interests — never
// names, emails, essays, activity text, or any other profile data — plus a fixed
// `ref=appgap` so Atlas can count visits coming from AppGap.
//
// This module is PURE and framework-free (used on the server to resolve hrefs and
// unit-tested in isolation). It validates every value against Atlas's accepted
// lists and silently OMITS anything unknown or invalid rather than sending a bad
// value, so a missing/odd profile can never produce an invalid link.

const ATLAS_FINDER_URL = "https://www.atlasofopportunity.org/finder";

/** The exact interest names Atlas accepts, spelled exactly as Atlas expects. */
export const ATLAS_INTERESTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Math",
  "Computer Science",
  "Engineering",
  "Medicine",
  "Environmental Science",
  "Astronomy",
  "Neuroscience",
  "Data Science",
  "Robotics",
  "AI / Machine Learning",
  "Social Science",
  "Humanities",
  "Psychology",
  "Economics",
  "Political Science",
  "Public Policy",
  "Law",
  "History",
  "Philosophy",
  "Literature",
  "Linguistics",
  "International Relations",
  "Visual Arts",
  "Music",
  "Film & Media",
  "Creative Writing",
  "Architecture & Design",
  "Business",
  "Entrepreneurship",
  "Journalism",
  "Education",
  "Public Health",
  "Sustainability",
] as const;

export type AtlasInterest = (typeof ATLAS_INTERESTS)[number];

/** The 2-letter codes Atlas accepts, plus DC and INTL (programs outside the US). */
export const ATLAS_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "INTL",
] as const;

export type AtlasState = (typeof ATLAS_STATES)[number];

const INTEREST_SET: ReadonlySet<string> = new Set(ATLAS_INTERESTS);
const STATE_SET: ReadonlySet<string> = new Set(ATLAS_STATES);

export interface AtlasLinkParams {
  /** Integer 6–12. Anything outside that range (or non-integer) is omitted. */
  grade?: number | null;
  /** 2-letter state code or INTL. Case-insensitive; unknown values are omitted. */
  state?: string | null;
  /** Interest names; only exact matches from ATLAS_INTERESTS are kept. */
  interests?: readonly string[] | null;
}

/**
 * Build a public Atlas of Opportunity Finder URL pre-filtered to the student.
 *
 * Validates every value and omits anything unknown or invalid — the returned URL
 * is always well-formed and always carries `ref=appgap`. Query params are emitted
 * in a stable order (grade, state, interests, ref) so the output is deterministic.
 */
export function buildAtlasLink({
  grade,
  state,
  interests,
}: AtlasLinkParams = {}): string {
  const params = new URLSearchParams();

  if (
    typeof grade === "number" &&
    Number.isInteger(grade) &&
    grade >= 6 &&
    grade <= 12
  ) {
    params.set("grade", String(grade));
  }

  if (typeof state === "string") {
    const code = state.trim().toUpperCase();
    if (STATE_SET.has(code)) params.set("state", code);
  }

  if (interests && interests.length > 0) {
    // Keep only exact, known names; de-duplicate while preserving first-seen order.
    const seen = new Set<string>();
    const valid: string[] = [];
    for (const name of interests) {
      if (INTEREST_SET.has(name) && !seen.has(name)) {
        seen.add(name);
        valid.push(name);
      }
    }
    if (valid.length > 0) params.set("interests", JSON.stringify(valid));
  }

  // Always last: lets Atlas count visits that came from AppGap.
  params.set("ref", "appgap");

  return `${ATLAS_FINDER_URL}?${params.toString()}`;
}
