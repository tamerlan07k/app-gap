import { notFound, redirect } from "next/navigation";
import { PROFILE_SECTIONS } from "~/lib/profile-sections";
import { LockedSection } from "../locked-section";

// Sections that moved out of My Profile into the top-level Application Writing
// section. Old bookmarks/links are redirected to the new home instead of 404ing.
const MOVED_TO_APPLICATION_WRITING: Record<string, string> = {
  "personal-statement": "/dashboard/application-writing/personal-statement",
  "supplemental-essays": "/dashboard/application-writing/supplemental-essays",
  "application-writing":
    "/dashboard/application-writing/activity-additional-info",
};

// Locked placeholder pages for the scaffolded My Profile sections. Only known,
// locked slugs render; moved slugs redirect; anything else 404s. Overview lives
// at the index route.
export default async function ProfileSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  const moved = MOVED_TO_APPLICATION_WRITING[section];
  if (moved) redirect(moved);

  const meta = PROFILE_SECTIONS.find((s) => s.slug === section && s.locked);
  if (!meta) return notFound();
  return <LockedSection title={meta.label} description={meta.description} />;
}
