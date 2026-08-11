// Current application-cycle rounds — intake dataset.
//
// IMPORTANT — read before editing:
//  * This file seeds the ROUND STRUCTURE only (which round types a college
//    offers). Round structure changes year to year, so every entry is
//    `verified: false` until a human confirms it against the official source.
//  * DEADLINE + DECISION DATES are intentionally OMITTED. They must come from
//    the official admissions site and be human-verified — never invented. The
//    loader stores them as pending (null) until filled here with `verified:true`.
//  * binding / restrictive / rolling are NOT stored per-college here — they are
//    DEFINITIONAL properties of the round type (see ROUND_DEFS) and derived by
//    the loader, so the round name and its binding status never drift apart.
//  * The matching engine must consume only rows where `verified_at` is set, so
//    this unverified seed can populate the structure without being trusted yet.
//
// To verify a college: open its official admissions page, confirm the rounds,
// add `deadline_date` / `decision_release_date` (ISO yyyy-mm-dd) to each round,
// set the entry's `verified: true`, and re-run the loader.

export const CYCLE_YEAR = "2025-2026"; // fall-2026 entry

// Definitional properties of each round type. These are what the round type
// MEANS (ED is always binding; REA/SCEA is restrictive but non-binding; etc.) —
// not per-college judgial calls.
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

// Round entries may be a bare type string (dates pending) or an object with
// dates once verified, e.g. { type: "REA", deadline_date: "2025-11-01" }.
// `name` must exactly match colleges.canonical_name (Scorecard canonical name).
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
    name: "California Institute of Technology",
    verified: false,
    rounds: ["EA", "RD"],
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
  { name: "Rice University", verified: false, rounds: ["ED", "RD"] },
  { name: "University of Notre Dame", verified: false, rounds: ["REA", "RD"] },
  {
    name: "Washington University in St Louis",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Emory University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Georgetown University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Carnegie Mellon University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "University of Southern California",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "New York University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Tufts University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  // Public flagships — UC campuses use a single Nov application window (modeled
  // as RD); several others are rolling/priority. All UNVERIFIED.
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
    name: "University of Michigan-Ann Arbor",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Virginia-Main Campus",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "University of North Carolina at Chapel Hill",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Georgia Institute of Technology-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "The University of Texas at Austin",
    verified: false,
    rounds: ["RD"],
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
  { name: "University of Florida", verified: false, rounds: ["RD"] },
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
    name: "Pennsylvania State University-Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Michigan State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Pittsburgh-Pittsburgh Campus",
    verified: false,
    rounds: ["ROLLING"],
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
  { name: "Fordham University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Arizona State University Campus Immersion",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Massachusetts-Amherst",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Temple University", verified: false, rounds: ["ROLLING"] },
];
