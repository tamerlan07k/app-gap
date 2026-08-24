// "Why this school might fit you" composer — PURE, no DB, no network, no LLM.
//
// Builds the Section-3 narrative on the dedicated college page. It leads with the
// REAL REASONS a school might fit — campus vibe, campus life, diversity,
// opportunities, career — from the human-verified fit facets, then ties them to
// what the student actually studies and does. It deliberately does NOT restate
// the admission chance here (that already lives in the assessment panel and on
// the card) — "your chance is X%" is not a reason a school fits.
//
// Never generic praise, never invented school facts: prose facets appear only
// when human-verified; otherwise we say what's coming rather than fabricate it.
//
// Deliberately deferred (do NOT add until the data exists — see the page TODO):
//   • distance-from-home (needs the student's residence location)
//   • affordability / tuition fit (needs the student's financial situation)

import type { FieldFit } from "./types";

/** One activity as this composer needs it (a subset of the student's row). */
export interface StudentActivity {
  category: string;
  name: string;
  leadershipRole: string | null;
}

export interface StudentFitContext {
  /** Intended-field label already resolved (e.g. "Computer Science / AI"), or null. */
  majorLabel: string | null;
  careerInterest: string | null;
  activities: StudentActivity[];
}

/** Human-verified, source-attributed college fit facets. All optional; only
 * non-null AND verified facets are ever rendered. */
export interface CollegeFitFacets {
  setting: string | null; // urban | suburban | town | rural (from structured data)
  campusLife: string | null;
  diversity: string | null;
  opportunities: string | null;
  vibe: string | null;
  careerFit: string | null;
  /** True only when the prose facets (campusLife/…/careerFit) are human-verified. */
  verified: boolean;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/** Friendly noun phrase for an activity category (falls back to its label). */
function categoryNoun(category: string): string {
  const map: Record<string, string> = {
    sports: "athletics",
    clubs: "clubs and organizations",
    volunteering: "community service",
    research: "research",
    internship: "internships",
    work: "work experience",
    "personal-project": "a personal project",
    business: "entrepreneurship",
    arts: "the arts",
    competitions: "competitions",
    cultural: "cultural involvement",
    "student-gov": "student government",
  };
  return map[category] ?? category.replace(/-/g, " ") ?? "your activities";
}

/** Join phrases as "a, b, and c". */
function humanList(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/**
 * Compose the fit narrative as an ordered list of short paragraphs. It LEADS with
 * the real reasons a school might fit (verified facets + setting), then connects
 * them to the student's field and activities. It never restates the admission
 * chance. Every sentence is a verified college facet or grounded student data;
 * when we lack verified campus detail we say so instead of inventing it.
 */
export function buildFitNarrative(args: {
  collegeName: string;
  fieldFit: FieldFit | null;
  student: StudentFitContext | null;
  facets: CollegeFitFacets;
}): string[] {
  const { collegeName, fieldFit, student, facets } = args;
  const points: string[] = [];

  // 1. The real reasons FIRST — verified campus qualities (vibe, campus life,
  //    diversity, opportunities, career). Only rendered when human-verified.
  if (facets.verified) {
    for (const s of [
      facets.vibe,
      facets.campusLife,
      facets.diversity,
      facets.opportunities,
      facets.careerFit,
    ]) {
      if (s) points.push(s);
    }
  }

  // 2. Structured setting fact (verified separately from the prose facets).
  if (facets.setting) {
    points.push(
      `${collegeName} is ${article(facets.setting)} ${facets.setting} campus.`,
    );
  }

  // 3. Connect to the student's intended field (+ how the school rates for it,
  //    only when that field-fit data is verified).
  if (student?.majorLabel) {
    let s = `You're planning to study ${student.majorLabel}`;
    s += student.careerInterest
      ? ` with an eye toward ${student.careerInterest}.`
      : ".";
    if (fieldFit?.hasData) {
      s += ` For that field, ${collegeName} is rated ${fieldFit.rating}.`;
    }
    points.push(s);
  }

  // 4. The student's OWN activities → what they'd continue / grow here. We name
  //    what they actually do; the advice is honest and claims no unverified
  //    school specifics.
  if (student && student.activities.length > 0) {
    const cats = [...new Set(student.activities.map((a) => a.category))];
    const nouns = cats.slice(0, 3).map(categoryNoun);
    const hasProject = cats.includes("personal-project");
    const hasResearch = cats.includes("research");
    const hasLeadership = student.activities.some((a) => a.leadershipRole);

    let s = `You bring ${humanList(nouns)}`;
    s += hasLeadership ? ", including a leadership role" : "";
    s += `. Look for the teams, clubs, and programs at ${collegeName} where you can keep that going`;
    if (hasProject || hasResearch) {
      s += ` and take ${hasProject ? "your project" : "your research"} further in a new environment`;
    }
    s += ".";
    points.push(s);
  }

  // 5. Honest note about what isn't verified yet (only when prose facets are
  //    still missing) — never fabricate campus life / diversity / career detail.
  if (!facets.verified) {
    points.push(
      `More on ${collegeName}'s campus life, community, and career opportunities will appear here as we add verified detail.`,
    );
  }

  return points;
}
