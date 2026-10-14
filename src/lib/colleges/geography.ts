// US geography helpers for the My Colleges location filters — PURE, no DB.
//
// Colleges already carry a 2-letter `state` code, so region/bordering filters are
// derived deterministically from fixed maps here (no new college data). The
// student's own state is auto-detected from their free-text location (see
// detectState) and stored on profiles.location_state.

/** The named region groups offered in the My Colleges generator filter. */
export type Region =
  | "northeast"
  | "midwest"
  | "southeast"
  | "southwest"
  | "west";

/** What the student picked in the generator's location filter. */
export type CollegeLocationFilter =
  | { kind: "none" } // standard — no geographic restriction
  | { kind: "state" } // only colleges in the student's own state
  | { kind: "bordering" } // the student's state + states bordering it
  | { kind: "region"; region: Region };

// ─── Canonical state set ──────────────────────────────────────────────────────
// 50 states + DC. Keys are uppercase 2-letter USPS codes.

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export function stateName(code: string): string | null {
  return STATE_NAMES[code.toUpperCase()] ?? null;
}

export function isStateCode(value: string | null | undefined): boolean {
  return value != null && value.toUpperCase() in STATE_NAMES;
}

// ─── Region membership ────────────────────────────────────────────────────────
// A friendly 5-region grouping (Census-inspired). Every state + DC belongs to
// exactly one region, so a region filter partitions the whole dataset cleanly.

const REGION_STATES: Record<Region, string[]> = {
  northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  midwest: [
    "IL",
    "IN",
    "MI",
    "OH",
    "WI",
    "IA",
    "KS",
    "MN",
    "MO",
    "NE",
    "ND",
    "SD",
  ],
  southeast: [
    "DE",
    "DC",
    "FL",
    "GA",
    "MD",
    "NC",
    "SC",
    "VA",
    "WV",
    "AL",
    "KY",
    "MS",
    "TN",
  ],
  southwest: ["AR", "LA", "OK", "TX"],
  west: [
    "AZ",
    "CO",
    "ID",
    "MT",
    "NV",
    "NM",
    "UT",
    "WY",
    "AK",
    "CA",
    "HI",
    "OR",
    "WA",
  ],
};

export const REGION_LABELS: Record<Region, string> = {
  northeast: "Northeast",
  midwest: "Midwest",
  southeast: "Southeast",
  southwest: "Southwest",
  west: "West",
};

export const ALL_REGIONS: Region[] = [
  "northeast",
  "midwest",
  "southeast",
  "southwest",
  "west",
];

function regionStateSet(region: Region): Set<string> {
  return new Set(REGION_STATES[region]);
}

// ─── Bordering states ─────────────────────────────────────────────────────────
// Land-border adjacency (DC treated as bordering MD + VA). Used by the
// "my state + bordering states" filter. Non-contiguous states (AK, HI) have no
// land neighbors, so that filter degenerates to the state itself for them.

const BORDERING: Record<string, string[]> = {
  AL: ["FL", "GA", "MS", "TN"],
  AK: [],
  AZ: ["CA", "CO", "NV", "NM", "UT"],
  AR: ["LA", "MS", "MO", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR"],
  CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
  CT: ["MA", "NY", "RI"],
  DE: ["MD", "NJ", "PA"],
  DC: ["MD", "VA"],
  FL: ["AL", "GA"],
  GA: ["AL", "FL", "NC", "SC", "TN"],
  HI: [],
  ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IN", "IA", "KY", "MO", "WI"],
  IN: ["IL", "KY", "MI", "OH"],
  IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"],
  KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
  LA: ["AR", "MS", "TX"],
  ME: ["NH"],
  MD: ["DC", "DE", "PA", "VA", "WV"],
  MA: ["CT", "NH", "NY", "RI", "VT"],
  MI: ["IN", "OH", "WI"],
  MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"],
  MO: ["AR", "IL", "IA", "KS", "KY", "NE", "OK", "TN"],
  MT: ["ID", "ND", "SD", "WY"],
  NE: ["CO", "IA", "KS", "MO", "SD", "WY"],
  NV: ["AZ", "CA", "ID", "OR", "UT"],
  NH: ["MA", "ME", "VT"],
  NJ: ["DE", "NY", "PA"],
  NM: ["AZ", "CO", "OK", "TX", "UT"],
  NY: ["CT", "MA", "NJ", "PA", "VT"],
  NC: ["GA", "SC", "TN", "VA"],
  ND: ["MN", "MT", "SD"],
  OH: ["IN", "KY", "MI", "PA", "WV"],
  OK: ["AR", "CO", "KS", "MO", "NM", "TX"],
  OR: ["CA", "ID", "NV", "WA"],
  PA: ["DE", "MD", "NJ", "NY", "OH", "WV"],
  RI: ["CT", "MA"],
  SC: ["GA", "NC"],
  SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MS", "MO", "NC", "VA"],
  TX: ["AR", "LA", "NM", "OK"],
  UT: ["AZ", "CO", "ID", "NV", "NM", "WY"],
  VT: ["MA", "NH", "NY"],
  VA: ["DC", "KY", "MD", "NC", "TN", "WV"],
  WA: ["ID", "OR"],
  WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"],
  WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

/** The student's state plus every state sharing a land border with it. */
export function statesWithBordering(code: string): Set<string> {
  const c = code.toUpperCase();
  const set = new Set<string>([c]);
  for (const n of BORDERING[c] ?? []) set.add(n);
  return set;
}

// ─── Free-text → state detection ────────────────────────────────────────────
// Best-effort: scan the typed location for a full state name (longest match
// first, so "West Virginia" isn't caught as "Virginia") or a standalone 2-letter
// code. Returns the USPS code, or null when nothing confident is found.

const STATE_NAME_ENTRIES = Object.entries(STATE_NAMES).sort(
  (a, b) => b[1].length - a[1].length,
);

export function detectState(
  location: string | null | undefined,
): string | null {
  if (!location) return null;
  const text = location.toLowerCase();

  // 1) Full state name (longest-first to disambiguate overlaps).
  for (const [code, name] of STATE_NAME_ENTRIES) {
    const re = new RegExp(`\\b${name.toLowerCase()}\\b`);
    if (re.test(text)) return code;
  }

  // 2) Standalone 2-letter USPS code — matched CASE-SENSITIVELY (uppercase) so
  // common lowercase English words that collide with codes ("in", "or", "me",
  // "hi", "ok", "pa", "la", "co") don't trigger a false state. Locations are
  // conventionally written "City, ST" with the state uppercase, so this still
  // catches the normal case without the false positives.
  for (const code of Object.keys(STATE_NAMES)) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(location)) return code;
  }

  return null;
}

// ─── Filter application ───────────────────────────────────────────────────────

/**
 * Resolve a location filter to the set of allowed state codes, or null when the
 * filter imposes no geographic restriction (standard) or cannot be applied
 * (state-based filter with no known student state). A null result means "do not
 * filter" — callers keep the whole pool.
 */
export function allowedStatesFor(
  filter: CollegeLocationFilter,
  studentState: string | null,
): Set<string> | null {
  switch (filter.kind) {
    case "none":
      return null;
    case "state":
      return studentState && isStateCode(studentState)
        ? new Set([studentState.toUpperCase()])
        : null;
    case "bordering":
      return studentState && isStateCode(studentState)
        ? statesWithBordering(studentState)
        : null;
    case "region":
      return regionStateSet(filter.region);
  }
}
