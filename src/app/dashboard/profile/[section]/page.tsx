import { notFound } from "next/navigation";
import { PROFILE_SECTIONS } from "~/lib/profile-sections";
import { LockedSection } from "../locked-section";

// Locked placeholder pages for the scaffolded My Profile sections. Only known,
// locked slugs render; anything else 404s. Overview lives at the index route.
export default async function ProfileSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = PROFILE_SECTIONS.find((s) => s.slug === section && s.locked);
  if (!meta) return notFound();
  return <LockedSection title={meta.label} description={meta.description} />;
}
