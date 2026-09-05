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

  // ═══════════════════════════════════════════════════════════════════════════
  // V2 expansion (+128). ROUND STRUCTURE ONLY, all `verified: false`. These reflect
  // each school's well-known round offerings, but NO deadlines are attached here
  // and these schools are intentionally NOT in rounds-candidates.json — so the
  // loader writes each cycle + rounds with deadline_date = null and
  // verified_at = null (pending). The matching engine ignores them until a human
  // opens the official site, adds candidate dates, and sets `verified: true`.
  // `name` MUST exactly equal colleges.canonical_name (the Scorecard name).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── UCs: single Nov filing window (modeled as RD, like the V1 UCs) ─────────
  {
    name: "University of California-San Diego",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University of California-Davis", verified: false, rounds: ["RD"] },
  { name: "University of California-Irvine", verified: false, rounds: ["RD"] },
  {
    name: "University of California-Santa Barbara",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of California-Santa Cruz",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of California-Riverside",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University of California-Merced", verified: false, rounds: ["RD"] },

  // ── Selective privates ─────────────────────────────────────────────────────
  {
    name: "Boston College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "William & Mary", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Wake Forest University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "University of Rochester",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Case Western Reserve University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Tulane University of Louisiana",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Brandeis University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Lehigh University", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Villanova University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "University of Miami",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },

  // ── Public flagships (selective → moderate) ────────────────────────────────
  { name: "University of Georgia", verified: false, rounds: ["EA", "RD"] },
  {
    name: "University of Maryland-College Park",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Purdue University-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Minnesota-Twin Cities",
    verified: false,
    rounds: ["PRIORITY", "ROLLING"],
  },
  {
    name: "Rutgers University-New Brunswick",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "Indiana University-Bloomington",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "University of Connecticut", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Virginia Polytechnic Institute and State University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "North Carolina State University at Raleigh",
    verified: false,
    rounds: ["ED", "RD"],
  },
  {
    name: "Texas A&M University-College Station",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "University of Colorado Boulder",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "The University of Texas at Dallas",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "University of Iowa",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  { name: "Florida State University", verified: false, rounds: ["RD"] },
  { name: "Clemson University", verified: false, rounds: ["EA", "RD"] },
  { name: "University of Delaware", verified: false, rounds: ["EA", "RD"] },
  { name: "Stony Brook University", verified: false, rounds: ["EA", "RD"] },

  // ── CS / engineering specialists ───────────────────────────────────────────
  {
    name: "Rensselaer Polytechnic Institute",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Worcester Polytechnic Institute",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Rose-Hulman Institute of Technology",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Stevens Institute of Technology",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Illinois Institute of Technology",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Colorado School of Mines",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Missouri University of Science and Technology",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "New Jersey Institute of Technology",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Michigan Technological University",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "California Polytechnic State University-San Luis Obispo",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "Rochester Institute of Technology",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Drexel University", verified: false, rounds: ["EA", "ED", "RD"] },

  // ── Business / economics ───────────────────────────────────────────────────
  {
    name: "Bentley University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Babson College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "University of Richmond",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Southern Methodist University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Texas Christian University", verified: false, rounds: ["EA", "RD"] },
  { name: "Baylor University", verified: false, rounds: ["EA", "ED", "RD"] },

  // ── Liberal arts colleges ──────────────────────────────────────────────────
  { name: "Carleton College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Davidson College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Colby College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Bates College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Hamilton College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Colgate University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Vassar College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Grinnell College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Haverford College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Bucknell University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "Colorado College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Oberlin College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Kenyon College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Macalester College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Barnard College", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Smith College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Mount Holyoke College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Occidental College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "Dickinson College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Skidmore College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Reed College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Whitman College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Furman University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Gettysburg College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Franklin and Marshall College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Lafayette College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Wesleyan University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "Denison University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },

  // ── National universities: humanities / social science / general ───────────
  {
    name: "George Washington University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "American University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Syracuse University", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Pepperdine University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Santa Clara University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "University of Denver",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Loyola Marymount University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Chapman University", verified: false, rounds: ["EA", "ED", "RD"] },

  // ── Moderately selective / safety-option publics ───────────────────────────
  { name: "San Diego State University", verified: false, rounds: ["RD"] },
  { name: "University of Oregon", verified: false, rounds: ["EA", "RD"] },
  { name: "Oregon State University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Washington State University",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "University of Arizona",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  { name: "University of Utah", verified: false, rounds: ["PRIORITY", "RD"] },
  {
    name: "University of Kansas",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "University of Nebraska-Lincoln",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "University of Missouri-Columbia",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "University of Oklahoma-Norman Campus",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "University of Kentucky",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "The University of Tennessee-Knoxville",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "The University of Alabama",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  { name: "Auburn University", verified: false, rounds: ["PRIORITY", "RD"] },
  {
    name: "University of South Carolina-Columbia",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Cincinnati-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Houston",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "Texas Tech University",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  { name: "University of Central Florida", verified: false, rounds: ["RD"] },
  {
    name: "University of South Florida",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "Georgia State University",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "Iowa State University",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },
  {
    name: "Colorado State University-Fort Collins",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Vermont",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Miami University-Oxford",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },

  // ── Regional / less-selective privates ─────────────────────────────────────
  { name: "DePaul University", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Marquette University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Loyola University Chicago",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Gonzaga University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Elon University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Clark University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Hofstra University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "University of San Diego",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Seattle University", verified: false, rounds: ["EA", "RD"] },
  { name: "Creighton University", verified: false, rounds: ["EA", "RD"] },

  // ── HBCUs / access-oriented ────────────────────────────────────────────────
  { name: "Howard University", verified: false, rounds: ["EA", "RD"] },
  { name: "Spelman College", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Morehouse College", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Florida Agricultural and Mechanical University",
    verified: false,
    rounds: ["PRIORITY", "RD"],
  },
  {
    name: "North Carolina A & T State University",
    verified: false,
    rounds: ["ROLLING", "PRIORITY"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V3 expansion (+100). ROUND STRUCTURE ONLY, all `verified: false`. Same rule
  // as the V2 block above: these reflect each school's well-known round
  // offerings, but NO deadlines are attached and none of these schools are in
  // rounds-candidates.json — so the loader writes each cycle + rounds with
  // deadline_date = null and verified_at = null (pending). The matching engine
  // ignores them until a human opens the official site, adds candidate dates,
  // and sets `verified: true`. Where the exact early-round menu is not
  // well-established, the conservative Regular-Decision floor (["RD"]) is used —
  // never a guessed EA/ED/rolling menu. `name` MUST exactly equal
  // colleges.canonical_name (the Scorecard name resolved at ingest).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Publics in geo-fill / thin states ──────────────────────────────────────
  { name: "University of Arkansas", verified: false, rounds: ["RD"] },
  { name: "University of Mississippi", verified: false, rounds: ["ROLLING"] },
  {
    name: "Mississippi State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of Hawaii at Manoa", verified: false, rounds: ["RD"] },
  { name: "University of Idaho", verified: false, rounds: ["ROLLING"] },
  { name: "Boise State University", verified: false, rounds: ["ROLLING"] },
  { name: "Montana State University", verified: false, rounds: ["ROLLING"] },
  { name: "The University of Montana", verified: false, rounds: ["ROLLING"] },
  { name: "University of Nevada-Las Vegas", verified: false, rounds: ["RD"] },
  { name: "University of Nevada-Reno", verified: false, rounds: ["RD"] },
  {
    name: "University of New Mexico-Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "New Mexico State University-Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "North Dakota State University-Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of North Dakota", verified: false, rounds: ["ROLLING"] },
  {
    name: "South Dakota State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of South Dakota", verified: false, rounds: ["ROLLING"] },
  { name: "West Virginia University", verified: false, rounds: ["RD"] },
  { name: "University of Wyoming", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Alaska Fairbanks",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Alaska Anchorage",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of New Hampshire-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "University of Rhode Island", verified: false, rounds: ["EA", "RD"] },
  { name: "University of Maine", verified: false, rounds: ["EA", "RD"] },

  // ── Additional public universities / regional publics ──────────────────────
  { name: "University of Louisville", verified: false, rounds: ["RD"] },
  {
    name: "Louisiana State University and Agricultural & Mechanical College",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Oklahoma State University-Main Campus",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University of Memphis", verified: false, rounds: ["RD"] },
  {
    name: "University of Alabama at Birmingham",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Kansas State University", verified: false, rounds: ["RD"] },
  { name: "Wichita State University", verified: false, rounds: ["RD"] },
  {
    name: "University of Wisconsin-Milwaukee",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Wayne State University", verified: false, rounds: ["RD"] },
  { name: "Western Michigan University", verified: false, rounds: ["RD"] },
  {
    name: "Ohio University-Main Campus",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Kent State University at Kent", verified: false, rounds: ["RD"] },
  {
    name: "Bowling Green State University-Main Campus",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University of Illinois Chicago", verified: false, rounds: ["RD"] },
  { name: "Portland State University", verified: false, rounds: ["RD"] },
  { name: "Western Washington University", verified: false, rounds: ["RD"] },
  { name: "San Jose State University", verified: false, rounds: ["RD"] },
  { name: "San Francisco State University", verified: false, rounds: ["RD"] },
  {
    name: "California State University-Long Beach",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Fullerton",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State Polytechnic University-Pomona",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University at Buffalo", verified: false, rounds: ["EA", "RD"] },
  { name: "Binghamton University", verified: false, rounds: ["EA", "RD"] },
  { name: "University at Albany", verified: false, rounds: ["EA", "RD"] },
  { name: "The College of New Jersey", verified: false, rounds: ["ED", "RD"] },
  { name: "Montclair State University", verified: false, rounds: ["RD"] },
  { name: "George Mason University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "James Madison University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Virginia Commonwealth University", verified: false, rounds: ["RD"] },
  {
    name: "University of North Carolina at Charlotte",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Appalachian State University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "East Carolina University", verified: false, rounds: ["RD"] },
  { name: "Florida International University", verified: false, rounds: ["RD"] },
  { name: "Florida Atlantic University", verified: false, rounds: ["RD"] },
  {
    name: "The University of Texas at San Antonio",
    verified: false,
    rounds: ["RD"],
  },
  { name: "University of North Texas", verified: false, rounds: ["RD"] },
  { name: "Texas State University", verified: false, rounds: ["RD"] },
  {
    name: "The University of Texas at Arlington",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Kennesaw State University", verified: false, rounds: ["RD"] },
  {
    name: "Georgia Southern University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Maryland-Baltimore County",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Towson University", verified: false, rounds: ["RD"] },
  { name: "College of Charleston", verified: false, rounds: ["EA", "RD"] },
  { name: "Northern Arizona University", verified: false, rounds: ["RD"] },
  { name: "Utah State University", verified: false, rounds: ["RD"] },
  { name: "University of Nebraska at Omaha", verified: false, rounds: ["RD"] },

  // ── Liberal arts colleges (ED-driven; well-documented menus) ───────────────
  {
    name: "Harvey Mudd College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "Claremont McKenna College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Scripps College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Pitzer College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  { name: "Trinity College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "Connecticut College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Bard College", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Sarah Lawrence College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Union College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "St Olaf College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Lawrence University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Beloit College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "DePauw University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Rhodes College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Centre College", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Willamette University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Lewis & Clark College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "The College of Wooster",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },

  // ── Mid-selective private universities ─────────────────────────────────────
  { name: "Bryant University", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Fairfield University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Providence College", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Quinnipiac University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Drake University", verified: false, rounds: ["EA", "RD"] },
  { name: "University of Dayton", verified: false, rounds: ["EA", "RD"] },
  { name: "Duquesne University", verified: false, rounds: ["EA", "RD"] },
  { name: "Belmont University", verified: false, rounds: ["EA", "RD"] },
  { name: "University of the Pacific", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Clarkson University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Trinity University",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Saint Louis University", verified: false, rounds: ["EA", "RD"] },
  { name: "Brigham Young University", verified: false, rounds: ["RD"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 expansion (+100). ROUND STRUCTURE ONLY, all `verified: false`. Same rule
  // as the V2/V3 blocks: these reflect each school's well-known round offerings,
  // but NO deadlines are attached and none of these schools are in
  // rounds-candidates.json — so the loader writes each cycle + rounds with
  // deadline_date = null and verified_at = null (pending). The matching engine
  // ignores them until a human opens the official site, adds candidate dates,
  // and sets `verified: true`. Where the exact early-round menu is not
  // well-established (many access-oriented publics), the conservative
  // Regular-Decision / Rolling floor is used — never a guessed ED/EA menu.
  // `name` MUST exactly equal colleges.canonical_name (the Scorecard name).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Highly selective / selective ───────────────────────────────────────────
  {
    name: "Washington and Lee University",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  {
    name: "College of the Holy Cross",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "Bryn Mawr College", verified: false, rounds: ["ED", "ED_II", "RD"] },
  {
    name: "The Cooper Union for the Advancement of Science and Art",
    verified: false,
    rounds: ["ED", "RD"],
  },
  {
    name: "Franklin W Olin College of Engineering",
    verified: false,
    rounds: ["RD"],
  },
  // Service academies use a unique nomination-based process, not Common-App
  // rounds — modeled as the conservative single window (RD) until verified.
  { name: "United States Military Academy", verified: false, rounds: ["RD"] },
  { name: "United States Naval Academy", verified: false, rounds: ["RD"] },
  { name: "United States Air Force Academy", verified: false, rounds: ["RD"] },

  // ── Arts / comms / design specialists ──────────────────────────────────────
  {
    name: "Emerson College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Ithaca College", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Rhode Island School of Design",
    verified: false,
    rounds: ["ED", "RD"],
  },
  { name: "Pratt Institute-Main", verified: false, rounds: ["ED", "RD"] },
  {
    name: "Savannah College of Art and Design",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Maryland Institute College of Art",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "The New School", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Berklee College of Music", verified: false, rounds: ["EA", "RD"] },

  // ── Engineering / tech specialists ─────────────────────────────────────────
  {
    name: "Embry-Riddle Aeronautical University-Daytona Beach",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Florida Institute of Technology",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Milwaukee School of Engineering",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Kettering University", verified: false, rounds: ["ROLLING"] },
  {
    name: "South Dakota School of Mines and Technology",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Wentworth Institute of Technology",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },

  // ── HBCUs ──────────────────────────────────────────────────────────────────
  { name: "Hampton University", verified: false, rounds: ["EA", "RD"] },
  { name: "Tuskegee University", verified: false, rounds: ["RD"] },
  { name: "Xavier University of Louisiana", verified: false, rounds: ["RD"] },
  { name: "Morgan State University", verified: false, rounds: ["ROLLING"] },
  { name: "Jackson State University", verified: false, rounds: ["ROLLING"] },
  { name: "Tennessee State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Prairie View A & M University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "North Carolina Central University",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── Liberal arts colleges ──────────────────────────────────────────────────
  { name: "Wabash College", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Hillsdale College", verified: false, rounds: ["EA", "RD"] },
  { name: "Berea College", verified: false, rounds: ["EA", "RD"] },
  { name: "Kalamazoo College", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Hope College", verified: false, rounds: ["EA", "RD"] },
  { name: "Wheaton College", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Wheaton College (Massachusetts)",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Agnes Scott College", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Muhlenberg College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Allegheny College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  {
    name: "Gustavus Adolphus College",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Knox College",
    verified: false,
    rounds: ["EA", "ED", "ED_II", "RD"],
  },
  { name: "Cornell College", verified: false, rounds: ["EA", "ED", "RD"] },
  { name: "Wofford College", verified: false, rounds: ["EA", "ED", "RD"] },
  {
    name: "Hobart William Smith Colleges",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Goucher College", verified: false, rounds: ["EA", "ED", "RD"] },

  // ── Religious / mid-selective private universities ─────────────────────────
  {
    name: "University of San Francisco",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Seton Hall University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Saint Joseph's University - Philadelphia",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "University of Scranton", verified: false, rounds: ["EA", "RD"] },
  { name: "John Carroll University", verified: false, rounds: ["EA", "RD"] },
  { name: "University of St Thomas", verified: false, rounds: ["EA", "RD"] },
  { name: "University of Portland", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Loyola University Maryland",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "Sacred Heart University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  { name: "University of Tulsa", verified: false, rounds: ["EA", "RD"] },
  { name: "Xavier University", verified: false, rounds: ["EA", "RD"] },
  { name: "Stonehill College", verified: false, rounds: ["EA", "ED", "RD"] },

  // ── CSU campuses (single Nov/Fall filing window → RD floor) ────────────────
  {
    name: "California State University-Sacramento",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Northridge",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Fresno",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Chico",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-San Marcos",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-East Bay",
    verified: false,
    rounds: ["RD"],
  },

  // ── CUNY campuses (single filing window → RD floor) ────────────────────────
  { name: "CUNY Bernard M Baruch College", verified: false, rounds: ["RD"] },
  { name: "CUNY Hunter College", verified: false, rounds: ["RD"] },
  { name: "CUNY City College", verified: false, rounds: ["RD"] },
  { name: "CUNY Queens College", verified: false, rounds: ["RD"] },
  { name: "CUNY Brooklyn College", verified: false, rounds: ["RD"] },

  // ── SUNY additional ────────────────────────────────────────────────────────
  { name: "SUNY College at Geneseo", verified: false, rounds: ["EA", "RD"] },
  {
    name: "State University of New York at New Paltz",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "SUNY College of Environmental Science and Forestry",
    verified: false,
    rounds: ["EA", "RD"],
  },

  // ── Regional / access-oriented publics ─────────────────────────────────────
  {
    name: "University of Massachusetts-Lowell",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of Massachusetts-Boston",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Old Dominion University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Christopher Newport University",
    verified: false,
    rounds: ["EA", "ED", "RD"],
  },
  {
    name: "University of North Carolina at Greensboro",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of North Carolina Wilmington",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Western Carolina University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Alabama in Huntsville",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of South Alabama", verified: false, rounds: ["ROLLING"] },
  { name: "University of Toledo", verified: false, rounds: ["ROLLING"] },
  { name: "Cleveland State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Wright State University-Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Colorado Denver/Anschutz Medical Campus",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of Missouri-Kansas City",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of New Orleans", verified: false, rounds: ["ROLLING"] },
  {
    name: "The University of Texas at El Paso",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Texas Woman's University", verified: false, rounds: ["ROLLING"] },
  { name: "University of Northern Iowa", verified: false, rounds: ["ROLLING"] },
  { name: "Ball State University", verified: false, rounds: ["ROLLING"] },
  { name: "Illinois State University", verified: false, rounds: ["RD"] },
  {
    name: "Northern Illinois University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Wisconsin-Eau Claire",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Grand Valley State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of North Florida", verified: false, rounds: ["RD"] },
  {
    name: "Sam Houston State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Middle Tennessee State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Western Kentucky University", verified: false, rounds: ["ROLLING"] },
  { name: "Marshall University", verified: false, rounds: ["ROLLING"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // V5 expansion (+100). ROUND STRUCTURE ONLY, all `verified: false`. Same rule
  // as the V2/V3/V4 blocks: these reflect each school's well-known round
  // offerings (rolling/RD floors for access-oriented publics, EA+RD for the
  // comprehensives that publish an EA date, ED/EA for the selective privates),
  // but no deadline is stored here and nothing is trusted until a human sets
  // `verified: true`. Names must match the V5 seeds in seed-colleges.mjs.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── HBCUs ──────────────────────────────────────────────────────────────────
  { name: "Bethune-Cookman University", verified: false, rounds: ["ROLLING"] },
  { name: "Alabama A & M University", verified: false, rounds: ["ROLLING"] },
  { name: "Alabama State University", verified: false, rounds: ["ROLLING"] },
  { name: "Clark Atlanta University", verified: false, rounds: ["EA", "RD"] },
  { name: "Fisk University", verified: false, rounds: ["RD"] },
  { name: "Dillard University", verified: false, rounds: ["ROLLING"] },
  { name: "Grambling State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Southern University and A & M College",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Norfolk State University", verified: false, rounds: ["ROLLING"] },
  { name: "Virginia State University", verified: false, rounds: ["ROLLING"] },
  { name: "Texas Southern University", verified: false, rounds: ["ROLLING"] },
  { name: "Delaware State University", verified: false, rounds: ["ROLLING"] },

  // ── CSU access campuses (single filing window → RD floor) ──────────────────
  {
    name: "California State University-Bakersfield",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Dominguez Hills",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Los Angeles",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-San Bernardino",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California State University-Stanislaus",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Sonoma State University", verified: false, rounds: ["RD"] },
  {
    name: "California State University-Monterey Bay",
    verified: false,
    rounds: ["RD"],
  },

  // ── CUNY campuses (single filing window → RD floor) ────────────────────────
  {
    name: "CUNY John Jay College of Criminal Justice",
    verified: false,
    rounds: ["RD"],
  },
  { name: "CUNY Lehman College", verified: false, rounds: ["RD"] },
  { name: "College of Staten Island CUNY", verified: false, rounds: ["RD"] },

  // ── PASSHE (Pennsylvania) regional publics ─────────────────────────────────
  {
    name: "West Chester University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Shippensburg University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Millersville University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Kutztown University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Indiana University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── New Jersey regional publics ────────────────────────────────────────────
  { name: "Rowan University", verified: false, rounds: ["ROLLING"] },
  { name: "Kean University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Ramapo College of New Jersey",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Stockton University", verified: false, rounds: ["ROLLING"] },

  // ── New England regional publics ───────────────────────────────────────────
  {
    name: "University of Massachusetts-Dartmouth",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Bridgewater State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Central Connecticut State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Southern Connecticut State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Keene State College", verified: false, rounds: ["ROLLING"] },
  { name: "Rhode Island College", verified: false, rounds: ["ROLLING"] },

  // ── Southeast regional publics ─────────────────────────────────────────────
  {
    name: "Coastal Carolina University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Winthrop University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Citadel Military College of South Carolina",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of North Carolina Asheville",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "University of North Carolina at Pembroke",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "East Tennessee State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Tennessee Technological University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Radford University", verified: false, rounds: ["ROLLING"] },
  { name: "Longwood University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "University of Mary Washington",
    verified: false,
    rounds: ["EA", "RD"],
  },

  // ── Georgia / Florida regional publics ─────────────────────────────────────
  { name: "Valdosta State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Georgia College & State University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "University of North Georgia", verified: false, rounds: ["ROLLING"] },
  { name: "University of West Florida", verified: false, rounds: ["ROLLING"] },
  { name: "Florida Gulf Coast University", verified: false, rounds: ["RD"] },
  { name: "University of West Georgia", verified: false, rounds: ["ROLLING"] },

  // ── Midwest regional publics ───────────────────────────────────────────────
  { name: "Eastern Michigan University", verified: false, rounds: ["ROLLING"] },
  { name: "Central Michigan University", verified: false, rounds: ["ROLLING"] },
  { name: "Oakland University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Southern Illinois University-Carbondale",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Southern Illinois University Edwardsville",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Missouri State University-Springfield",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Central Missouri",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Indiana State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Wisconsin-La Crosse",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "University of Wisconsin-Oshkosh",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Wisconsin-Whitewater",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Minnesota State University-Mankato",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── Plains / Mountain regional publics ─────────────────────────────────────
  {
    name: "Saint Cloud State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "University of Minnesota-Duluth", verified: false, rounds: ["RD"] },
  {
    name: "University of Nebraska at Kearney",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Fort Hays State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Metropolitan State University of Denver",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Northern Colorado",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── West regional publics ──────────────────────────────────────────────────
  { name: "Weber State University", verified: false, rounds: ["ROLLING"] },
  { name: "Utah Valley University", verified: false, rounds: ["ROLLING"] },
  { name: "Southern Utah University", verified: false, rounds: ["ROLLING"] },
  { name: "Idaho State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Eastern Washington University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Central Washington University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "The Evergreen State College", verified: false, rounds: ["ROLLING"] },
  { name: "Western Oregon University", verified: false, rounds: ["ROLLING"] },

  // ── Texas regional publics ─────────────────────────────────────────────────
  {
    name: "Texas A & M University-Corpus Christi",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Texas A&M University-Kingsville",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Stephen F Austin State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Lamar University", verified: false, rounds: ["ROLLING"] },
  {
    name: "The University of Texas Rio Grande Valley",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Tarleton State University", verified: false, rounds: ["ROLLING"] },

  // ── Louisiana / Deep South regional publics ────────────────────────────────
  {
    name: "University of Louisiana at Lafayette",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Louisiana at Monroe",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Southern Mississippi",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── Kentucky regional publics ──────────────────────────────────────────────
  { name: "Eastern Kentucky University", verified: false, rounds: ["ROLLING"] },
  { name: "Murray State University", verified: false, rounds: ["ROLLING"] },

  // ── Selective / distinctive privates ───────────────────────────────────────
  {
    name: "The University of the South",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "St Lawrence University", verified: false, rounds: ["ED", "RD"] },
  { name: "Mercer University", verified: false, rounds: ["EA", "RD"] },
  { name: "Samford University", verified: false, rounds: ["EA", "RD"] },
  { name: "Yeshiva University", verified: false, rounds: ["EA", "RD"] },

  // ── SUNY comprehensive colleges ────────────────────────────────────────────
  {
    name: "State University of New York at Oswego",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "State University of New York at Cortland",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "State University of New York at Plattsburgh",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "SUNY Oneonta", verified: false, rounds: ["EA", "RD"] },
  {
    name: "SUNY Buffalo State University",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V6 expansion (+100). Structure-only, all verified: false — the loader writes
  // these cycles/rounds with deadline_date = null and verified_at = null until a
  // human confirms each against the official admissions page. Round SETS reflect
  // the round TYPES each college is understood to offer; no dates are asserted.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── HBCUs not yet covered ──────────────────────────────────────────────────
  {
    name: "Fayetteville State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Winston-Salem State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "South Carolina State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Albany State University", verified: false, rounds: ["ROLLING"] },
  { name: "Savannah State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Fort Valley State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Bowie State University", verified: false, rounds: ["ROLLING"] },
  { name: "Alcorn State University", verified: false, rounds: ["ROLLING"] },
  { name: "Langston University", verified: false, rounds: ["ROLLING"] },
  { name: "Central State University", verified: false, rounds: ["ROLLING"] },
  { name: "Kentucky State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Johnson C Smith University",
    verified: false,
    rounds: ["EA", "RD"],
  },

  // ── Women's colleges & distinctive LACs ────────────────────────────────────
  { name: "Simmons University", verified: false, rounds: ["EA", "RD"] },
  { name: "Meredith College", verified: false, rounds: ["EA", "RD"] },
  { name: "Hollins University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Saint Mary's College", verified: false, rounds: ["EA", "RD"] },
  { name: "Hendrix College", verified: false, rounds: ["EA", "RD"] },
  { name: "Millsaps College", verified: false, rounds: ["EA", "RD"] },
  { name: "Berry College", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Ursinus College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Juniata College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Earlham College", verified: false, rounds: ["ED", "EA", "RD"] },

  // ── More liberal-arts colleges (mid band) ──────────────────────────────────
  { name: "Roanoke College", verified: false, rounds: ["ED", "EA", "RD"] },
  {
    name: "Randolph-Macon College",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Hampden-Sydney College",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Coe College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Luther College", verified: false, rounds: ["EA", "RD"] },
  { name: "Wittenberg University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Ohio Wesleyan University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Susquehanna University",
    verified: false,
    rounds: ["ED", "ED_II", "EA", "RD"],
  },
  {
    name: "Washington & Jefferson College",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Saint Michael's College", verified: false, rounds: ["EA", "RD"] },

  // ── Selective / mid national privates not covered ──────────────────────────
  {
    name: "Rollins College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Stetson University", verified: false, rounds: ["EA", "RD"] },
  { name: "Butler University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Valparaiso University", verified: false, rounds: ["EA", "RD"] },
  { name: "Adelphi University", verified: false, rounds: ["EA", "RD"] },
  { name: "Marist University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Siena University", verified: false, rounds: ["ED", "EA", "RD"] },
  {
    name: "St. John's University-New York",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Pace University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "The Catholic University of America",
    verified: false,
    rounds: ["EA", "RD"],
  },

  // ── Catholic / Jesuit / Christian universities not covered ─────────────────
  { name: "Canisius University", verified: false, rounds: ["EA", "RD"] },
  { name: "Le Moyne College", verified: false, rounds: ["EA", "RD"] },
  { name: "Saint Peter's University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Loyola University New Orleans",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Rockhurst University", verified: false, rounds: ["ROLLING"] },
  { name: "Regis University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Saint Mary's College of California",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "University of Dallas", verified: false, rounds: ["EA", "RD"] },
  { name: "Assumption University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Salve Regina University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },

  // ── Large Christian / religious universities ───────────────────────────────
  { name: "Liberty University", verified: false, rounds: ["ROLLING"] },
  { name: "Grand Canyon University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Abilene Christian University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Biola University", verified: false, rounds: ["EA", "RD"] },
  { name: "Calvin University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Brigham Young University-Idaho",
    verified: false,
    rounds: ["RD"],
  },

  // ── Military / maritime academies (thin category) ──────────────────────────
  {
    name: "United States Coast Guard Academy",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "United States Merchant Marine Academy",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "Virginia Military Institute",
    verified: false,
    rounds: ["ED", "RD"],
  },
  { name: "Norwich University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Massachusetts Maritime Academy",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "SUNY Maritime College", verified: false, rounds: ["EA", "RD"] },

  // ── Art / music / design specialists ───────────────────────────────────────
  {
    name: "School of the Art Institute of Chicago",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "California Institute of the Arts",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "Fashion Institute of Technology",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Columbia College Chicago", verified: false, rounds: ["ROLLING"] },
  {
    name: "Ringling College of Art and Design",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "The New England Conservatory of Music",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "Art Center College of Design",
    verified: false,
    rounds: ["RD"],
  },

  // ── Engineering / tech specialists not covered ─────────────────────────────
  {
    name: "New Mexico Institute of Mining and Technology",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Oregon Institute of Technology",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Lawrence Technological University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Embry-Riddle Aeronautical University-Prescott",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Montana Technological University",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── SUNY campuses not yet covered ──────────────────────────────────────────
  {
    name: "SUNY at Fredonia",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "SUNY College at Potsdam",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "SUNY Brockport",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "SUNY at Purchase College", verified: false, rounds: ["EA", "RD"] },
  { name: "Farmingdale State College", verified: false, rounds: ["ROLLING"] },

  // ── Additional regional publics (selective → access) ───────────────────────
  { name: "Truman State University", verified: false, rounds: ["RD"] },
  { name: "New College of Florida", verified: false, rounds: ["EA", "RD"] },
  { name: "University of Montevallo", verified: false, rounds: ["EA", "RD"] },
  {
    name: "The University of Tennessee-Chattanooga",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Salisbury University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Wisconsin-Stevens Point",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Winona State University", verified: false, rounds: ["ROLLING"] },
  { name: "Ferris State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Central Arkansas",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Arkansas State University", verified: false, rounds: ["ROLLING"] },
  { name: "Louisiana Tech University", verified: false, rounds: ["ROLLING"] },
  { name: "Salem State University", verified: false, rounds: ["ROLLING"] },

  // ── More access-oriented publics (widen safety band) ───────────────────────
  { name: "Rutgers University-Newark", verified: false, rounds: ["RD"] },
  {
    name: "William Paterson University of New Jersey",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Slippery Rock University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Akron Main Campus",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Western Illinois University", verified: false, rounds: ["ROLLING"] },
  { name: "Angelo State University", verified: false, rounds: ["ROLLING"] },
  { name: "Troy University", verified: false, rounds: ["ROLLING"] },

  // ═══════════════════════════════════════════════════════════════════════════
  // V7 expansion (+100). ROUND STRUCTURE ONLY, all `verified: false`. Same rule
  // as V2–V6: best-effort round TYPES per institution (deadlines are never
  // stored here — the loader writes them null/pending), left unverified until a
  // human confirms each against the official admissions page and sets
  // `verified: true`. Names must match the V7 seeds in seed-colleges.mjs exactly.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Liberal arts colleges ──────────────────────────────────────────────────
  { name: "St. John's College", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Bennington College",
    verified: false,
    rounds: ["ED", "ED_II", "RD"],
  },
  { name: "Hampshire College", verified: false, rounds: ["ED", "EA", "RD"] },
  {
    name: "College of the Atlantic",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Guilford College", verified: false, rounds: ["EA", "RD"] },
  { name: "Lake Forest College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Ripon College", verified: false, rounds: ["ROLLING"] },
  { name: "Albion College", verified: false, rounds: ["ROLLING"] },
  { name: "Alma College", verified: false, rounds: ["ROLLING"] },
  { name: "Saint Norbert College", verified: false, rounds: ["ROLLING"] },
  { name: "Wartburg College", verified: false, rounds: ["ROLLING"] },
  { name: "Whittier College", verified: false, rounds: ["EA", "RD"] },
  { name: "Westmont College", verified: false, rounds: ["EA", "RD"] },
  { name: "Soka University of America", verified: false, rounds: ["EA", "RD"] },
  {
    name: "University of Puget Sound",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Whitworth University", verified: false, rounds: ["ROLLING"] },
  { name: "Eckerd College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Washington College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "McDaniel College", verified: false, rounds: ["EA", "RD"] },
  { name: "Augustana College", verified: false, rounds: ["ROLLING"] },

  // ── Women's colleges ───────────────────────────────────────────────────────
  { name: "Salem College", verified: false, rounds: ["EA", "RD"] },
  { name: "Sweet Briar College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Stephens College", verified: false, rounds: ["ROLLING"] },

  // ── HBCUs ──────────────────────────────────────────────────────────────────
  { name: "Bennett College", verified: false, rounds: ["ROLLING"] },
  { name: "Tougaloo College", verified: false, rounds: ["ROLLING"] },
  { name: "Claflin University", verified: false, rounds: ["ROLLING"] },
  { name: "Wilberforce University", verified: false, rounds: ["ROLLING"] },
  { name: "Lincoln University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Elizabeth City State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Virginia Union University", verified: false, rounds: ["ROLLING"] },
  { name: "Talladega College", verified: false, rounds: ["ROLLING"] },

  // ── Catholic / Christian universities ──────────────────────────────────────
  { name: "Manhattan University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Spring Hill College", verified: false, rounds: ["ROLLING"] },
  { name: "Saint Anselm College", verified: false, rounds: ["EA", "RD"] },
  { name: "Benedictine College", verified: false, rounds: ["ROLLING"] },
  { name: "University of Detroit Mercy", verified: false, rounds: ["ROLLING"] },
  {
    name: "Mount St. Mary's University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Franciscan University of Steubenville",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Lipscomb University", verified: false, rounds: ["EA", "RD"] },
  { name: "Saint Edward's University", verified: false, rounds: ["EA", "RD"] },

  // ── Strong / distinctive public universities ───────────────────────────────
  {
    name: "University of Missouri-St Louis",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Colorado Colorado Springs",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Wisconsin-Stout",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Minnesota-Morris",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Michigan-Dearborn",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "California State Polytechnic University-Humboldt",
    verified: false,
    rounds: ["RD"],
  },
  { name: "SUNY Polytechnic Institute", verified: false, rounds: ["EA", "RD"] },
  { name: "Fort Lewis College", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Wisconsin-Green Bay",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Emporia State University", verified: false, rounds: ["ROLLING"] },
  { name: "Pittsburg State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "St. Mary's College of Maryland",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Georgia Gwinnett College", verified: false, rounds: ["ROLLING"] },
  {
    name: "The University of Texas at Tyler",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── Specialized STEM institutes ────────────────────────────────────────────
  { name: "Webb Institute", verified: false, rounds: ["ED", "RD"] },
  {
    name: "DigiPen Institute of Technology",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Florida Polytechnic University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Vaughn College of Aeronautics and Technology",
    verified: false,
    rounds: ["ROLLING"],
  },

  // ── Audition / portfolio conservatories & art schools ──────────────────────
  { name: "The Juilliard School", verified: false, rounds: ["RD"] },
  { name: "Curtis Institute of Music", verified: false, rounds: ["RD"] },
  { name: "Manhattan School of Music", verified: false, rounds: ["ED", "RD"] },
  {
    name: "San Francisco Conservatory of Music",
    verified: false,
    rounds: ["RD"],
  },
  {
    name: "California College of the Arts",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Otis College of Art and Design",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Massachusetts College of Art and Design",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Cleveland Institute of Art", verified: false, rounds: ["EA", "RD"] },

  // ── Regional / comprehensive universities ──────────────────────────────────
  { name: "Roger Williams University", verified: false, rounds: ["EA", "RD"] },
  { name: "Suffolk University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Merrimack College", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Western New England University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Endicott College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Iona University", verified: false, rounds: ["EA", "RD"] },
  { name: "St. John Fisher University", verified: false, rounds: ["EA", "RD"] },
  { name: "Wagner College", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Nazareth University", verified: false, rounds: ["EA", "RD"] },
  { name: "Rider University", verified: false, rounds: ["EA", "RD"] },
  { name: "Monmouth University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Arcadia University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "La Salle University", verified: false, rounds: ["ROLLING"] },
  { name: "Widener University", verified: false, rounds: ["ROLLING"] },
  { name: "Marywood University", verified: false, rounds: ["ROLLING"] },
  { name: "Bradley University", verified: false, rounds: ["ROLLING"] },
  { name: "North Central College", verified: false, rounds: ["ROLLING"] },
  { name: "Elmhurst University", verified: false, rounds: ["ROLLING"] },
  { name: "Millikin University", verified: false, rounds: ["ROLLING"] },
  { name: "Baldwin Wallace University", verified: false, rounds: ["ROLLING"] },
  { name: "Otterbein University", verified: false, rounds: ["ROLLING"] },
  { name: "Ohio Northern University", verified: false, rounds: ["ROLLING"] },
  { name: "University of Evansville", verified: false, rounds: ["ROLLING"] },
  { name: "Drury University", verified: false, rounds: ["ROLLING"] },
  { name: "Webster University", verified: false, rounds: ["ROLLING"] },
  { name: "Carroll University", verified: false, rounds: ["ROLLING"] },
  {
    name: "High Point University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Queens University of Charlotte",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Union University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Christian Brothers University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Palm Beach Atlantic University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Dallas Baptist University", verified: false, rounds: ["ROLLING"] },
  { name: "Seattle Pacific University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Pacific Lutheran University",
    verified: false,
    rounds: ["EA", "RD"],
  },

  // V8 expansion (+100). ROUND STRUCTURE ONLY, all `verified: false`. Same rule
  // as V2–V7: the loader writes these unverified (the matching engine ignores
  // unverified rounds), pending human confirmation before any becomes
  // `verified: true`. Names must match the V8 seeds in seed-colleges.mjs exactly.
  { name: "Gallaudet University", verified: false, rounds: ["EA", "RD"] },
  {
    name: "University of North Carolina School of the Arts",
    verified: false,
    rounds: ["ED", "RD"],
  },
  { name: "Cleveland Institute of Music", verified: false, rounds: ["RD"] },
  {
    name: "Marymount Manhattan College",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Minneapolis College of Art and Design",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Kansas City Art Institute", verified: false, rounds: ["ROLLING"] },
  {
    name: "Columbus College of Art & Design",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "College for Creative Studies",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Milwaukee Institute of Art & Design",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Moore College of Art and Design",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Cal Poly Maritime Academy",
    verified: false,
    rounds: ["RD"],
  },
  { name: "Maine Maritime Academy", verified: false, rounds: ["ROLLING"] },
  {
    name: "Lesley University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "New York Institute of Technology",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Wesleyan College", verified: false, rounds: ["ROLLING"] },
  {
    name: "College of Saint Benedict",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Mississippi University for Women",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Trinity Washington University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Notre Dame of Maryland University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Cedar Crest College", verified: false, rounds: ["ROLLING"] },
  { name: "Converse University", verified: false, rounds: ["ROLLING"] },
  { name: "Brenau University", verified: false, rounds: ["ROLLING"] },
  { name: "Coppin State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Maryland Eastern Shore",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "West Virginia State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Cheyney University of Pennsylvania",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Shaw University", verified: false, rounds: ["ROLLING"] },
  { name: "Benedict College", verified: false, rounds: ["ROLLING"] },
  { name: "Miles College", verified: false, rounds: ["ROLLING"] },
  { name: "Stillman College", verified: false, rounds: ["ROLLING"] },
  { name: "Wiley University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Harris-Stowe State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Illinois Wesleyan University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  {
    name: "Transylvania University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Austin College", verified: false, rounds: ["ED", "EA", "RD"] },
  {
    name: "Southwestern University",
    verified: false,
    rounds: ["ED", "EA", "RD"],
  },
  { name: "Drew University", verified: false, rounds: ["ED", "EA", "RD"] },
  { name: "Hartwick College", verified: false, rounds: ["EA", "RD"] },
  { name: "Elmira College", verified: false, rounds: ["EA", "RD"] },
  { name: "Hanover College", verified: false, rounds: ["EA", "RD"] },
  { name: "Goshen College", verified: false, rounds: ["ROLLING"] },
  { name: "Taylor University", verified: false, rounds: ["ROLLING"] },
  { name: "Augustana University", verified: false, rounds: ["ROLLING"] },
  { name: "Central College", verified: false, rounds: ["ROLLING"] },
  { name: "Simpson College", verified: false, rounds: ["ROLLING"] },
  { name: "Carthage College", verified: false, rounds: ["EA", "RD"] },
  { name: "Monmouth College", verified: false, rounds: ["EA", "RD"] },
  { name: "William Jewell College", verified: false, rounds: ["ROLLING"] },
  { name: "Oglethorpe University", verified: false, rounds: ["EA", "RD"] },
  { name: "Presbyterian College", verified: false, rounds: ["EA", "RD"] },
  { name: "Saint Vincent College", verified: false, rounds: ["ROLLING"] },
  { name: "Saint Francis University", verified: false, rounds: ["ROLLING"] },
  { name: "DeSales University", verified: false, rounds: ["ROLLING"] },
  { name: "Bellarmine University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of the Incarnate Word",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "St. Mary's University", verified: false, rounds: ["ROLLING"] },
  { name: "Dominican University", verified: false, rounds: ["ROLLING"] },
  { name: "Lewis University", verified: false, rounds: ["ROLLING"] },
  { name: "Niagara University", verified: false, rounds: ["ROLLING"] },
  { name: "St Bonaventure University", verified: false, rounds: ["EA", "RD"] },
  { name: "Youngstown State University", verified: false, rounds: ["ROLLING"] },
  { name: "Eastern Illinois University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Northern Kentucky University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Morehead State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Austin Peay State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Jacksonville State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of North Alabama",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Francis Marion University", verified: false, rounds: ["ROLLING"] },
  { name: "Augusta University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Indiana University-Indianapolis",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Southeast Missouri State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Northwest Missouri State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Washburn University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Wisconsin-Platteville",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "University of Wisconsin-River Falls",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Minnesota State University Moorhead",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Bemidji State University", verified: false, rounds: ["ROLLING"] },
  { name: "Framingham State University", verified: false, rounds: ["ROLLING"] },
  { name: "Westfield State University", verified: false, rounds: ["ROLLING"] },
  { name: "Fitchburg State University", verified: false, rounds: ["ROLLING"] },
  { name: "Worcester State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Massachusetts College of Liberal Arts",
    verified: false,
    rounds: ["EA", "RD"],
  },
  {
    name: "Western Connecticut State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  {
    name: "Eastern Connecticut State University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Plymouth State University", verified: false, rounds: ["ROLLING"] },
  {
    name: "University of Southern Maine",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Frostburg State University", verified: false, rounds: ["ROLLING"] },
  { name: "Southern Oregon University", verified: false, rounds: ["ROLLING"] },
  { name: "The University of Tampa", verified: false, rounds: ["EA", "RD"] },
  { name: "Jacksonville University", verified: false, rounds: ["ROLLING"] },
  {
    name: "Nova Southeastern University",
    verified: false,
    rounds: ["ROLLING"],
  },
  { name: "Florida Southern College", verified: false, rounds: ["EA", "RD"] },
  { name: "Campbell University", verified: false, rounds: ["ROLLING"] },
  { name: "Wingate University", verified: false, rounds: ["ROLLING"] },
  { name: "Carson-Newman University", verified: false, rounds: ["ROLLING"] },
  {
    name: "California Lutheran University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "University of La Verne", verified: false, rounds: ["EA", "RD"] },
  {
    name: "Point Loma Nazarene University",
    verified: false,
    rounds: ["EA", "RD"],
  },
  { name: "Linfield University", verified: false, rounds: ["ROLLING"] },
  { name: "George Fox University", verified: false, rounds: ["ROLLING"] },
];
