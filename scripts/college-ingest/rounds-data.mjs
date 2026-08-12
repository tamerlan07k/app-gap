// Current application-cycle rounds — intake dataset.
//
// IMPORTANT — read before editing:
//  * This file seeds the ROUND STRUCTURE only (which round types a college
//    offers). The structure here reflects the researched, official-source
//    `verified_structure` (see rounds-candidates.json), but every entry is
//    still `verified: false` until a human confirms it against the source.
//  * DEADLINE + DECISION DATES are NOT stored here. The loader reads them from
//    rounds-candidates.json (WebFetch-derived, official-source, all pending) and
//    writes them with `verified_at = null`. Nothing here is treated as fact by
//    the matching engine until a human sets `verified: true`.
//  * binding / restrictive / rolling are NOT stored per-college here — they are
//    DEFINITIONAL properties of the round type (see ROUND_DEFS) and derived by
//    the loader, so the round name and its binding status never drift apart.
//  * The matching engine must consume only rows where `verified_at` is set, so
//    this unverified structure can populate the DB without being trusted yet.
//
// A round entry is either a bare round-type string (e.g. "RD") or an object
// { type, name } when a college offers the same round_type more than once and
// the two need distinct identities (e.g. Georgia Tech's residency-split EA).
//
// To verify a college: open its official admissions page, confirm the offered
// rounds + the candidate dates in rounds-candidates.json, set this entry's
// `verified: true`, and re-run the loader.

export const CYCLE_YEAR = "2026-2027"; // current cycle — fall-2027 entry (opens Aug 2026)

// Definitional properties of each round type. These are what the round type
// MEANS (ED is always binding; REA/SCEA is restrictive but non-binding; etc.) —
// not per-college judgment calls.
export const ROUND_DEFS = {
  EA: {
    name: "Early Action",
    is_binding: false,
    is_restrictive: false,
    is_rolling: false,
  },
  REA: {
    name: "Restrictive Early Action",
    is_binding: false,
    is_restrictive: true,
    is_rolling: false,
  },
  ED: {
    name: "Early Decision",
    is_binding: true,
    is_restrictive: false,
    is_rolling: false,
  },
  ED_II: {
    name: "Early Decision II",
    is_binding: true,
    is_restrictive: false,
    is_rolling: false,
  },
  RD: {
    name: "Regular Decision",
    is_binding: false,
    is_restrictive: false,
    is_rolling: false,
  },
  ROLLING: {
    name: "Rolling Admission",
    is_binding: false,
    is_restrictive: false,
    is_rolling: true,
  },
  PRIORITY: {
    name: "Priority Deadline",
    is_binding: false,
    is_restrictive: false,
    is_rolling: false,
  },
};

// `name` must exactly match colleges.canonical_name (Scorecard canonical name).
// Structure reflects rounds-candidates.json `verified_structure` (unverified).
export const COLLEGE_ROUNDS = [
  { name: "Harvard University", verified: false, rounds: ["REA", "RD"] },
  { name: "Yale University", verified: false, rounds: ["REA", "RD"] },
  { name: "Princeton University", verified: false, rounds: ["REA", "RD"] },
  {
    name: "Columbia University in the City of New York",
    verified: false,
    rounds: ["ED", "RD"],
  },
  { name: "University of Pennsylvania", verified: false, rounds: ["ED", "RD"] },
  { name: "Brown University", verified: false, rounds: ["ED", "RD"] },
  { name: "Dartmouth College", verified: false, rounds: ["ED", "RD"] },
  { name: "Cornell University", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Massachusetts Institute of Technology",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Stanford University", verified: false, rounds: ["REA", "RD"] },
  {
    // STRUCTURE FIX: early round is Restrictive EA, not open EA.
    name: "California Institute of Technology",
    verified: false,
    rounds: ["REA", "RD"],
  },
  { name: "Duke University", verified: false, rounds: ["ED", "RD"] },
  { name: "Northwestern University", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Johns Hopkins University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "University of Chicago",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Vanderbilt University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    // STRUCTURE FIX: add ED_II (seed missing it).
    name: "Rice University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "University of Notre Dame", verified: false, rounds: ["REA", "RD"] },
  {
    // STRUCTURE FIX: new non-binding EA added this cycle (seed missing it).
    name: "Washington University in St Louis",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Emory University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Georgetown University", verified: false, rounds: ["EA", "RD"] },
  {
    // STRUCTURE FIX: CMU has no ED_II (seed wrongly included it).
    name: "Carnegie Mellon University",
    verified: false,
    rounds: ["ED", "RD"],
  },
  {
    // STRUCTURE FIX: new binding ED added for Fall 2027 (seed missing it).
    name: "University of Southern California",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "New York University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Tufts University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  // Public flagships. UC campuses use a single Nov filing window (modeled as RD).
  {
    name: "University of California-Berkeley",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of California-Los Angeles",
    verified: false,
    rounds: ["RD"],
  },
  {
    // STRUCTURE FIX: binding ED added (seed missing it).
    name: "University of Michigan-Ann Arbor",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "University of Virginia-Main Campus",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "University of North Carolina at Chapel Hill",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    // STRUCTURE FIX: EA is split by residency into two rounds (EA1 / EA2).
    name: "Georgia Institute of Technology-Main Campus",
    verified: false,
    rounds: [
      { type: "EA", name: "Early Action (Georgia residents)" },
      { type: "EA", name: "Early Action (Non-Georgia residents)" },
      "RD",
    ],
  },
  {
    // STRUCTURE FIX: add non-binding EA (seed had RD only).
    name: "The University of Texas at Austin",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Illinois Urbana-Champaign",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Wisconsin-Madison",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    // STRUCTURE FIX: new binding ED + EA added for Fall 2027 (seed had RD only).
    name: "University of Florida",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Ohio State University-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Washington-Seattle Campus",
    verified: false,
    rounds: ["RD"],
  },
  {
    // STRUCTURE FIX: non-binding EA + Dec priority, not rolling-only.
    name: "Pennsylvania State University-Main Campus",
    verified: false,
    rounds: ["EA", "PRIORITY", "ROLLING"],
  },
  {
    // STRUCTURE FIX: non-binding EA + Feb priority, not rolling-only.
    name: "Michigan State University",
    verified: false,
    rounds: ["EA", "PRIORITY", "ROLLING"],
  },
  {
    // STRUCTURE FIX: add scholarship-priority deadline alongside rolling.
    name: "University of Pittsburgh-Pittsburgh Campus",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  // Liberal-arts colleges
  { name: "Williams College", verified: false, rounds: ["ED", "RD"] },
  { name: "Amherst College", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Swarthmore College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Pomona College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Wellesley College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Bowdoin College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Middlebury College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  // Mid / less selective
  {
    name: "Northeastern University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Boston University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    // STRUCTURE FIX: add ED_II (seed missing it).
    name: "Fordham University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    // STRUCTURE FIX: add scholarship-priority deadline alongside rolling.
    name: "Arizona State University Campus Immersion",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "University of Massachusetts-Amherst",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    // STRUCTURE FIX: named EA + RD with rolling-style review, not rolling-only.
    name: "Temple University",
    verified: false,
    rounds: ["EA", "RD"],
  },
];
