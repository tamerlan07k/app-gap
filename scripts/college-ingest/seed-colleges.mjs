// College seed list (181 = V1 ~53 + V2 +128).
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
];
