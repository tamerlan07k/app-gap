// V1 seed list (~50 colleges).
//
// Chosen to prove the whole pipeline end-to-end AND to exercise every edge case
// the schema must handle, across the full selectivity range (so chancing can
// produce reach / target / likely, not only reach).
//
// Seeded by NAME + STATE — the ingester resolves each to an IPEDS unitid via the
// College Scorecard API and logs the match for human verification. We do NOT
// hard-code unitids from memory (that would risk ingesting the wrong school).
//
// `notes` flags the edge case a given college is here to exercise.

export const SEED_COLLEGES = [
  // ── Ivies (complex EA/REA/ED rounds; Cornell = multiple undergraduate schools)
  { name: "Harvard University", state: "MA", notes: "REA" },
  { name: "Yale University", state: "CT", notes: "REA" },
  { name: "Princeton University", state: "NJ", notes: "REA" },
  {
    name: "Columbia University in the City of New York",
    state: "NY",
    notes: "ED",
  },
  {
    name: "University of Pennsylvania",
    state: "PA",
    notes: "ED; aliases UPenn/Penn",
  },
  { name: "Brown University", state: "RI", notes: "ED" },
  { name: "Dartmouth College", state: "NH", notes: "ED" },
  {
    name: "Cornell University",
    state: "NY",
    notes: "multiple undergraduate schools",
  },

  // ── Other highly selective national universities
  {
    name: "Massachusetts Institute of Technology",
    state: "MA",
    notes: "EA (non-restrictive)",
  },
  { name: "Stanford University", state: "CA", notes: "REA" },
  { name: "California Institute of Technology", state: "CA" },
  { name: "Duke University", state: "NC", notes: "ED" },
  { name: "Northwestern University", state: "IL", notes: "ED" },
  { name: "Johns Hopkins University", state: "MD", notes: "ED I + ED II" },
  { name: "University of Chicago", state: "IL", notes: "ED I + ED II + EA" },
  { name: "Vanderbilt University", state: "TN", notes: "ED I + ED II" },
  { name: "Rice University", state: "TX", notes: "ED" },
  { name: "University of Notre Dame", state: "IN", notes: "REA" },
  {
    name: "Washington University in St Louis",
    state: "MO",
    notes: "ED I + ED II",
  },
  { name: "Emory University", state: "GA", notes: "ED I + ED II" },
  {
    name: "Georgetown University",
    state: "DC",
    notes: "EA (restrictive-ish, non-binding)",
  },
  { name: "Carnegie Mellon University", state: "PA", notes: "ED" },
  { name: "University of Southern California", state: "CA" },
  {
    name: "New York University",
    state: "NY",
    notes: "ED I + ED II; multi-campus",
  },
  { name: "Tufts University", state: "MA", notes: "ED I + ED II" },

  // ── Public flagships (systems, by-major admission, test-blind, rolling)
  {
    name: "University of California-Berkeley",
    state: "CA",
    notes: "test-blind; UC system",
  },
  {
    name: "University of California-Los Angeles",
    state: "CA",
    notes: "test-blind; UC system",
  },
  {
    name: "University of Michigan-Ann Arbor",
    state: "MI",
    notes: "EA; by-college admission (CoE)",
  },
  { name: "University of Virginia-Main Campus", state: "VA", notes: "EA + ED" },
  {
    name: "University of North Carolina at Chapel Hill",
    state: "NC",
    notes: "EA",
  },
  {
    name: "Georgia Institute of Technology-Main Campus",
    state: "GA",
    notes: "EA",
  },
  {
    name: "The University of Texas at Austin",
    state: "TX",
    notes: "by-major admission",
  },
  {
    name: "University of Illinois Urbana-Champaign",
    state: "IL",
    notes: "by-major admission",
  },
  { name: "University of Wisconsin-Madison", state: "WI" },
  { name: "University of Florida", state: "FL" },
  {
    name: "Ohio State University-Main Campus",
    state: "OH",
    notes: "multi-campus system",
  },
  { name: "University of Washington-Seattle Campus", state: "WA" },
  {
    name: "Pennsylvania State University-Main Campus",
    state: "PA",
    notes: "multi-campus system; rolling-ish",
  },
  {
    name: "Michigan State University",
    state: "MI",
    notes: "rolling admission",
  },
  {
    name: "University of Pittsburgh-Pittsburgh Campus",
    state: "PA",
    notes: "rolling admission",
  },

  // ── Top liberal-arts colleges
  { name: "Williams College", state: "MA", notes: "LAC; ED" },
  { name: "Amherst College", state: "MA", notes: "LAC; ED" },
  { name: "Swarthmore College", state: "PA", notes: "LAC; ED I + ED II" },
  { name: "Pomona College", state: "CA", notes: "LAC; ED I + ED II" },
  { name: "Wellesley College", state: "MA", notes: "LAC; ED I + ED II" },
  {
    name: "Bowdoin College",
    state: "ME",
    notes: "LAC; test-optional; ED I + ED II",
  },
  { name: "Middlebury College", state: "VT", notes: "LAC; ED I + ED II" },

  // ── Mid / less selective (so chancing can produce target & likely)
  { name: "Northeastern University", state: "MA" },
  { name: "Boston University", state: "MA", notes: "ED I + ED II" },
  { name: "Fordham University", state: "NY", notes: "EA + ED" },
  {
    name: "Arizona State University Campus Immersion",
    state: "AZ",
    notes: "rolling; large; less selective",
  },
  { name: "University of Massachusetts-Amherst", state: "MA", notes: "EA" },
  { name: "Temple University", state: "PA", notes: "rolling; less selective" },
];
