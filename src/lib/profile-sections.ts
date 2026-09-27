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

// Personal Statement, Supplemental Essays, and the activity-description /
// Additional Information workspace now live under the top-level Application
// Writing section (/dashboard/application-writing), not here — see
// application-writing-sections.ts.
export const PROFILE_SECTIONS: ProfileSection[] = [
  { slug: "", label: "Overview", locked: false, description: "" },
  {
    slug: "activities",
    label: "Activities",
    locked: false,
    description:
      "Manage your activities list — descriptions, hours, roles, and impact — as a living part of your application.",
  },
  {
    slug: "coursework",
    label: "Coursework",
    locked: false,
    description:
      "Analyze what your academic path communicates — rigor, major preparation, school opportunity context, and genuine gaps vs. opportunities.",
  },
  {
    slug: "awards",
    label: "Awards",
    locked: false,
    description:
      "See what your recognition demonstrates and where the gaps are, discover real opportunities that could add something new, and test whether a specific competition or program is worth pursuing.",
  },
];

/** Build the route for a section slug ("" → the Overview index). */
export function profileSectionHref(slug: string): string {
  return slug ? `/dashboard/profile/${slug}` : "/dashboard/profile";
}
