// My Roadmap — the approved milestone library. This is the ONLY source of valid
// milestones and destination routes. The generation call may select, order, and
// explain these; it can never invent milestones or routes outside this set.
//
// Each destination is a real, existing in-app route (see KNOWN_ROUTES, asserted
// by the tests). Grade applicability and deterministic eligibility predicates
// keep the plan realistic: a senior with two weeks left never gets "explore new
// awards", and testing is handled without ever auto-recommending a retake.

import type { MilestoneTemplate, RoadmapContext } from "./types";

/** Every route a milestone may point at. Tests assert each template.href is in
 *  this set, and that each route corresponds to an existing page. */
export const KNOWN_ROUTES = new Set<string>([
  "/dashboard/profile",
  "/dashboard/profile/coursework",
  "/dashboard/profile/awards",
  "/dashboard/profile/activities",
  "/dashboard/application-writing",
  "/dashboard/application-writing/personal-statement",
  "/dashboard/application-writing/supplemental-essays",
  "/dashboard/application-writing/activity-additional-info",
  "/dashboard/roadmaps",
]);

const isSenior = (ctx: RoadmapContext) =>
  ctx.stage === "senior" || ctx.stage === "applying";

export const MILESTONE_LIBRARY: MilestoneTemplate[] = [
  // ─── Academics ─────────────────────────────────────────────────────────────
  {
    id: "acad-coursework",
    branch: "academics",
    title: "Review your coursework & rigor",
    description:
      "Analyze what your course path communicates — rigor, major preparation, and genuine gaps vs. opportunities.",
    why: "Course rigor is one of the most consistently weighted parts of an application. Understanding where your path is strong (and where it has real, still-fillable gaps) tells you what to prioritize next.",
    href: "/dashboard/profile/coursework",
    actionLabel: "Open Coursework analysis",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "You've reviewed your coursework analysis.",
    order: 1,
  },
  {
    id: "acad-grades",
    branch: "academics",
    title: "Review your GPA & grade trends",
    description:
      "Confirm your GPA and grades are entered accurately and look at your trend over time.",
    why: "An upward trend and an accurate record give the rest of your plan a reliable foundation. This is about making sure what's on record is correct — not about explaining away every grade.",
    href: "/dashboard/profile",
    actionLabel: "Review profile",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "Your GPA and grades are entered and reviewed.",
    order: 2,
  },
  {
    id: "acad-testing-plan",
    branch: "academics",
    title: "Plan your SAT/ACT testing",
    description:
      "Decide whether and when to test, and set a preparation plan with the time you have before application season.",
    why: "A clear testing plan — chosen for your situation, not by default — keeps your options open. A strong score can help at test-requiring schools; there's no benefit to testing you don't need.",
    href: "/dashboard/profile",
    actionLabel: "Review testing in profile",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    // Planning/preparing is for students with runway (underclassmen + juniors).
    grades: [9, 10, 11],
    completionCriteria: "You've set a testing plan or decided not to test.",
    order: 3,
  },
  {
    id: "acad-testing-decision",
    branch: "academics",
    title: "Decide on score submission",
    description:
      "Review your current scores against each college's testing policy and time remaining, and decide where (if anywhere) to submit.",
    why: "By senior year the useful question is whether to submit the scores you have, given each school's policy and your profile — not whether to keep retaking. Confirm each college's current policy on its official admissions page; policies change year to year.",
    href: "/dashboard/profile",
    actionLabel: "Review scores",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: true,
    grades: [12, 13],
    completionCriteria:
      "You've decided, per college, whether to submit your scores.",
    order: 3,
  },
  {
    id: "acad-readiness",
    branch: "academics",
    title: "Check your academic application readiness",
    description:
      "Run or revisit your AppGap Analysis to see where your academic profile stands overall.",
    why: "A whole-profile read shows how your academics come together and where the most valuable next move is — so your effort goes where it actually changes your application.",
    href: "/dashboard/roadmaps",
    actionLabel: "Open My Analysis",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "You've reviewed a current AppGap Analysis.",
    order: 4,
  },

  // ─── Essays ────────────────────────────────────────────────────────────────
  {
    id: "essay-requirements",
    branch: "essays",
    title: "Identify required essays & deadlines",
    description:
      "List the personal statement and supplemental essays each of your colleges requires, with their deadlines.",
    why: "You can't plan writing you haven't mapped. Knowing exactly what's due — and when — is the difference between a calm season and a scramble.",
    href: "/dashboard/application-writing/supplemental-essays",
    actionLabel: "Map required essays",
    prerequisites: [],
    importance: "required",
    deadlineSensitive: true,
    grades: [11, 12, 13],
    completionCriteria: "You've listed every required essay and its deadline.",
    order: 1,
  },
  {
    id: "essay-personal-statement",
    branch: "essays",
    title: "Develop your personal statement",
    description:
      "Draft and refine your main personal statement with structured, line-level coaching.",
    why: "The personal statement is the one essay nearly every college reads. It's where your voice carries the application, so it's worth the most careful work.",
    href: "/dashboard/application-writing/personal-statement",
    actionLabel: "Open Personal Statement",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [11, 12, 13],
    completionCriteria: "You have a strong, revised personal statement draft.",
    order: 2,
  },
  {
    id: "essay-supplements",
    branch: "essays",
    title: "Draft & revise supplemental essays",
    description:
      "Work through each college's supplements, checking they add something new rather than repeating the rest of your application.",
    why: "Supplements are where fit is shown. Essays that each add a distinct angle — and avoid redundancy — make a stronger, more coherent application.",
    href: "/dashboard/application-writing/supplemental-essays",
    actionLabel: "Open Supplemental Essays",
    prerequisites: ["essay-requirements"],
    importance: "recommended",
    deadlineSensitive: true,
    grades: [12, 13],
    completionCriteria:
      "Your supplemental essays are drafted and revised per college.",
    order: 3,
  },
  {
    id: "essay-final-check",
    branch: "essays",
    title: "Final writing & completeness check",
    description:
      "Do a last pass for completeness, consistency, and mechanics across all your essays before you submit.",
    why: "A final review catches the small misses — a wrong college name, an over-limit response — that are entirely avoidable and easy to miss when you're close to the work.",
    href: "/dashboard/application-writing",
    actionLabel: "Open Application Writing",
    prerequisites: ["essay-personal-statement"],
    importance: "recommended",
    deadlineSensitive: true,
    grades: [12, 13],
    completionCriteria: "You've completed a final review of every essay.",
    order: 4,
    eligible: isSenior,
  },

  // ─── Awards ────────────────────────────────────────────────────────────────
  {
    id: "awards-review",
    branch: "awards",
    title: "Review your awards & recognition",
    description:
      "See what your recognition collectively demonstrates and where the genuine gaps are.",
    why: "Knowing what your awards already show stops you from chasing recognition you don't need and highlights any real, still-reachable gap.",
    href: "/dashboard/profile/awards",
    actionLabel: "Open Awards",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "You've reviewed your Recognition Map.",
    order: 1,
  },
  {
    id: "awards-details",
    branch: "awards",
    title: "Complete missing award details",
    description:
      "Verify each award's name, date, level, and a short description so nothing is vague or incomplete.",
    why: "An award an admissions reader can't interpret does little for you. Accurate names, levels, and dates make each one count.",
    href: "/dashboard/profile/awards",
    actionLabel: "Edit awards",
    prerequisites: ["awards-review"],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "Every award has a complete, accurate entry.",
    order: 2,
    eligible: (ctx) => ctx.awardCount > 0,
  },
  {
    id: "awards-prioritize",
    branch: "awards",
    title: "Prioritize awards for limited space",
    description:
      "Choose which awards to feature in the limited space the application gives you.",
    why: "Applications cap how many awards you can list. Leading with the most significant, relevant ones makes the space work harder.",
    href: "/dashboard/profile/awards",
    actionLabel: "Prioritize awards",
    prerequisites: ["awards-review"],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [11, 12, 13],
    completionCriteria: "You've chosen which awards to feature.",
    order: 3,
    eligible: (ctx) => ctx.awardCount > 0,
  },
  {
    id: "awards-explore",
    branch: "awards",
    title: "Explore recognition opportunities",
    description:
      "Look at real competitions and programs that could add a genuinely new dimension — only if the timing is realistic for you.",
    why: "If you have time and a gap worth filling, a well-chosen opportunity can add something new. This is optional exploration, not a box to check.",
    href: "/dashboard/profile/awards",
    actionLabel: "Find opportunities",
    prerequisites: [],
    importance: "optional",
    deadlineSensitive: false,
    // Only students with runway — never seniors with no time to benefit.
    grades: [9, 10, 11],
    completionCriteria: "You've explored opportunities that fit your timeline.",
    order: 4,
    eligible: (ctx) => !isSenior(ctx),
  },

  // ─── Activities ────────────────────────────────────────────────────────────
  {
    id: "activities-review",
    branch: "activities",
    title: "Review your activities list",
    description:
      "Look over your activities — strength, field alignment, and whether to continue or deepen each one.",
    why: "A clear read on your activities shows where your involvement is strongest and most aligned, so you invest your time where it matters.",
    href: "/dashboard/profile/activities",
    actionLabel: "Open Activities",
    prerequisites: [],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "You've reviewed your activities analysis.",
    order: 1,
  },
  {
    id: "activities-descriptions",
    branch: "activities",
    title: "Strengthen your activity descriptions",
    description:
      "Sharpen each description to show your specific contribution and impact, with line-level writing feedback.",
    why: "Strong, specific descriptions — real verbs, real impact — communicate far more than a title. This is where accurate writing beats padding.",
    href: "/dashboard/application-writing/activity-additional-info",
    actionLabel: "Improve descriptions",
    prerequisites: ["activities-review"],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [],
    completionCriteria: "Your activity descriptions are clear and specific.",
    order: 2,
    eligible: (ctx) => ctx.activityCount > 0,
  },
  {
    id: "activities-completeness",
    branch: "activities",
    title: "Check completeness & ordering",
    description:
      "Confirm hours, roles, and grades are accurate, and that your most meaningful activities are ordered first.",
    why: "Order and accuracy shape the first impression of your involvement. Leading with your most meaningful, sustained activities tells your story clearly.",
    href: "/dashboard/profile/activities",
    actionLabel: "Review activities",
    prerequisites: ["activities-review"],
    importance: "recommended",
    deadlineSensitive: false,
    grades: [11, 12, 13],
    completionCriteria: "Your activities are complete, accurate, and ordered.",
    order: 3,
    eligible: (ctx) => ctx.activityCount > 0,
  },
  {
    id: "activities-continue",
    branch: "activities",
    title: "Find continued involvement",
    description:
      "Identify where deepening an existing commitment — more responsibility, a sustained role — would strengthen your profile.",
    why: "Depth and sustained commitment read more strongly than a longer list. If you have time, going further in what you already do is usually the better move.",
    href: "/dashboard/profile/activities",
    actionLabel: "Open Activities",
    prerequisites: [],
    importance: "optional",
    deadlineSensitive: false,
    grades: [9, 10, 11],
    completionCriteria: "You've identified where to deepen your involvement.",
    order: 4,
    eligible: (ctx) => !isSenior(ctx),
  },
];

/** Fast id → template lookup. */
export const MILESTONE_BY_ID: ReadonlyMap<string, MilestoneTemplate> = new Map(
  MILESTONE_LIBRARY.map((m) => [m.id, m]),
);

/** The set of all valid milestone ids (for validating generation output). */
export const VALID_MILESTONE_IDS: ReadonlySet<string> = new Set(
  MILESTONE_LIBRARY.map((m) => m.id),
);
