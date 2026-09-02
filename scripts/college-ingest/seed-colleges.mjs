// College seed list (681 = V1 ~53 + V2 +128 + V3 +100 + V4 +100 + V5 +100 +
// V6 +100 + V7 +100).
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

  // ═══════════════════════════════════════════════════════════════════════════
  // V2 expansion (+128). Same rules as V1: seeded by NAME + STATE, resolved to an
  // IPEDS unitid by the Scorecard ingester (exact canonical-name match). Chosen
  // to broaden recommendation-engine coverage across the FULL selectivity range
  // — deliberately weighted toward the target/likely/safety band the V1 elite set
  // lacked — plus CS/engineering/business/humanities/LAC/HBCU breadth. `notes`
  // records the selectivity band + why the school is here, not app facts (all
  // real facts come from Scorecard). Names are the exact Scorecard canonical
  // names, verified against the API before commit.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── More UCs (selective → less selective; strong CS/eng; test-blind system) ─
  {
    name: "University of California-San Diego",
    state: "CA",
    notes: "selective public; UC system; test-blind",
  },
  {
    name: "University of California-Davis",
    state: "CA",
    notes: "selective public; UC system; test-blind",
  },
  {
    name: "University of California-Irvine",
    state: "CA",
    notes: "selective public; UC system; test-blind",
  },
  {
    name: "University of California-Santa Barbara",
    state: "CA",
    notes: "selective public; UC system; test-blind",
  },
  {
    name: "University of California-Santa Cruz",
    state: "CA",
    notes: "moderate public; UC system; test-blind",
  },
  {
    name: "University of California-Riverside",
    state: "CA",
    notes: "less selective public; UC system; test-blind",
  },
  {
    name: "University of California-Merced",
    state: "CA",
    notes: "safety public; UC system; test-blind",
  },

  // ── Highly selective privates not in V1 ────────────────────────────────────
  {
    name: "Boston College",
    state: "MA",
    notes: "selective private; EA + ED I/II",
  },
  {
    name: "William & Mary",
    state: "VA",
    notes: "selective public; humanities/social science",
  },
  { name: "Wake Forest University", state: "NC", notes: "selective private" },
  {
    name: "University of Rochester",
    state: "NY",
    notes: "selective private; strong STEM/music",
  },
  {
    name: "Case Western Reserve University",
    state: "OH",
    notes: "selective private; strong engineering",
  },
  {
    name: "Tulane University of Louisiana",
    state: "LA",
    notes: "selective private",
  },
  {
    name: "Brandeis University",
    state: "MA",
    notes: "selective private; humanities/social science",
  },
  {
    name: "Lehigh University",
    state: "PA",
    notes: "selective private; strong engineering/business",
  },
  {
    name: "Villanova University",
    state: "PA",
    notes: "selective private; strong business",
  },
  { name: "University of Miami", state: "FL", notes: "selective private" },

  // ── Strong public flagships (selective → moderate) ─────────────────────────
  {
    name: "University of Georgia",
    state: "GA",
    notes: "selective public flagship",
  },
  {
    name: "University of Maryland-College Park",
    state: "MD",
    notes: "selective public; strong CS/eng",
  },
  {
    name: "Purdue University-Main Campus",
    state: "IN",
    notes: "selective public; strong engineering/CS",
  },
  {
    name: "University of Minnesota-Twin Cities",
    state: "MN",
    notes: "moderate public flagship",
  },
  {
    name: "Rutgers University-New Brunswick",
    state: "NJ",
    notes: "moderate public flagship",
  },
  {
    name: "Indiana University-Bloomington",
    state: "IN",
    notes: "moderate public; strong business (Kelley)",
  },
  {
    name: "University of Connecticut",
    state: "CT",
    notes: "moderate public flagship",
  },
  {
    name: "Virginia Polytechnic Institute and State University",
    state: "VA",
    notes: "moderate public; strong engineering",
  },
  {
    name: "North Carolina State University at Raleigh",
    state: "NC",
    notes: "moderate public; strong engineering",
  },
  {
    name: "Texas A&M University-College Station",
    state: "TX",
    notes: "moderate public; strong engineering; large",
  },
  {
    name: "University of Colorado Boulder",
    state: "CO",
    notes: "moderate public; strong aerospace/eng",
  },
  {
    name: "The University of Texas at Dallas",
    state: "TX",
    notes: "moderate public; strong CS",
  },
  {
    name: "University of Iowa",
    state: "IA",
    notes: "less selective public; rolling",
  },
  { name: "Florida State University", state: "FL", notes: "selective public" },
  {
    name: "Clemson University",
    state: "SC",
    notes: "moderate public; strong engineering",
  },
  { name: "University of Delaware", state: "DE", notes: "moderate public" },
  {
    name: "Stony Brook University",
    state: "NY",
    notes: "selective public; SUNY; strong CS",
  },

  // ── CS / engineering specialists ───────────────────────────────────────────
  {
    name: "Rensselaer Polytechnic Institute",
    state: "NY",
    notes: "private tech; engineering",
  },
  {
    name: "Worcester Polytechnic Institute",
    state: "MA",
    notes: "private tech; engineering; test-blind",
  },
  {
    name: "Rose-Hulman Institute of Technology",
    state: "IN",
    notes: "private tech; undergrad engineering",
  },
  {
    name: "Stevens Institute of Technology",
    state: "NJ",
    notes: "private tech; engineering",
  },
  {
    name: "Illinois Institute of Technology",
    state: "IL",
    notes: "private tech; engineering",
  },
  {
    name: "Colorado School of Mines",
    state: "CO",
    notes: "public tech; engineering/geoscience",
  },
  {
    name: "Missouri University of Science and Technology",
    state: "MO",
    notes: "public tech; engineering; rolling",
  },
  {
    name: "New Jersey Institute of Technology",
    state: "NJ",
    notes: "public tech; engineering",
  },
  {
    name: "Michigan Technological University",
    state: "MI",
    notes: "public tech; engineering; rolling",
  },
  {
    name: "California Polytechnic State University-San Luis Obispo",
    state: "CA",
    notes: "public; strong engineering; single deadline",
  },
  {
    name: "Rochester Institute of Technology",
    state: "NY",
    notes: "private; strong CS/design",
  },
  {
    name: "Drexel University",
    state: "PA",
    notes: "private; strong engineering/co-op",
  },

  // ── Business / economics strong ────────────────────────────────────────────
  {
    name: "Bentley University",
    state: "MA",
    notes: "private; business-focused",
  },
  {
    name: "Babson College",
    state: "MA",
    notes: "private; entrepreneurship/business",
  },
  {
    name: "University of Richmond",
    state: "VA",
    notes: "selective private; strong business",
  },
  {
    name: "Southern Methodist University",
    state: "TX",
    notes: "private; strong business",
  },
  {
    name: "Texas Christian University",
    state: "TX",
    notes: "moderate private; business",
  },
  { name: "Baylor University", state: "TX", notes: "moderate private" },

  // ── Liberal arts colleges (full selectivity range) ─────────────────────────
  { name: "Carleton College", state: "MN", notes: "LAC; highly selective" },
  { name: "Davidson College", state: "NC", notes: "LAC; highly selective" },
  { name: "Colby College", state: "ME", notes: "LAC; highly selective" },
  {
    name: "Bates College",
    state: "ME",
    notes: "LAC; highly selective; test-optional",
  },
  { name: "Hamilton College", state: "NY", notes: "LAC; highly selective" },
  { name: "Colgate University", state: "NY", notes: "LAC; highly selective" },
  { name: "Vassar College", state: "NY", notes: "LAC; selective" },
  { name: "Grinnell College", state: "IA", notes: "LAC; selective" },
  { name: "Haverford College", state: "PA", notes: "LAC; highly selective" },
  { name: "Bucknell University", state: "PA", notes: "LAC; moderate" },
  {
    name: "Colorado College",
    state: "CO",
    notes: "LAC; selective; block plan",
  },
  {
    name: "Oberlin College",
    state: "OH",
    notes: "LAC; selective; humanities/music",
  },
  {
    name: "Kenyon College",
    state: "OH",
    notes: "LAC; selective; humanities/writing",
  },
  {
    name: "Macalester College",
    state: "MN",
    notes: "LAC; selective; social science",
  },
  {
    name: "Barnard College",
    state: "NY",
    notes: "LAC; highly selective; women's",
  },
  { name: "Smith College", state: "MA", notes: "LAC; selective; women's" },
  {
    name: "Mount Holyoke College",
    state: "MA",
    notes: "LAC; moderate; women's",
  },
  { name: "Occidental College", state: "CA", notes: "LAC; moderate" },
  { name: "Dickinson College", state: "PA", notes: "LAC; moderate" },
  { name: "Skidmore College", state: "NY", notes: "LAC; moderate" },
  { name: "Reed College", state: "OR", notes: "LAC; selective; humanities" },
  { name: "Whitman College", state: "WA", notes: "LAC; moderate" },
  { name: "Furman University", state: "SC", notes: "LAC; moderate" },
  { name: "Gettysburg College", state: "PA", notes: "LAC; moderate" },
  {
    name: "Franklin and Marshall College",
    state: "PA",
    notes: "LAC; moderate",
  },
  {
    name: "Lafayette College",
    state: "PA",
    notes: "LAC; moderate; engineering",
  },
  { name: "Wesleyan University", state: "CT", notes: "LAC; highly selective" },
  { name: "Denison University", state: "OH", notes: "LAC; moderate" },

  // ── National universities: humanities / social science / general ───────────
  {
    name: "George Washington University",
    state: "DC",
    notes: "private; political science/IR",
  },
  {
    name: "American University",
    state: "DC",
    notes: "private; political science/IR",
  },
  {
    name: "Syracuse University",
    state: "NY",
    notes: "private; comms/humanities",
  },
  { name: "Pepperdine University", state: "CA", notes: "private; moderate" },
  {
    name: "Santa Clara University",
    state: "CA",
    notes: "private; strong business/CS (Silicon Valley)",
  },
  { name: "University of Denver", state: "CO", notes: "private; moderate" },
  {
    name: "Loyola Marymount University",
    state: "CA",
    notes: "private; moderate",
  },
  {
    name: "Chapman University",
    state: "CA",
    notes: "private; strong film/arts",
  },

  // ── Moderately selective / safety-option publics (COVERAGE PRIORITY) ────────
  {
    name: "San Diego State University",
    state: "CA",
    notes: "safety public; CSU; single window",
  },
  {
    name: "University of Oregon",
    state: "OR",
    notes: "safety public flagship",
  },
  { name: "Oregon State University", state: "OR", notes: "safety public" },
  {
    name: "Washington State University",
    state: "WA",
    notes: "safety public; rolling",
  },
  {
    name: "University of Arizona",
    state: "AZ",
    notes: "safety public; rolling; large",
  },
  { name: "University of Utah", state: "UT", notes: "safety public flagship" },
  {
    name: "University of Kansas",
    state: "KS",
    notes: "safety public; rolling",
  },
  {
    name: "University of Nebraska-Lincoln",
    state: "NE",
    notes: "safety public; rolling",
  },
  {
    name: "University of Missouri-Columbia",
    state: "MO",
    notes: "safety public; rolling",
  },
  {
    name: "University of Oklahoma-Norman Campus",
    state: "OK",
    notes: "safety public",
  },
  {
    name: "University of Kentucky",
    state: "KY",
    notes: "safety public; rolling",
  },
  {
    name: "The University of Tennessee-Knoxville",
    state: "TN",
    notes: "moderate public flagship",
  },
  {
    name: "The University of Alabama",
    state: "AL",
    notes: "safety public; rolling; large scholarships",
  },
  {
    name: "Auburn University",
    state: "AL",
    notes: "moderate public; engineering",
  },
  {
    name: "University of South Carolina-Columbia",
    state: "SC",
    notes: "moderate public",
  },
  {
    name: "University of Cincinnati-Main Campus",
    state: "OH",
    notes: "safety public; co-op",
  },
  {
    name: "University of Houston",
    state: "TX",
    notes: "safety public; large; urban",
  },
  { name: "Texas Tech University", state: "TX", notes: "safety public" },
  {
    name: "University of Central Florida",
    state: "FL",
    notes: "safety public; very large",
  },
  { name: "University of South Florida", state: "FL", notes: "safety public" },
  {
    name: "Georgia State University",
    state: "GA",
    notes: "safety public; access-oriented; urban",
  },
  {
    name: "Iowa State University",
    state: "IA",
    notes: "safety public; engineering; rolling",
  },
  {
    name: "Colorado State University-Fort Collins",
    state: "CO",
    notes: "safety public",
  },
  {
    name: "University of Vermont",
    state: "VT",
    notes: "moderate public flagship",
  },
  {
    name: "Miami University-Oxford",
    state: "OH",
    notes: "moderate public; strong undergrad teaching",
  },

  // ── Regional / less-selective privates (safety coverage) ───────────────────
  {
    name: "DePaul University",
    state: "IL",
    notes: "safety private; large; urban",
  },
  { name: "Marquette University", state: "WI", notes: "moderate private" },
  {
    name: "Loyola University Chicago",
    state: "IL",
    notes: "moderate private; urban",
  },
  { name: "Gonzaga University", state: "WA", notes: "moderate private" },
  { name: "Elon University", state: "NC", notes: "moderate private" },
  {
    name: "Clark University",
    state: "MA",
    notes: "moderate private; social science/psych",
  },
  { name: "Hofstra University", state: "NY", notes: "safety private" },
  { name: "University of San Diego", state: "CA", notes: "moderate private" },
  { name: "Seattle University", state: "WA", notes: "safety private; urban" },
  {
    name: "Creighton University",
    state: "NE",
    notes: "moderate private; pre-health",
  },

  // ── HBCUs / access-oriented (broaden coverage) ─────────────────────────────
  { name: "Howard University", state: "DC", notes: "HBCU; selective private" },
  {
    name: "Spelman College",
    state: "GA",
    notes: "HBCU LAC; women's; selective",
  },
  { name: "Morehouse College", state: "GA", notes: "HBCU LAC; men's" },
  {
    name: "Florida Agricultural and Mechanical University",
    state: "FL",
    notes: "HBCU; public",
  },
  {
    name: "North Carolina A & T State University",
    state: "NC",
    notes: "HBCU; public; engineering",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V3 expansion (+100). Chosen to de-skew the dataset away from elite schools:
  // heavy on accessible public flagships, regional publics, and mid/less-
  // selective privates so chancing produces realistic target/likely/safety
  // options — plus geographic fill (every state that had 0 colleges: AK AR HI ID
  // MT MS ND NM NV SD WV WY) and program breadth (CS, engineering, business,
  // humanities/social science, liberal arts). Seeded by NAME + STATE only; the
  // ingester resolves each to an IPEDS unitid via Scorecard and logs the match.
  // Names below are best-effort Scorecard canonical names, corrected by the
  // --dry-run no-match/ambiguous report before the live run.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Flagship / large publics in previously-uncovered states (geo fill) ─────
  {
    name: "University of Arkansas",
    state: "AR",
    notes: "flagship public; geo fill AR",
  },
  {
    name: "University of Mississippi",
    state: "MS",
    notes: "flagship public; geo fill MS",
  },
  {
    name: "Mississippi State University",
    state: "MS",
    notes: "public; engineering/ag",
  },
  {
    name: "University of Hawaii at Manoa",
    state: "HI",
    notes: "flagship public; geo fill HI",
  },
  {
    name: "University of Idaho",
    state: "ID",
    notes: "flagship public; geo fill ID",
  },
  { name: "Boise State University", state: "ID", notes: "public; CS/business" },
  {
    name: "Montana State University",
    state: "MT",
    notes: "public; engineering; geo fill MT",
  },
  {
    name: "The University of Montana",
    state: "MT",
    notes: "public; humanities/forestry",
  },
  {
    name: "University of Nevada-Las Vegas",
    state: "NV",
    notes: "public; geo fill NV; hospitality",
  },
  {
    name: "University of Nevada-Reno",
    state: "NV",
    notes: "public; engineering/journalism",
  },
  {
    name: "University of New Mexico-Main Campus",
    state: "NM",
    notes: "flagship public; geo fill NM",
  },
  {
    name: "New Mexico State University-Main Campus",
    state: "NM",
    notes: "public; engineering/ag",
  },
  {
    name: "North Dakota State University-Main Campus",
    state: "ND",
    notes: "public; engineering; geo fill ND",
  },
  {
    name: "University of North Dakota",
    state: "ND",
    notes: "public; aviation/energy",
  },
  {
    name: "South Dakota State University",
    state: "SD",
    notes: "public; ag/engineering; geo fill SD",
  },
  {
    name: "University of South Dakota",
    state: "SD",
    notes: "public; business/health",
  },
  {
    name: "West Virginia University",
    state: "WV",
    notes: "flagship public; geo fill WV",
  },
  {
    name: "University of Wyoming",
    state: "WY",
    notes: "flagship public; geo fill WY; low COA",
  },
  {
    name: "University of Alaska Fairbanks",
    state: "AK",
    notes: "public; arctic research; geo fill AK",
  },
  {
    name: "University of Alaska Anchorage",
    state: "AK",
    notes: "public; access-oriented",
  },
  {
    name: "University of New Hampshire-Main Campus",
    state: "NH",
    notes: "flagship public; thin state",
  },
  {
    name: "University of Rhode Island",
    state: "RI",
    notes: "flagship public; thin state",
  },
  {
    name: "University of Maine",
    state: "ME",
    notes: "flagship public; thin state",
  },

  // ── Additional public universities / regional publics (target/safety) ──────
  {
    name: "University of Louisville",
    state: "KY",
    notes: "public; health/business",
  },
  {
    name: "Louisiana State University and Agricultural & Mechanical College",
    state: "LA",
    notes: "flagship public; thin state LA",
  },
  {
    name: "Oklahoma State University-Main Campus",
    state: "OK",
    notes: "public; engineering/ag",
  },
  {
    name: "University of Memphis",
    state: "TN",
    notes: "public; access-oriented; urban",
  },
  {
    name: "University of Alabama at Birmingham",
    state: "AL",
    notes: "public; health/CS; R1",
  },
  {
    name: "Kansas State University",
    state: "KS",
    notes: "public; engineering/ag",
  },
  {
    name: "Wichita State University",
    state: "KS",
    notes: "public; aerospace engineering",
  },
  {
    name: "University of Wisconsin-Milwaukee",
    state: "WI",
    notes: "public; access-oriented; urban",
  },
  {
    name: "Wayne State University",
    state: "MI",
    notes: "public; urban; health/medicine",
  },
  {
    name: "Western Michigan University",
    state: "MI",
    notes: "public; aviation/business",
  },
  {
    name: "Ohio University-Main Campus",
    state: "OH",
    notes: "public; journalism/business",
  },
  {
    name: "Kent State University at Kent",
    state: "OH",
    notes: "public; fashion/aeronautics",
  },
  {
    name: "Bowling Green State University-Main Campus",
    state: "OH",
    notes: "public; safety",
  },
  {
    name: "University of Illinois Chicago",
    state: "IL",
    notes: "public R1; CS/health; urban",
  },
  {
    name: "Portland State University",
    state: "OR",
    notes: "public; urban; access-oriented",
  },
  {
    name: "Western Washington University",
    state: "WA",
    notes: "public; environmental/education",
  },
  {
    name: "San Jose State University",
    state: "CA",
    notes: "public; CS; Silicon Valley pipeline",
  },
  {
    name: "San Francisco State University",
    state: "CA",
    notes: "public; access-oriented; urban",
  },
  {
    name: "California State University-Long Beach",
    state: "CA",
    notes: "public; engineering/business",
  },
  {
    name: "California State University-Fullerton",
    state: "CA",
    notes: "public; business/CS; large",
  },
  {
    name: "California State Polytechnic University-Pomona",
    state: "CA",
    notes: "public polytechnic; engineering",
  },
  {
    name: "University at Buffalo",
    state: "NY",
    notes: "public R1 (SUNY); engineering/CS",
  },
  {
    name: "Binghamton University",
    state: "NY",
    notes: "public (SUNY); selective; business",
  },
  {
    name: "University at Albany",
    state: "NY",
    notes: "public (SUNY); public policy/CS",
  },
  {
    name: "The College of New Jersey",
    state: "NJ",
    notes: "public; selective; engineering/business",
  },
  {
    name: "Montclair State University",
    state: "NJ",
    notes: "public; access-oriented",
  },
  {
    name: "George Mason University",
    state: "VA",
    notes: "public R1; CS/econ; large",
  },
  {
    name: "James Madison University",
    state: "VA",
    notes: "public; business/education",
  },
  {
    name: "Virginia Commonwealth University",
    state: "VA",
    notes: "public; arts/health; urban",
  },
  {
    name: "University of North Carolina at Charlotte",
    state: "NC",
    notes: "public; engineering/business; urban",
  },
  {
    name: "Appalachian State University",
    state: "NC",
    notes: "public; business/education",
  },
  {
    name: "East Carolina University",
    state: "NC",
    notes: "public; health/business; access-oriented",
  },
  {
    name: "Florida International University",
    state: "FL",
    notes: "public R1; CS/business; large HSI",
  },
  {
    name: "Florida Atlantic University",
    state: "FL",
    notes: "public; access-oriented",
  },
  {
    name: "The University of Texas at San Antonio",
    state: "TX",
    notes: "public; cybersecurity/business",
  },
  {
    name: "University of North Texas",
    state: "TX",
    notes: "public; music/business; large",
  },
  {
    name: "Texas State University",
    state: "TX",
    notes: "public; access-oriented; large",
  },
  {
    name: "The University of Texas at Arlington",
    state: "TX",
    notes: "public; engineering/nursing",
  },
  {
    name: "Kennesaw State University",
    state: "GA",
    notes: "public; business/CS; large",
  },
  {
    name: "Georgia Southern University",
    state: "GA",
    notes: "public; engineering/business",
  },
  {
    name: "University of Maryland-Baltimore County",
    state: "MD",
    notes: "public R1; CS; strong STEM",
  },
  {
    name: "Towson University",
    state: "MD",
    notes: "public; business/education",
  },
  {
    name: "College of Charleston",
    state: "SC",
    notes: "public LAC-style; humanities",
  },
  {
    name: "Northern Arizona University",
    state: "AZ",
    notes: "public; forestry/health",
  },
  {
    name: "Utah State University",
    state: "UT",
    notes: "public; engineering/ag",
  },
  {
    name: "University of Nebraska at Omaha",
    state: "NE",
    notes: "public; CS/business; urban",
  },

  // ── Liberal arts colleges (target/safety; humanities/social science/econ) ──
  {
    name: "Harvey Mudd College",
    state: "CA",
    notes: "LAC; elite engineering/CS (Claremont)",
  },
  {
    name: "Claremont McKenna College",
    state: "CA",
    notes: "LAC; econ/government (Claremont)",
  },
  {
    name: "Scripps College",
    state: "CA",
    notes: "LAC; women's; humanities (Claremont)",
  },
  {
    name: "Pitzer College",
    state: "CA",
    notes: "LAC; social sciences (Claremont)",
  },
  {
    name: "Trinity College",
    state: "CT",
    notes: "LAC; humanities/social science",
  },
  { name: "Connecticut College", state: "CT", notes: "LAC; humanities/arts" },
  { name: "Bard College", state: "NY", notes: "LAC; arts/humanities" },
  { name: "Sarah Lawrence College", state: "NY", notes: "LAC; writing/arts" },
  {
    name: "Union College",
    state: "NY",
    notes: "LAC; engineering + liberal arts",
  },
  { name: "St Olaf College", state: "MN", notes: "LAC; music/STEM" },
  { name: "Lawrence University", state: "WI", notes: "LAC + conservatory" },
  { name: "Beloit College", state: "WI", notes: "LAC; social science" },
  { name: "DePauw University", state: "IN", notes: "LAC; business/media" },
  { name: "Rhodes College", state: "TN", notes: "LAC; pre-health/humanities" },
  { name: "Centre College", state: "KY", notes: "LAC; humanities" },
  {
    name: "Willamette University",
    state: "OR",
    notes: "LAC; social science/business",
  },
  {
    name: "Lewis & Clark College",
    state: "OR",
    notes: "LAC; environmental/humanities",
  },
  {
    name: "The College of Wooster",
    state: "OH",
    notes: "LAC; research/mentoring",
  },

  // ── Mid-selective private universities (target/safety; business/eng/health) ─
  { name: "Bryant University", state: "RI", notes: "private; business focus" },
  {
    name: "Fairfield University",
    state: "CT",
    notes: "private Jesuit; business/nursing",
  },
  {
    name: "Providence College",
    state: "RI",
    notes: "private; humanities/business",
  },
  {
    name: "Quinnipiac University",
    state: "CT",
    notes: "private; health/business",
  },
  {
    name: "Drake University",
    state: "IA",
    notes: "private; business/pharmacy",
  },
  {
    name: "University of Dayton",
    state: "OH",
    notes: "private Catholic; engineering",
  },
  {
    name: "Duquesne University",
    state: "PA",
    notes: "private; health/business",
  },
  { name: "Belmont University", state: "TN", notes: "private; music business" },
  {
    name: "University of the Pacific",
    state: "CA",
    notes: "private; pharmacy/engineering",
  },
  {
    name: "Clarkson University",
    state: "NY",
    notes: "private; engineering/business",
  },
  {
    name: "Trinity University",
    state: "TX",
    notes: "private LAC-style; business/STEM",
  },
  {
    name: "Saint Louis University",
    state: "MO",
    notes: "private Jesuit; health/business",
  },
  {
    name: "Brigham Young University",
    state: "UT",
    notes: "private; business/CS; large",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V4 expansion (+100). Same rules as V1–V3: seeded by NAME + STATE only; the
  // Scorecard ingester resolves each to an IPEDS unitid (exact canonical-name +
  // state match) and logs it for verification. Chosen to (a) add categories the
  // dataset lacked — service academies, art/design & comms specialists, more
  // HBCUs, CUNY/CSU access-oriented publics — and (b) keep widening the
  // target/likely/safety band with regional publics and mid-selective privates
  // across more of the country. `notes` records the selectivity band + why the
  // school is here, never app facts. Names are best-effort Scorecard canonical
  // names, corrected by the --dry-run no-match/ambiguous report before the live
  // run. Deliberate edge cases the schema already handles (name collisions
  // disambiguated by state): Wheaton College IL vs MA, Cornell College IA vs
  // Cornell University NY, University of St Thomas MN vs TX.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Highly selective / selective not yet covered ───────────────────────────
  {
    name: "Washington and Lee University",
    state: "VA",
    notes: "highly selective private LAC-style; ED",
  },
  {
    name: "College of the Holy Cross",
    state: "MA",
    notes: "selective private; Jesuit LAC-style",
  },
  {
    name: "Bryn Mawr College",
    state: "PA",
    notes: "LAC; women's; highly selective (Seven Sisters)",
  },
  {
    name: "The Cooper Union for the Advancement of Science and Art",
    state: "NY",
    notes: "selective; engineering/art/architecture",
  },
  {
    name: "Franklin W Olin College of Engineering",
    state: "MA",
    notes: "elite undergraduate engineering",
  },
  {
    name: "United States Military Academy",
    state: "NY",
    notes: "service academy; selective; West Point",
  },
  {
    name: "United States Naval Academy",
    state: "MD",
    notes: "service academy; selective",
  },
  {
    name: "United States Air Force Academy",
    state: "CO",
    notes: "service academy; selective",
  },

  // ── Arts / comms / design specialists ──────────────────────────────────────
  {
    name: "Emerson College",
    state: "MA",
    notes: "selective private; communication/arts",
  },
  {
    name: "Ithaca College",
    state: "NY",
    notes: "private; communications/media/music",
  },
  {
    name: "Rhode Island School of Design",
    state: "RI",
    notes: "top art/design school",
  },
  {
    name: "Pratt Institute-Main",
    state: "NY",
    notes: "private; art/design/architecture",
  },
  {
    name: "Savannah College of Art and Design",
    state: "GA",
    notes: "private; art/design; large",
  },
  {
    name: "Maryland Institute College of Art",
    state: "MD",
    notes: "private; art/design",
  },
  {
    name: "The New School",
    state: "NY",
    notes: "private; design (Parsons)/social science; urban",
  },
  {
    name: "Berklee College of Music",
    state: "MA",
    notes: "private; contemporary music",
  },

  // ── Engineering / tech specialists ─────────────────────────────────────────
  {
    name: "Embry-Riddle Aeronautical University-Daytona Beach",
    state: "FL",
    notes: "private tech; aviation/aerospace",
  },
  {
    name: "Florida Institute of Technology",
    state: "FL",
    notes: "private tech; engineering/aerospace",
  },
  {
    name: "Milwaukee School of Engineering",
    state: "WI",
    notes: "private; engineering; co-op",
  },
  {
    name: "Kettering University",
    state: "MI",
    notes: "private; engineering; co-op",
  },
  {
    name: "South Dakota School of Mines and Technology",
    state: "SD",
    notes: "public tech; engineering",
  },
  {
    name: "Wentworth Institute of Technology",
    state: "MA",
    notes: "private; engineering/technology; co-op",
  },

  // ── HBCUs (broaden coverage) ───────────────────────────────────────────────
  {
    name: "Hampton University",
    state: "VA",
    notes: "HBCU; selective private",
  },
  {
    name: "Tuskegee University",
    state: "AL",
    notes: "HBCU; private; engineering",
  },
  {
    name: "Xavier University of Louisiana",
    state: "LA",
    notes: "HBCU; private; pre-health powerhouse",
  },
  {
    name: "Morgan State University",
    state: "MD",
    notes: "HBCU; public R2; engineering",
  },
  { name: "Jackson State University", state: "MS", notes: "HBCU; public" },
  {
    name: "Tennessee State University",
    state: "TN",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Prairie View A & M University",
    state: "TX",
    notes: "HBCU; public; engineering",
  },
  {
    name: "North Carolina Central University",
    state: "NC",
    notes: "HBCU; public",
  },

  // ── Liberal arts colleges (selective → mid) ────────────────────────────────
  { name: "Wabash College", state: "IN", notes: "LAC; men's; selective" },
  { name: "Hillsdale College", state: "MI", notes: "LAC; selective" },
  {
    name: "Berea College",
    state: "KY",
    notes: "LAC; no-tuition/work-study; selective",
  },
  { name: "Kalamazoo College", state: "MI", notes: "LAC; selective" },
  { name: "Hope College", state: "MI", notes: "LAC; moderate" },
  {
    name: "Wheaton College",
    state: "IL",
    notes: "LAC; Christian; moderate",
  },
  {
    name: "Wheaton College (Massachusetts)",
    state: "MA",
    notes: "LAC; moderate",
  },
  {
    name: "Agnes Scott College",
    state: "GA",
    notes: "LAC; women's; moderate",
  },
  { name: "Muhlenberg College", state: "PA", notes: "LAC; moderate" },
  { name: "Allegheny College", state: "PA", notes: "LAC; moderate" },
  {
    name: "Gustavus Adolphus College",
    state: "MN",
    notes: "LAC; moderate",
  },
  { name: "Knox College", state: "IL", notes: "LAC; moderate" },
  {
    name: "Cornell College",
    state: "IA",
    notes: "LAC; moderate (name collision: Cornell University NY)",
  },
  { name: "Wofford College", state: "SC", notes: "LAC; moderate" },
  {
    name: "Hobart William Smith Colleges",
    state: "NY",
    notes: "LAC; moderate",
  },
  { name: "Goucher College", state: "MD", notes: "LAC; less selective" },

  // ── Religious / mid-selective private universities ─────────────────────────
  {
    name: "University of San Francisco",
    state: "CA",
    notes: "private Jesuit; urban; moderate",
  },
  {
    name: "Seton Hall University",
    state: "NJ",
    notes: "private Catholic; business/health",
  },
  {
    name: "Saint Joseph's University - Philadelphia",
    state: "PA",
    notes: "private Jesuit; business",
  },
  {
    name: "University of Scranton",
    state: "PA",
    notes: "private Jesuit; health/business",
  },
  {
    name: "John Carroll University",
    state: "OH",
    notes: "private Jesuit; moderate",
  },
  {
    name: "University of St Thomas",
    state: "MN",
    notes: "private Catholic; business (name collision: TX)",
  },
  {
    name: "University of Portland",
    state: "OR",
    notes: "private Catholic; engineering/nursing",
  },
  {
    name: "Loyola University Maryland",
    state: "MD",
    notes: "private Jesuit; business",
  },
  {
    name: "Sacred Heart University",
    state: "CT",
    notes: "private Catholic; health/business",
  },
  {
    name: "University of Tulsa",
    state: "OK",
    notes: "private; energy/engineering",
  },
  {
    name: "Xavier University",
    state: "OH",
    notes: "private Jesuit; business/health (distinct from Xavier of LA)",
  },
  {
    name: "Stonehill College",
    state: "MA",
    notes: "private Catholic LAC-style; moderate",
  },

  // ── CSU campuses (access-oriented publics; CA) ─────────────────────────────
  {
    name: "California State University-Sacramento",
    state: "CA",
    notes: "public CSU; access-oriented",
  },
  {
    name: "California State University-Northridge",
    state: "CA",
    notes: "public CSU; large; access-oriented",
  },
  {
    name: "California State University-Fresno",
    state: "CA",
    notes: "public CSU; access-oriented",
  },
  {
    name: "California State University-Chico",
    state: "CA",
    notes: "public CSU; moderate",
  },
  {
    name: "California State University-San Marcos",
    state: "CA",
    notes: "public CSU; access-oriented",
  },
  {
    name: "California State University-East Bay",
    state: "CA",
    notes: "public CSU; urban; access-oriented",
  },

  // ── CUNY campuses (urban access-oriented publics; NY) ──────────────────────
  {
    name: "CUNY Bernard M Baruch College",
    state: "NY",
    notes: "public CUNY; selective; business",
  },
  {
    name: "CUNY Hunter College",
    state: "NY",
    notes: "public CUNY; moderate; urban",
  },
  {
    name: "CUNY City College",
    state: "NY",
    notes: "public CUNY; engineering; urban",
  },
  {
    name: "CUNY Queens College",
    state: "NY",
    notes: "public CUNY; access-oriented; urban",
  },
  {
    name: "CUNY Brooklyn College",
    state: "NY",
    notes: "public CUNY; access-oriented; urban",
  },

  // ── SUNY additional ────────────────────────────────────────────────────────
  {
    name: "SUNY College at Geneseo",
    state: "NY",
    notes: "public SUNY; selective LAC-style",
  },
  {
    name: "State University of New York at New Paltz",
    state: "NY",
    notes: "public SUNY; moderate",
  },
  {
    name: "SUNY College of Environmental Science and Forestry",
    state: "NY",
    notes: "public SUNY; environmental/forestry",
  },

  // ── Regional / access-oriented publics (geo + safety coverage) ─────────────
  {
    name: "University of Massachusetts-Lowell",
    state: "MA",
    notes: "public; engineering/CS",
  },
  {
    name: "University of Massachusetts-Boston",
    state: "MA",
    notes: "public; urban; access-oriented",
  },
  {
    name: "Old Dominion University",
    state: "VA",
    notes: "public; engineering; access-oriented",
  },
  {
    name: "Christopher Newport University",
    state: "VA",
    notes: "public LAC-style; moderate",
  },
  {
    name: "University of North Carolina at Greensboro",
    state: "NC",
    notes: "public; access-oriented",
  },
  {
    name: "University of North Carolina Wilmington",
    state: "NC",
    notes: "public; moderate; coastal",
  },
  {
    name: "Western Carolina University",
    state: "NC",
    notes: "public; access-oriented",
  },
  {
    name: "University of Alabama in Huntsville",
    state: "AL",
    notes: "public; engineering/aerospace",
  },
  {
    name: "University of South Alabama",
    state: "AL",
    notes: "public; health/access-oriented",
  },
  {
    name: "University of Toledo",
    state: "OH",
    notes: "public; engineering/health",
  },
  {
    name: "Cleveland State University",
    state: "OH",
    notes: "public; urban; access-oriented",
  },
  {
    name: "Wright State University-Main Campus",
    state: "OH",
    notes: "public; engineering; access-oriented",
  },
  {
    name: "University of Colorado Denver/Anschutz Medical Campus",
    state: "CO",
    notes: "public; urban; access-oriented",
  },
  {
    name: "University of Missouri-Kansas City",
    state: "MO",
    notes: "public; urban; health",
  },
  {
    name: "University of New Orleans",
    state: "LA",
    notes: "public; urban; access-oriented",
  },
  {
    name: "The University of Texas at El Paso",
    state: "TX",
    notes: "public; HSI; access-oriented",
  },
  {
    name: "Texas Woman's University",
    state: "TX",
    notes: "public; health/nursing",
  },
  {
    name: "University of Northern Iowa",
    state: "IA",
    notes: "public; education/business",
  },
  {
    name: "Ball State University",
    state: "IN",
    notes: "public; architecture/communications",
  },
  {
    name: "Illinois State University",
    state: "IL",
    notes: "public; education/business",
  },
  {
    name: "Northern Illinois University",
    state: "IL",
    notes: "public; access-oriented",
  },
  {
    name: "University of Wisconsin-Eau Claire",
    state: "WI",
    notes: "public; moderate",
  },
  {
    name: "Grand Valley State University",
    state: "MI",
    notes: "public; health/business; access-oriented",
  },
  {
    name: "University of North Florida",
    state: "FL",
    notes: "public; moderate",
  },
  {
    name: "Sam Houston State University",
    state: "TX",
    notes: "public; criminal justice; access-oriented",
  },
  {
    name: "Middle Tennessee State University",
    state: "TN",
    notes: "public; aerospace/media; access-oriented",
  },
  {
    name: "Western Kentucky University",
    state: "KY",
    notes: "public; access-oriented",
  },
  {
    name: "Marshall University",
    state: "WV",
    notes: "public; access-oriented; second WV school",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V5 expansion (+100). Same rules as V1–V4: seeded by NAME + STATE only; the
  // Scorecard ingester resolves each to an IPEDS unitid (exact canonical-name +
  // state match) and logs it for verification. Chosen to (a) deepen categories
  // still thin in the set — more HBCUs, CSU/CUNY/SUNY access campuses, PASSHE
  // and other regional-public systems — and (b) keep widening the
  // target/likely/safety band across states. `notes` records the selectivity
  // band + why the school is here, never app facts. Names are best-effort
  // Scorecard canonical names, corrected by the --dry-run no-match/ambiguous
  // report before the live run.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── HBCUs not yet covered ──────────────────────────────────────────────────
  {
    name: "Bethune-Cookman University",
    state: "FL",
    notes: "HBCU; private; access-oriented",
  },
  {
    name: "Alabama A & M University",
    state: "AL",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Alabama State University",
    state: "AL",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Clark Atlanta University",
    state: "GA",
    notes: "HBCU; private; AUC member",
  },
  {
    name: "Fisk University",
    state: "TN",
    notes: "HBCU; private; selective LAC",
  },
  {
    name: "Dillard University",
    state: "LA",
    notes: "HBCU; private; access-oriented",
  },
  {
    name: "Grambling State University",
    state: "LA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Southern University and A & M College",
    state: "LA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Norfolk State University",
    state: "VA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Virginia State University",
    state: "VA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Texas Southern University",
    state: "TX",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Delaware State University",
    state: "DE",
    notes: "HBCU; public; access-oriented",
  },

  // ── CSU access campuses ────────────────────────────────────────────────────
  {
    name: "California State University-Bakersfield",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },
  {
    name: "California State University-Dominguez Hills",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },
  {
    name: "California State University-Los Angeles",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },
  {
    name: "California State University-San Bernardino",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },
  {
    name: "California State University-Stanislaus",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },
  {
    name: "Sonoma State University",
    state: "CA",
    notes: "public; CSU; moderate",
  },
  {
    name: "California State University-Monterey Bay",
    state: "CA",
    notes: "public; CSU; access-oriented",
  },

  // ── CUNY campuses not yet covered ──────────────────────────────────────────
  {
    name: "CUNY John Jay College of Criminal Justice",
    state: "NY",
    notes: "public; CUNY; criminal justice",
  },
  {
    name: "CUNY Lehman College",
    state: "NY",
    notes: "public; CUNY; access-oriented",
  },
  {
    name: "College of Staten Island CUNY",
    state: "NY",
    notes: "public; CUNY; access-oriented",
  },

  // ── PASSHE (Pennsylvania) regional publics ─────────────────────────────────
  {
    name: "West Chester University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; moderate",
  },
  {
    name: "Shippensburg University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; access-oriented",
  },
  {
    name: "Millersville University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; access-oriented",
  },
  {
    name: "Kutztown University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; access-oriented",
  },
  {
    name: "Indiana University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; access-oriented",
  },

  // ── New Jersey regional publics ────────────────────────────────────────────
  { name: "Rowan University", state: "NJ", notes: "public; moderate" },
  { name: "Kean University", state: "NJ", notes: "public; access-oriented" },
  {
    name: "Ramapo College of New Jersey",
    state: "NJ",
    notes: "public; moderate",
  },
  {
    name: "Stockton University",
    state: "NJ",
    notes: "public; access-oriented",
  },

  // ── New England regional publics ───────────────────────────────────────────
  {
    name: "University of Massachusetts-Dartmouth",
    state: "MA",
    notes: "public; UMass; access-oriented",
  },
  {
    name: "Bridgewater State University",
    state: "MA",
    notes: "public; access-oriented",
  },
  {
    name: "Central Connecticut State University",
    state: "CT",
    notes: "public; CSCU; access-oriented",
  },
  {
    name: "Southern Connecticut State University",
    state: "CT",
    notes: "public; CSCU; access-oriented",
  },
  {
    name: "Keene State College",
    state: "NH",
    notes: "public; access-oriented",
  },
  {
    name: "Rhode Island College",
    state: "RI",
    notes: "public; access-oriented",
  },

  // ── Southeast regional publics ─────────────────────────────────────────────
  {
    name: "Coastal Carolina University",
    state: "SC",
    notes: "public; moderate",
  },
  { name: "Winthrop University", state: "SC", notes: "public; moderate" },
  {
    name: "Citadel Military College of South Carolina",
    state: "SC",
    notes: "public; senior military college",
  },
  {
    name: "University of North Carolina Asheville",
    state: "NC",
    notes: "public; UNC; liberal-arts focus",
  },
  {
    name: "University of North Carolina at Pembroke",
    state: "NC",
    notes: "public; UNC; access-oriented",
  },
  {
    name: "East Tennessee State University",
    state: "TN",
    notes: "public; access-oriented",
  },
  {
    name: "Tennessee Technological University",
    state: "TN",
    notes: "public; engineering/tech; moderate",
  },
  { name: "Radford University", state: "VA", notes: "public; access-oriented" },
  { name: "Longwood University", state: "VA", notes: "public; moderate" },
  {
    name: "University of Mary Washington",
    state: "VA",
    notes: "public; liberal-arts focus; moderate",
  },

  // ── Georgia / Florida regional publics ─────────────────────────────────────
  {
    name: "Valdosta State University",
    state: "GA",
    notes: "public; access-oriented",
  },
  {
    name: "Georgia College & State University",
    state: "GA",
    notes: "public liberal-arts university; moderate",
  },
  {
    name: "University of North Georgia",
    state: "GA",
    notes: "public; senior military college option; moderate",
  },
  {
    name: "University of West Florida",
    state: "FL",
    notes: "public; access-oriented",
  },
  {
    name: "Florida Gulf Coast University",
    state: "FL",
    notes: "public; access-oriented",
  },
  {
    name: "University of West Georgia",
    state: "GA",
    notes: "public; access-oriented",
  },

  // ── Midwest regional publics ───────────────────────────────────────────────
  {
    name: "Eastern Michigan University",
    state: "MI",
    notes: "public; access-oriented",
  },
  {
    name: "Central Michigan University",
    state: "MI",
    notes: "public; access-oriented",
  },
  { name: "Oakland University", state: "MI", notes: "public; moderate" },
  {
    name: "Southern Illinois University-Carbondale",
    state: "IL",
    notes: "public; access-oriented",
  },
  {
    name: "Southern Illinois University Edwardsville",
    state: "IL",
    notes: "public; access-oriented",
  },
  {
    name: "Missouri State University-Springfield",
    state: "MO",
    notes: "public; access-oriented",
  },
  {
    name: "University of Central Missouri",
    state: "MO",
    notes: "public; access-oriented",
  },
  {
    name: "Indiana State University",
    state: "IN",
    notes: "public; access-oriented",
  },
  {
    name: "University of Wisconsin-La Crosse",
    state: "WI",
    notes: "public; moderate",
  },
  {
    name: "University of Wisconsin-Oshkosh",
    state: "WI",
    notes: "public; access-oriented",
  },
  {
    name: "University of Wisconsin-Whitewater",
    state: "WI",
    notes: "public; business; access-oriented",
  },
  {
    name: "Minnesota State University-Mankato",
    state: "MN",
    notes: "public; access-oriented",
  },

  // ── Plains / Mountain regional publics ─────────────────────────────────────
  {
    name: "Saint Cloud State University",
    state: "MN",
    notes: "public; access-oriented",
  },
  {
    name: "University of Minnesota-Duluth",
    state: "MN",
    notes: "public; moderate",
  },
  {
    name: "University of Nebraska at Kearney",
    state: "NE",
    notes: "public; access-oriented",
  },
  {
    name: "Fort Hays State University",
    state: "KS",
    notes: "public; access-oriented",
  },
  {
    name: "Metropolitan State University of Denver",
    state: "CO",
    notes: "public; access-oriented",
  },
  {
    name: "University of Northern Colorado",
    state: "CO",
    notes: "public; education; access-oriented",
  },

  // ── West regional publics ──────────────────────────────────────────────────
  {
    name: "Weber State University",
    state: "UT",
    notes: "public; access-oriented",
  },
  {
    name: "Utah Valley University",
    state: "UT",
    notes: "public; access-oriented",
  },
  { name: "Southern Utah University", state: "UT", notes: "public; moderate" },
  {
    name: "Idaho State University",
    state: "ID",
    notes: "public; access-oriented",
  },
  {
    name: "Eastern Washington University",
    state: "WA",
    notes: "public; access-oriented",
  },
  {
    name: "Central Washington University",
    state: "WA",
    notes: "public; access-oriented",
  },
  {
    name: "The Evergreen State College",
    state: "WA",
    notes: "public; nontraditional liberal-arts; access-oriented",
  },
  {
    name: "Western Oregon University",
    state: "OR",
    notes: "public; access-oriented",
  },

  // ── Texas regional publics ─────────────────────────────────────────────────
  {
    name: "Texas A & M University-Corpus Christi",
    state: "TX",
    notes: "public; access-oriented",
  },
  {
    name: "Texas A&M University-Kingsville",
    state: "TX",
    notes: "public; access-oriented",
  },
  {
    name: "Stephen F Austin State University",
    state: "TX",
    notes: "public; access-oriented",
  },
  { name: "Lamar University", state: "TX", notes: "public; access-oriented" },
  {
    name: "The University of Texas Rio Grande Valley",
    state: "TX",
    notes: "public; UT system; access-oriented",
  },
  {
    name: "Tarleton State University",
    state: "TX",
    notes: "public; Texas A&M system; access-oriented",
  },

  // ── Louisiana / Deep South regional publics ────────────────────────────────
  {
    name: "University of Louisiana at Lafayette",
    state: "LA",
    notes: "public; access-oriented",
  },
  {
    name: "University of Louisiana at Monroe",
    state: "LA",
    notes: "public; access-oriented",
  },
  {
    name: "University of Southern Mississippi",
    state: "MS",
    notes: "public; access-oriented",
  },

  // ── Kentucky regional publics ──────────────────────────────────────────────
  {
    name: "Eastern Kentucky University",
    state: "KY",
    notes: "public; access-oriented",
  },
  {
    name: "Murray State University",
    state: "KY",
    notes: "public; moderate",
  },

  // ── Selective / distinctive privates not yet covered ───────────────────────
  {
    name: "The University of the South",
    state: "TN",
    notes: "private LAC; selective; Episcopal",
  },
  {
    name: "St Lawrence University",
    state: "NY",
    notes: "private LAC; moderate-selective",
  },
  { name: "Mercer University", state: "GA", notes: "private; moderate" },
  {
    name: "Samford University",
    state: "AL",
    notes: "private; Christian; moderate",
  },
  {
    name: "Yeshiva University",
    state: "NY",
    notes: "private; Jewish; selective",
  },

  // ── SUNY comprehensive colleges ────────────────────────────────────────────
  {
    name: "State University of New York at Oswego",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },
  {
    name: "State University of New York at Cortland",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },
  {
    name: "State University of New York at Plattsburgh",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },
  {
    name: "SUNY Oneonta",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },
  {
    name: "SUNY Buffalo State University",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V6 expansion (+100). Same rules as V1–V5: seeded by NAME + STATE only; the
  // Scorecard ingester resolves each to an IPEDS unitid (exact canonical-name +
  // state match) and logs it for verification. Chosen to (a) deepen categories
  // still thin in the set — more HBCUs, women's colleges, Catholic/Jesuit and
  // large-Christian universities, military/maritime academies, art/music/design
  // specialists, and additional SUNY campuses — and (b) keep widening the
  // target/likely/safety band with regional publics across more states. `notes`
  // records the selectivity band + why the school is here, never app facts.
  // Names are best-effort Scorecard canonical names, corrected by the --dry-run
  // no-match/ambiguous report before the live run. Deliberate collisions the
  // schema handles by state: Saint Mary's College (IN) vs Saint Mary's College
  // of California; University of Dallas (TX) vs The University of Texas at
  // Dallas; Regis University (CO) vs Regis College (MA, not seeded).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── HBCUs not yet covered ──────────────────────────────────────────────────
  {
    name: "Fayetteville State University",
    state: "NC",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Winston-Salem State University",
    state: "NC",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "South Carolina State University",
    state: "SC",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Albany State University",
    state: "GA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Savannah State University",
    state: "GA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Fort Valley State University",
    state: "GA",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Bowie State University",
    state: "MD",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Alcorn State University",
    state: "MS",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Langston University",
    state: "OK",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Central State University",
    state: "OH",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Kentucky State University",
    state: "KY",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Johnson C Smith University",
    state: "NC",
    notes: "HBCU; private; access-oriented",
  },

  // ── Women's colleges & distinctive LACs ────────────────────────────────────
  {
    name: "Simmons University",
    state: "MA",
    notes: "private; women's undergrad; health/nursing",
  },
  {
    name: "Meredith College",
    state: "NC",
    notes: "private; women's; moderate",
  },
  {
    name: "Hollins University",
    state: "VA",
    notes: "private; women's; LAC; moderate",
  },
  {
    name: "Saint Mary's College",
    state: "IN",
    notes: "private; women's; LAC (collision: Saint Mary's of CA)",
  },
  { name: "Hendrix College", state: "AR", notes: "LAC; selective" },
  { name: "Millsaps College", state: "MS", notes: "LAC; moderate" },
  { name: "Berry College", state: "GA", notes: "LAC; moderate; large campus" },
  { name: "Ursinus College", state: "PA", notes: "LAC; moderate" },
  { name: "Juniata College", state: "PA", notes: "LAC; moderate; pre-health" },
  {
    name: "Earlham College",
    state: "IN",
    notes: "LAC; moderate; Quaker heritage",
  },

  // ── More liberal-arts colleges (mid band) ──────────────────────────────────
  { name: "Roanoke College", state: "VA", notes: "LAC; moderate" },
  { name: "Randolph-Macon College", state: "VA", notes: "LAC; moderate" },
  {
    name: "Hampden-Sydney College",
    state: "VA",
    notes: "LAC; men's; moderate",
  },
  { name: "Coe College", state: "IA", notes: "LAC; moderate" },
  { name: "Luther College", state: "IA", notes: "LAC; moderate; music" },
  { name: "Wittenberg University", state: "OH", notes: "LAC; moderate" },
  { name: "Ohio Wesleyan University", state: "OH", notes: "LAC; moderate" },
  {
    name: "Susquehanna University",
    state: "PA",
    notes: "LAC; moderate; business/writing",
  },
  {
    name: "Washington & Jefferson College",
    state: "PA",
    notes: "LAC; moderate; pre-health",
  },
  {
    name: "Saint Michael's College",
    state: "VT",
    notes: "private Catholic LAC-style; moderate",
  },

  // ── Selective / mid national privates not covered ──────────────────────────
  {
    name: "Rollins College",
    state: "FL",
    notes: "private; LAC-style; business/arts",
  },
  {
    name: "Stetson University",
    state: "FL",
    notes: "private; music/business; moderate",
  },
  {
    name: "Butler University",
    state: "IN",
    notes: "private; business/pharmacy; moderate",
  },
  {
    name: "Valparaiso University",
    state: "IN",
    notes: "private Lutheran; engineering; moderate",
  },
  {
    name: "Adelphi University",
    state: "NY",
    notes: "private; nursing/business; access-oriented",
  },
  {
    name: "Marist University",
    state: "NY",
    notes:
      "private; comms/business; moderate (renamed 2024 from Marist College)",
  },
  {
    name: "Siena University",
    state: "NY",
    notes: "private Franciscan LAC; moderate (renamed 2024 from Siena College)",
  },
  {
    name: "St. John's University-New York",
    state: "NY",
    notes: "private Catholic; large; urban",
  },
  {
    name: "Pace University",
    state: "NY",
    notes: "private; business/performing arts; urban",
  },
  {
    name: "The Catholic University of America",
    state: "DC",
    notes: "private Catholic; architecture/politics",
  },

  // ── Catholic / Jesuit / Christian universities not covered ─────────────────
  {
    name: "Canisius University",
    state: "NY",
    notes: "private Jesuit; moderate",
  },
  {
    name: "Le Moyne College",
    state: "NY",
    notes: "private Jesuit; moderate",
  },
  {
    name: "Saint Peter's University",
    state: "NJ",
    notes: "private Jesuit; access-oriented; urban",
  },
  {
    name: "Loyola University New Orleans",
    state: "LA",
    notes: "private Jesuit; music/business (distinct from Loyola Chicago/MD)",
  },
  {
    name: "Rockhurst University",
    state: "MO",
    notes: "private Jesuit; pre-health; moderate",
  },
  {
    name: "Regis University",
    state: "CO",
    notes: "private Jesuit; access-oriented (collision: Regis College MA)",
  },
  {
    name: "Saint Mary's College of California",
    state: "CA",
    notes: "private Catholic LAC-style; business",
  },
  {
    name: "University of Dallas",
    state: "TX",
    notes: "private Catholic; great-books core (distinct from UT Dallas)",
  },
  {
    name: "Assumption University",
    state: "MA",
    notes: "private Catholic; moderate",
  },
  {
    name: "Salve Regina University",
    state: "RI",
    notes: "private Catholic; coastal; moderate",
  },

  // ── Large Christian / religious universities ───────────────────────────────
  {
    name: "Liberty University",
    state: "VA",
    notes: "private Christian; very large; access-oriented",
  },
  {
    name: "Grand Canyon University",
    state: "AZ",
    notes: "private Christian; very large; access-oriented",
  },
  {
    name: "Abilene Christian University",
    state: "TX",
    notes: "private Christian; moderate",
  },
  {
    name: "Biola University",
    state: "CA",
    notes: "private Christian; moderate",
  },
  {
    name: "Calvin University",
    state: "MI",
    notes: "private Christian LAC-style; moderate",
  },
  {
    name: "Brigham Young University-Idaho",
    state: "ID",
    notes: "private; large; access-oriented (distinct from BYU-Provo)",
  },

  // ── Military / maritime academies (thin category) ──────────────────────────
  {
    name: "United States Coast Guard Academy",
    state: "CT",
    notes: "service academy; selective; no application fee",
  },
  {
    name: "United States Merchant Marine Academy",
    state: "NY",
    notes: "service academy; selective; maritime",
  },
  {
    name: "Virginia Military Institute",
    state: "VA",
    notes: "public; senior military college; engineering",
  },
  {
    name: "Norwich University",
    state: "VT",
    notes: "private; senior military college; oldest",
  },
  {
    name: "Massachusetts Maritime Academy",
    state: "MA",
    notes: "public; maritime; engineering",
  },
  {
    name: "SUNY Maritime College",
    state: "NY",
    notes: "public; SUNY; maritime; engineering",
  },

  // ── Art / music / design specialists ───────────────────────────────────────
  {
    name: "School of the Art Institute of Chicago",
    state: "IL",
    notes: "private; top art/design; portfolio",
  },
  {
    name: "California Institute of the Arts",
    state: "CA",
    notes: "private; art/film/music; portfolio/audition",
  },
  {
    name: "Fashion Institute of Technology",
    state: "NY",
    notes: "public (SUNY-affiliated); fashion/design; portfolio",
  },
  {
    name: "Columbia College Chicago",
    state: "IL",
    notes: "private; film/media/arts; access-oriented",
  },
  {
    name: "Ringling College of Art and Design",
    state: "FL",
    notes: "private; art/design/animation; portfolio",
  },
  {
    name: "The New England Conservatory of Music",
    state: "MA",
    notes: "private; music conservatory; audition",
  },
  {
    name: "Art Center College of Design",
    state: "CA",
    notes: "private; industrial/transportation design; portfolio",
  },

  // ── Engineering / tech specialists not covered ─────────────────────────────
  {
    name: "New Mexico Institute of Mining and Technology",
    state: "NM",
    notes: "public tech; engineering/geoscience; small",
  },
  {
    name: "Oregon Institute of Technology",
    state: "OR",
    notes: "public tech; engineering/health; hands-on",
  },
  {
    name: "Lawrence Technological University",
    state: "MI",
    notes: "private tech; engineering/architecture",
  },
  {
    name: "Embry-Riddle Aeronautical University-Prescott",
    state: "AZ",
    notes: "private tech; aviation/aerospace (distinct from Daytona)",
  },
  {
    name: "Montana Technological University",
    state: "MT",
    notes: "public tech; engineering/mining",
  },

  // ── SUNY campuses not yet covered ──────────────────────────────────────────
  {
    name: "SUNY at Fredonia",
    state: "NY",
    notes: "public; SUNY; music/education; access-oriented",
  },
  {
    name: "SUNY College at Potsdam",
    state: "NY",
    notes: "public; SUNY; music (Crane); access-oriented",
  },
  {
    name: "SUNY Brockport",
    state: "NY",
    notes: "public; SUNY; access-oriented",
  },
  {
    name: "SUNY at Purchase College",
    state: "NY",
    notes: "public; SUNY; arts/conservatory + liberal arts",
  },
  {
    name: "Farmingdale State College",
    state: "NY",
    notes: "public; SUNY; applied tech/engineering",
  },

  // ── Additional regional publics (selective → access) ───────────────────────
  {
    name: "Truman State University",
    state: "MO",
    notes: "public liberal-arts university; selective; honors-style",
  },
  {
    name: "New College of Florida",
    state: "FL",
    notes: "public honors LAC; narrative evaluations",
  },
  {
    name: "University of Montevallo",
    state: "AL",
    notes: "public liberal-arts university; moderate",
  },
  {
    name: "The University of Tennessee-Chattanooga",
    state: "TN",
    notes: "public; engineering/business; access-oriented",
  },
  {
    name: "Salisbury University",
    state: "MD",
    notes: "public; business/education; moderate",
  },
  {
    name: "University of Wisconsin-Stevens Point",
    state: "WI",
    notes: "public; natural resources; access-oriented",
  },
  {
    name: "Winona State University",
    state: "MN",
    notes: "public; nursing/education; access-oriented",
  },
  {
    name: "Ferris State University",
    state: "MI",
    notes: "public; applied tech/pharmacy; access-oriented",
  },
  {
    name: "University of Central Arkansas",
    state: "AR",
    notes: "public; access-oriented",
  },
  {
    name: "Arkansas State University",
    state: "AR",
    notes: "public; access-oriented (distinct from U of Arkansas)",
  },
  {
    name: "Louisiana Tech University",
    state: "LA",
    notes: "public; engineering/business; moderate",
  },
  {
    name: "Salem State University",
    state: "MA",
    notes: "public; access-oriented; urban",
  },

  // ── More access-oriented publics (widen safety band) ───────────────────────
  {
    name: "Rutgers University-Newark",
    state: "NJ",
    notes: "public R2; diverse; urban (distinct from New Brunswick)",
  },
  {
    name: "William Paterson University of New Jersey",
    state: "NJ",
    notes: "public; access-oriented",
  },
  {
    name: "Slippery Rock University of Pennsylvania",
    state: "PA",
    notes: "public; PASSHE; access-oriented",
  },
  {
    name: "University of Akron Main Campus",
    state: "OH",
    notes: "public; polymer engineering; access-oriented",
  },
  {
    name: "Western Illinois University",
    state: "IL",
    notes: "public; access-oriented",
  },
  {
    name: "Angelo State University",
    state: "TX",
    notes: "public; Texas Tech system; access-oriented",
  },
  {
    name: "Troy University",
    state: "AL",
    notes: "public; large; access-oriented",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V7 expansion (+100). Same rules as V1–V6: seeded by NAME + STATE only; the
  // Scorecard ingester resolves each to an IPEDS unitid (exact canonical-name +
  // state match) and logs it for verification. Chosen to (a) add categories the
  // set was thin on — distinctive/experimental liberal-arts colleges, more
  // women's colleges and HBCUs, additional Catholic/Christian universities,
  // specialized STEM institutes, and audition/portfolio conservatories & art
  // schools (which exercise the new college_application_tracks layer) — and (b)
  // keep widening the target/likely band with regional privates and additional
  // public campuses across more states. `notes` records the selectivity band +
  // why the school is here, never application facts. Names are best-effort
  // Scorecard canonical names, corrected by the --dry-run no-match/ambiguous
  // report before the live run. State disambiguates deliberate collisions the
  // schema handles: St John's College (MD, Great Books) vs the two existing
  // Saint Mary's; Union University (TN) vs the existing Union College (NY);
  // Lincoln University of Pennsylvania (HBCU) vs other Lincolns.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Distinctive / experimental liberal-arts colleges ───────────────────────
  {
    name: "St. John's College",
    state: "MD",
    notes: "LAC; distinctive Great Books curriculum (no majors/departments)",
  },
  {
    name: "Bennington College",
    state: "VT",
    notes: "LAC; distinctive; arts-strong",
  },
  {
    name: "Hampshire College",
    state: "MA",
    notes: "LAC; distinctive self-designed curriculum; Five College consortium",
  },
  {
    name: "College of the Atlantic",
    state: "ME",
    notes: "LAC; distinctive single major (human ecology)",
  },
  { name: "Guilford College", state: "NC", notes: "LAC; Quaker heritage" },
  { name: "Lake Forest College", state: "IL", notes: "LAC" },
  { name: "Ripon College", state: "WI", notes: "LAC" },
  { name: "Albion College", state: "MI", notes: "LAC" },
  { name: "Alma College", state: "MI", notes: "LAC" },
  {
    name: "Saint Norbert College",
    state: "WI",
    notes: "LAC; Catholic (Norbertine)",
  },
  { name: "Wartburg College", state: "IA", notes: "LAC; Lutheran" },
  { name: "Whittier College", state: "CA", notes: "LAC; Hispanic-Serving" },
  { name: "Westmont College", state: "CA", notes: "LAC; Christian" },
  {
    name: "Soka University of America",
    state: "CA",
    notes: "LAC; distinctive small; all students study abroad",
  },
  { name: "University of Puget Sound", state: "WA", notes: "LAC" },
  { name: "Whitworth University", state: "WA", notes: "LAC; Christian" },
  {
    name: "Eckerd College",
    state: "FL",
    notes: "LAC; distinctive marine science",
  },
  {
    name: "Washington College",
    state: "MD",
    notes: "LAC; historic (chartered 1782)",
  },
  { name: "McDaniel College", state: "MD", notes: "LAC" },
  { name: "Augustana College", state: "IL", notes: "LAC; Lutheran heritage" },

  // ── Women's colleges ───────────────────────────────────────────────────────
  { name: "Salem College", state: "NC", notes: "women's college; historic" },
  {
    name: "Sweet Briar College",
    state: "VA",
    notes: "women's college; distinctive engineering (ABET) at a women's LAC",
  },
  { name: "Stephens College", state: "MO", notes: "women's college" },

  // ── HBCUs not yet covered ──────────────────────────────────────────────────
  {
    name: "Bennett College",
    state: "NC",
    notes: "HBCU; women's college; private; access-oriented",
  },
  {
    name: "Tougaloo College",
    state: "MS",
    notes: "HBCU; private; access-oriented",
  },
  { name: "Claflin University", state: "SC", notes: "HBCU; private" },
  {
    name: "Wilberforce University",
    state: "OH",
    notes: "HBCU; private; historic (oldest private HBCU)",
  },
  {
    name: "Lincoln University",
    state: "PA",
    notes: "HBCU; public; historic (first degree-granting HBCU)",
  },
  {
    name: "Elizabeth City State University",
    state: "NC",
    notes: "HBCU; public; access-oriented",
  },
  {
    name: "Virginia Union University",
    state: "VA",
    notes: "HBCU; private; access-oriented",
  },
  {
    name: "Talladega College",
    state: "AL",
    notes: "HBCU; private; historic; access-oriented",
  },

  // ── Catholic / Christian universities ──────────────────────────────────────
  { name: "Manhattan University", state: "NY", notes: "Catholic (Lasallian)" },
  { name: "Spring Hill College", state: "AL", notes: "Catholic (Jesuit)" },
  {
    name: "Saint Anselm College",
    state: "NH",
    notes: "Catholic (Benedictine) LAC",
  },
  { name: "Benedictine College", state: "KS", notes: "Catholic (Benedictine)" },
  {
    name: "University of Detroit Mercy",
    state: "MI",
    notes: "Catholic (Jesuit/Mercy); B.Arch. offered",
  },
  {
    name: "Mount St. Mary's University",
    state: "MD",
    notes: "Catholic; historic",
  },
  {
    name: "Franciscan University of Steubenville",
    state: "OH",
    notes: "Catholic; distinctive orthodox-Catholic character",
  },
  {
    name: "Lipscomb University",
    state: "TN",
    notes: "Christian (Churches of Christ)",
  },
  {
    name: "Saint Edward's University",
    state: "TX",
    notes: "Catholic (Holy Cross)",
  },

  // ── Strong / distinctive public universities ───────────────────────────────
  {
    name: "University of Missouri-St Louis",
    state: "MO",
    notes: "public; urban; access-oriented",
  },
  {
    name: "University of Colorado Colorado Springs",
    state: "CO",
    notes: "public; access-oriented",
  },
  {
    name: "University of Wisconsin-Stout",
    state: "WI",
    notes: "public; polytechnic (Wisconsin's Polytechnic University)",
  },
  {
    name: "University of Minnesota-Morris",
    state: "MN",
    notes: "public liberal-arts college (rare public LAC)",
  },
  {
    name: "University of Michigan-Dearborn",
    state: "MI",
    notes: "public; regional U-M campus; access-oriented",
  },
  {
    name: "California State Polytechnic University-Humboldt",
    state: "CA",
    notes: "public; polytechnic; distinctive natural-resources programs",
  },
  {
    name: "SUNY Polytechnic Institute",
    state: "NY",
    notes: "public; STEM-focused; SUNY system",
  },
  {
    name: "Fort Lewis College",
    state: "CO",
    notes: "public LAC; distinctive Native American tuition waiver",
  },
  {
    name: "University of Wisconsin-Green Bay",
    state: "WI",
    notes: "public; access-oriented",
  },
  {
    name: "Emporia State University",
    state: "KS",
    notes: "public; access-oriented",
  },
  {
    name: "Pittsburg State University",
    state: "KS",
    notes: "public; distinctive technology programs; access-oriented",
  },
  {
    name: "St. Mary's College of Maryland",
    state: "MD",
    notes: "public honors college (public LAC)",
  },
  {
    name: "Georgia Gwinnett College",
    state: "GA",
    notes: "public; open-access; access-oriented",
  },
  {
    name: "The University of Texas at Tyler",
    state: "TX",
    notes: "public; UT System; access-oriented",
  },

  // ── Specialized STEM institutes ────────────────────────────────────────────
  {
    name: "Webb Institute",
    state: "NY",
    notes: "STEM; distinctive single degree (naval architecture & marine eng.)",
  },
  {
    name: "DigiPen Institute of Technology",
    state: "WA",
    notes: "STEM; distinctive game/simulation programming & digital arts",
  },
  {
    name: "Florida Polytechnic University",
    state: "FL",
    notes: "public; STEM-only (Florida's polytechnic)",
  },
  {
    name: "Vaughn College of Aeronautics and Technology",
    state: "NY",
    notes: "STEM; distinctive aeronautics/aviation; access-oriented",
  },

  // ── Audition / portfolio conservatories & art schools (tracks layer) ───────
  {
    name: "The Juilliard School",
    state: "NY",
    notes: "conservatory; audition/portfolio; divisions admit separately",
  },
  {
    name: "Curtis Institute of Music",
    state: "PA",
    notes:
      "conservatory; audition; extremely selective; full-tuition scholarships",
  },
  {
    name: "Manhattan School of Music",
    state: "NY",
    notes: "conservatory; audition",
  },
  {
    name: "San Francisco Conservatory of Music",
    state: "CA",
    notes: "conservatory; audition",
  },
  {
    name: "California College of the Arts",
    state: "CA",
    notes: "art & design school; portfolio",
  },
  {
    name: "Otis College of Art and Design",
    state: "CA",
    notes: "art & design school; portfolio",
  },
  {
    name: "Massachusetts College of Art and Design",
    state: "MA",
    notes: "art & design school; portfolio; public (rare public independent)",
  },
  {
    name: "Cleveland Institute of Art",
    state: "OH",
    notes: "art & design school; portfolio",
  },

  // ── Regional / comprehensive private & public universities (breadth) ───────
  { name: "Roger Williams University", state: "RI", notes: "regional private" },
  { name: "Suffolk University", state: "MA", notes: "regional private; urban" },
  {
    name: "Merrimack College",
    state: "MA",
    notes: "regional private; Catholic",
  },
  {
    name: "Western New England University",
    state: "MA",
    notes: "regional private; engineering + pharmacy",
  },
  { name: "Endicott College", state: "MA", notes: "regional private" },
  { name: "Iona University", state: "NY", notes: "regional private; Catholic" },
  {
    name: "St. John Fisher University",
    state: "NY",
    notes: "regional private; Catholic",
  },
  { name: "Wagner College", state: "NY", notes: "regional private" },
  { name: "Nazareth University", state: "NY", notes: "regional private" },
  { name: "Rider University", state: "NJ", notes: "regional private" },
  { name: "Monmouth University", state: "NJ", notes: "regional private" },
  { name: "Arcadia University", state: "PA", notes: "regional private" },
  {
    name: "La Salle University",
    state: "PA",
    notes: "regional private; Catholic (Lasallian)",
  },
  { name: "Widener University", state: "PA", notes: "regional private" },
  {
    name: "Marywood University",
    state: "PA",
    notes: "regional private; Catholic",
  },
  {
    name: "Bradley University",
    state: "IL",
    notes:
      "regional private; distinct undergraduate colleges (university-wide admission)",
  },
  { name: "North Central College", state: "IL", notes: "regional private" },
  { name: "Elmhurst University", state: "IL", notes: "regional private" },
  { name: "Millikin University", state: "IL", notes: "regional private" },
  {
    name: "Baldwin Wallace University",
    state: "OH",
    notes: "regional private",
  },
  { name: "Otterbein University", state: "OH", notes: "regional private" },
  {
    name: "Ohio Northern University",
    state: "OH",
    notes: "regional private; pharmacy + engineering",
  },
  { name: "University of Evansville", state: "IN", notes: "regional private" },
  { name: "Drury University", state: "MO", notes: "regional private" },
  { name: "Webster University", state: "MO", notes: "regional private" },
  { name: "Carroll University", state: "WI", notes: "regional private" },
  { name: "High Point University", state: "NC", notes: "regional private" },
  {
    name: "Queens University of Charlotte",
    state: "NC",
    notes: "regional private",
  },
  {
    name: "Union University",
    state: "TN",
    notes: "regional private; Christian (Baptist)",
  },
  {
    name: "Christian Brothers University",
    state: "TN",
    notes: "regional private; Catholic (Lasallian)",
  },
  {
    name: "Palm Beach Atlantic University",
    state: "FL",
    notes: "regional private; Christian",
  },
  {
    name: "Dallas Baptist University",
    state: "TX",
    notes: "regional private; Christian",
  },
  {
    name: "Seattle Pacific University",
    state: "WA",
    notes: "regional private; Christian",
  },
  {
    name: "Pacific Lutheran University",
    state: "WA",
    notes: "regional private; Lutheran",
  },
];
