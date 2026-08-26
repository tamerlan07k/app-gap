// The My Profile internal navigation. Overview is functional; the rest are
// scaffolded/locked for now. Shared by the profile nav and the [section] route
// so the two never drift.

export type ProfileSection = {
  /** URL slug; "" is the Overview index. */
  slug: string;
  label: string;
  locked: boolean;
  /** Shown on the locked placeholder — what this section will eventually do. */
  description: string;
};

export const PROFILE_SECTIONS: ProfileSection[] = [
  { slug: "", label: "Overview", locked: false, description: "" },
  {
    slug: "personal-statement",
    label: "Personal Statement",
    locked: false,
    description:
      "Draft and refine your Common App personal statement with an AppGap coach — brainstorming, structure, feedback, and revision.",
  },
  {
    slug: "supplemental-essays",
    label: "Supplemental Essays",
    locked: true,
    description:
      "Track and draft your college-specific supplemental essays, with prompts, drafts, and deadlines per school.",
  },
  {
    slug: "activities",
    label: "Activities",
    locked: false,
    description:
      "Manage your activities list — descriptions, hours, roles, and impact — as a living part of your application.",
  },
  {
    slug: "application-writing",
    label: "Application Writing",
    locked: false,
    description:
      "Get help writing your activity descriptions and the Additional Information section of the Common App.",
  },
  {
    slug: "coursework",
    label: "Coursework",
    locked: true,
    description:
      "Keep your current and planned courses, AP/IB/dual-enrollment rigor, and academic profile up to date.",
  },
  {
    slug: "awards",
    label: "Awards",
    locked: true,
    description:
      "Maintain your awards and honors — level, recognition, date, and external validation.",
  },
];

/** Build the route for a section slug ("" → the Overview index). */
export function profileSectionHref(slug: string): string {
  return slug ? `/dashboard/profile/${slug}` : "/dashboard/profile";
}
