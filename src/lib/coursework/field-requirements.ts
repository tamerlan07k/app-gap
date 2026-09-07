// Field preparation patterns — PURE reference data. For each intended field, the
// GENERAL academic-preparation areas that field tends to reward, from broadly
// understood patterns — NOT any specific college's requirements. AppGap stores no
// verified per-college coursework requirements, so this file NEVER encodes "X
// college requires Y", and the `whyGeneral` text is always phrased as a general
// field pattern.
//
// This is intentionally field-specific rather than one universal checklist: a
// computer-science applicant and a humanities applicant see different, relevant
// areas. `universallyAvailable` marks the few foundations offered at essentially
// every high school (English, a general math sequence, social studies) — only
// those can ever become a "potential gap" when absent, because for them access
// is not realistically in question. Specific advanced courses are never assumed
// available (see opportunity.ts).

import type { FieldKey } from "~/lib/academic-interests";
import type { PreparationArea } from "./types";

// Shorthand builders keep the table readable.
const core = (
  key: string,
  label: string,
  subjectArea: PreparationArea["subjectArea"],
  topic: string | null,
  universallyAvailable: boolean,
  whyGeneral: string,
): PreparationArea => ({
  key,
  label,
  subjectArea,
  topic,
  importance: "core",
  universallyAvailable,
  whyGeneral,
});

const rec = (
  key: string,
  label: string,
  subjectArea: PreparationArea["subjectArea"],
  topic: string | null,
  universallyAvailable: boolean,
  whyGeneral: string,
): PreparationArea => ({
  key,
  label,
  subjectArea,
  topic,
  importance: "recommended",
  universallyAvailable,
  whyGeneral,
});

const sup = (
  key: string,
  label: string,
  subjectArea: PreparationArea["subjectArea"],
  topic: string | null,
  universallyAvailable: boolean,
  whyGeneral: string,
): PreparationArea => ({
  key,
  label,
  subjectArea,
  topic,
  importance: "supporting",
  universallyAvailable,
  whyGeneral,
});

const WRITING = sup(
  "writing",
  "Advanced writing / English",
  "english",
  "english",
  true,
  "Clear reading and writing are valued across every field, including technical ones.",
);

