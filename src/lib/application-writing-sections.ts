// The Application Writing section's internal navigation. This is a top-level
// dashboard section (parallel to My Profile) with an Overview landing plus three
// sub-tabs. Shared by the nav and the pages so the two never drift.

export type ApplicationWritingSection = {
  /** URL slug under /dashboard/application-writing/. "" is the Overview index. */
  slug: string;
  label: string;
};

export const APPLICATION_WRITING_BASE = "/dashboard/application-writing";

export const APPLICATION_WRITING_SECTIONS: ApplicationWritingSection[] = [
  { slug: "", label: "Overview" },
  { slug: "personal-statement", label: "Personal Statement" },
  { slug: "supplemental-essays", label: "Supplemental Essays" },
  { slug: "activity-additional-info", label: "Activity & Additional Info" },
];

/** Build the route for a section slug ("" → the Overview index). */
export function applicationWritingHref(slug: string): string {
  return slug
    ? `${APPLICATION_WRITING_BASE}/${slug}`
    : APPLICATION_WRITING_BASE;
}
