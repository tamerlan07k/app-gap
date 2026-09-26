import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CollegeLogo } from "~/app/dashboard/colleges/college-logo";
import {
  COLLEGE_SIGNAL_CLASSES,
  COLLEGE_SIGNAL_LABELS,
  deriveCollegeSignal,
  summarizeProgress,
} from "~/lib/supplemental/status";
import type {
  CollegeCatalogInfo,
  CollegeEssayGroupDTO,
} from "~/lib/supplemental/types";
import { cn } from "~/lib/utils";

// The college list — the first thing a student sees. One row per college they're
// applying to, with a progress summary and the qualitative signal. Server-safe
// (no client interactivity needed here; navigation is plain links).
export function CollegeList({
  groups,
  catalog,
}: {
  groups: CollegeEssayGroupDTO[];
  catalog: Map<string, CollegeCatalogInfo>;
}) {
  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Supplemental Essays
        </p>
        <h2 className="mt-0.5 text-lg font-bold tracking-tight">
          Your colleges
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a college to manage its supplemental prompts. AppGap checks
          whether each essay actually answers the prompt, says something real
          about you, and adds to your application.
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.collegeId}>
              <CollegeRow group={group} info={catalog.get(group.collegeId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollegeRow({
  group,
  info,
}: {
  group: CollegeEssayGroupDTO;
  info?: CollegeCatalogInfo;
}) {
  const statuses = group.essays.map((e) => e.status);
  const progress = summarizeProgress(statuses);
  const signal = deriveCollegeSignal(statuses);

  const parts: string[] = [];
  // Catalog availability first (what the college requires), then the student's
  // own progress on it.
  if (info?.status === "has_supplements") {
    parts.push(
      `${info.promptCount} official prompt${info.promptCount === 1 ? "" : "s"}`,
    );
  } else if (info?.status === "none_required") {
    parts.push("No supplements required");
  }
  if (progress.total === 0) {
    if (parts.length === 0) parts.push("No prompts yet");
  } else {
    parts.push(`${progress.finalized}/${progress.total} finalized`);
    if (progress.needsRevision > 0) {
      parts.push(`${progress.needsRevision} needs revision`);
    }
  }

  return (
    <Link
      href={`/dashboard/profile/supplemental-essays/${group.collegeId}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-brand-teal/40 hover:bg-brand-teal/[0.03]"
    >
      <CollegeLogo
        name={group.collegeName}
        logoAssetPath={group.logoAssetPath}
        logoUrl={group.logoUrl}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{group.collegeName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {parts.join(" · ")}
        </p>
      </div>
      {progress.total > 0 && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            COLLEGE_SIGNAL_CLASSES[signal],
          )}
        >
          {COLLEGE_SIGNAL_LABELS[signal]}
        </span>
      )}
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden={true}
      />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="text-sm font-medium">No colleges yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add colleges to your list in My Colleges, then come back here to work on
        their supplemental essays.
      </p>
      <Link
        href="/dashboard/colleges"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-teal hover:underline"
      >
        Go to My Colleges
        <ArrowRight className="size-4" aria-hidden={true} />
      </Link>
    </div>
  );
}