const FIELD_PREPARATION: Record<FieldKey, PreparationArea[]> = {
  cs: [
    core(
      "cs-calculus",
      "Calculus",
      "math",
      "calculus",
      false,
      "Calculus and strong quantitative reasoning underpin algorithms, theory, and machine learning in college CS.",
    ),
    core(
      "cs-computing",
      "Computer science coursework",
      "computer-science",
      "computer-science",
      false,
      "Prior programming or CS coursework shows sustained interest and eases the move into a rigorous CS curriculum.",
    ),
    rec(
      "cs-statistics",
      "Statistics",
      "math",
      "statistics",
      false,
      "Statistics and probability are foundational to data science, machine learning, and empirical CS work.",
    ),
    rec(
      "cs-physics",
      "Physics",
      "science",
      "physics",
      false,
      "Physics builds the mathematical modeling and problem-solving habits many CS programs value.",
    ),
    WRITING,
  ],
  engineering: [
    core(
      "eng-calculus",
      "Calculus",
      "math",
      "calculus",
      false,
      "Calculus is the mathematical backbone of virtually all engineering coursework.",
    ),
    core(
      "eng-physics",
      "Physics",
      "science",
      "physics",
      false,
      "Physics is central to engineering fundamentals across every discipline.",
    ),
    rec(
      "eng-chemistry",
      "Chemistry",
      "science",
      "chemistry",
      false,
      "Chemistry supports materials, chemical, and biomedical engineering foundations.",
    ),
    rec(
      "eng-computing",
      "Computer science",
      "computer-science",
      "computer-science",
      false,
      "Programming is increasingly part of modern engineering practice.",
    ),
    WRITING,
  ],
  "bio-premed": [
    core(
      "bio-biology",
      "Biology",
      "science",
      "biology",
      true,
      "Biology is the foundation of health-science and pre-med preparation.",
    ),
    core(
      "bio-chemistry",
      "Chemistry",
      "science",
      "chemistry",
      true,
      "Chemistry, including organic concepts, is central to pre-med and life-science study.",
    ),
    rec(
      "bio-statistics",
      "Statistics",
      "math",
      "statistics",
      false,
      "Statistics supports research literacy and is expected in many health-science programs.",
    ),
    rec(
      "bio-physics",
      "Physics",
      "science",
      "physics",
      false,
      "Physics rounds out the quantitative-science base pre-med tracks build on.",
    ),
    WRITING,
  ],
  "math-physics": [
    core(
      "mp-calculus",
      "Calculus",
      "math",
      "calculus",
      false,
      "Advanced calculus is the core of a mathematics, physics, or statistics trajectory.",
    ),
    core(
      "mp-physics",
      "Physics",
      "science",
      "physics",
      false,
      "Physics is central to the physical-sciences path and reinforces mathematical modeling.",
    ),
    rec(
      "mp-multivariable",
      "Post-AP mathematics",
      "math",
      "multivariable-calculus",
      false,
      "Multivariable calculus or linear algebra, where available, signals exceptional quantitative depth.",
    ),
    rec(
      "mp-computing",
      "Computer science",
      "computer-science",
      "computer-science",
      false,
      "Computational tools are increasingly integral to mathematics and physics.",
    ),
    WRITING,
  ],
  business: [
    rec(
      "bus-calculus",
      "Calculus",
      "math",
      "calculus",
      false,
      "Quantitative methods, including calculus, support finance and economics coursework.",
    ),
    rec(
      "bus-statistics",
      "Statistics",
      "math",
      "statistics",
      false,
      "Statistics underpins the data-driven analysis business and economics rely on.",
    ),
    rec(
      "bus-economics",
      "Economics",
      "social-studies",
      "economics",
      false,
      "Prior economics coursework shows early, direct engagement with the field.",
    ),
    core(
      "bus-writing",
      "Writing / English",
      "english",
      "english",
      true,
      "Business and economics reward clear written communication and structured argument.",
    ),
  ],
  polisci: [
    core(
      "pol-history",
      "History / social studies",
      "social-studies",
      "history",
      true,
      "History and social-science coursework build the context central to political science and international relations.",
    ),
    core(
      "pol-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Political science rewards strong reading, writing, and argumentation.",
    ),
    rec(
      "pol-language",
      "World language",
      "world-language",
      "world-language",
      false,
      "A world language supports international relations and comparative study.",
    ),
    sup(
      "pol-statistics",
      "Statistics",
      "math",
      "statistics",
      false,
      "Quantitative methods increasingly matter in political-science research.",
    ),
  ],
  psych: [
    core(
      "psy-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Psychology rewards strong reading and clear writing.",
    ),
    rec(
      "psy-biology",
      "Biology",
      "science",
      "biology",
      true,
      "Biology supports the neuroscience and physiological side of psychology.",
    ),
    rec(
      "psy-statistics",
      "Statistics",
      "math",
      "statistics",
      false,
      "Statistics is essential to psychological research methods.",
    ),
    sup(
      "psy-social",
      "Psychology / social science",
      "social-studies",
      "psychology",
      false,
      "Prior psychology or social-science coursework shows early interest in the field.",
    ),
  ],
  humanities: [
    core(
      "hum-english",
      "Advanced English / literature",
      "english",
      "english",
      true,
      "Advanced English and literature are the core of humanities preparation.",
    ),
    core(
      "hum-history",
      "History",
      "social-studies",
      "history",
      true,
      "History and social studies build the analytical and contextual depth humanities study rewards.",
    ),
    rec(
      "hum-language",
      "World language",
      "world-language",
      "world-language",
      false,
      "A world language deepens humanistic and cross-cultural study.",
    ),
  ],
  design: [
    core(
      "des-arts",
      "Arts / studio coursework",
      "arts",
      "arts",
      false,
      "A sustained arts sequence is central to design and arts preparation and portfolio-building.",
    ),
    rec(
      "des-math",
      "Mathematics",
      "math",
      null,
      true,
      "Mathematics supports the technical side of architecture and design.",
    ),
    sup(
      "des-physics",
      "Physics",
      "science",
      "physics",
      false,
      "Physics supports structural and architectural understanding.",
    ),
    WRITING,
  ],
  education: [
    core(
      "edu-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Strong communication is central to teaching and the study of education.",
    ),
    rec(
      "edu-social",
      "Social studies",
      "social-studies",
      "history",
      true,
      "Social-science coursework supports education and public-policy paths.",
    ),
    rec(
      "edu-math",
      "Mathematics",
      "math",
      null,
      true,
      "Quantitative literacy supports teaching across subjects.",
    ),
  ],
  law: [
    core(
      "law-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Reading closely and writing persuasively are central to legal study.",
    ),
    core(
      "law-history",
      "History",
      "social-studies",
      "history",
      true,
      "History and government build the analytical context pre-law rewards.",
    ),
    rec(
      "law-government",
      "Government / politics",
      "social-studies",
      "government",
      false,
      "Government and politics coursework shows early engagement with legal and civic questions.",
    ),
  ],
  // Undecided / other: a BALANCED breadth set with NO core areas, so an
  // undecided student is never told they have a "gap" — only strengths, breadth
  // to keep open, and optional opportunities.
  undecided: [
    rec(
      "und-math",
      "Mathematics",
      "math",
      null,
      true,
      "A solid math sequence keeps quantitative options open.",
    ),
    rec(
      "und-science",
      "Science",
      "science",
      null,
      true,
      "Science coursework keeps STEM pathways open.",
    ),
    rec(
      "und-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Strong English supports essentially every field.",
    ),
    sup(
      "und-social",
      "Social studies",
      "social-studies",
      "history",
      true,
      "Social studies builds broad analytical context.",
    ),
    sup(
      "und-language",
      "World language",
      "world-language",
      "world-language",
      false,
      "A world language broadens options and is valued across fields.",
    ),
  ],
  other: [
    rec(
      "oth-math",
      "Mathematics",
      "math",
      null,
      true,
      "A solid math sequence keeps quantitative options open.",
    ),
    rec(
      "oth-science",
      "Science",
      "science",
      null,
      true,
      "Science coursework keeps STEM pathways open.",
    ),
    rec(
      "oth-english",
      "Advanced English",
      "english",
      "english",
      true,
      "Strong English supports essentially every field.",
    ),
    sup(
      "oth-social",
      "Social studies",
      "social-studies",
      "history",
      true,
      "Social studies builds broad analytical context.",
    ),
  ],
};

/** General preparation areas for a field (never college-specific requirements). */
export function preparationAreasForField(
  fieldKey: FieldKey,
): PreparationArea[] {
  return FIELD_PREPARATION[fieldKey] ?? FIELD_PREPARATION.undecided;
}
