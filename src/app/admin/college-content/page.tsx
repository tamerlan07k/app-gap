import Link from "next/link";
import { createAdminClient } from "~/lib/supabase/admin";
import { cn } from "~/lib/utils";
import { BulkPublishControls } from "./bulk-history-controls";
import { ContentEditor } from "./content-editor";

const headCount = (res: { count: number | null }) => res.count ?? 0;

type ContentState = "published" | "draft" | "empty";

function stateOf(present: boolean, verifiedAt: string | null): ContentState {
  if (verifiedAt) return "published";
  if (present) return "draft";
  return "empty";
}

const PILL: Record<ContentState, string> = {
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  empty: "bg-muted text-muted-foreground",
};
const PILL_LABEL: Record<ContentState, string> = {
  published: "Live",
  draft: "Draft",
  empty: "—",
};

function Pill({ state, label }: { state: ContentState; label: string }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PILL[state],
      )}
    >
      {label}: {PILL_LABEL[state]}
    </span>
  );
}

interface ProfileRow {
  college_id: string;
  history: string | null;
  history_source_url: string | null;
  history_verified_at: string | null;
  fit: {
    campusLife?: string | null;
    diversity?: string | null;
    opportunities?: string | null;
    vibe?: string | null;
    careerFit?: string | null;
  } | null;
  fit_source_url: string | null;
  fit_verified_at: string | null;
}

export default async function CollegeContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; college?: string }>;
}) {
  const { q, college } = await searchParams;
  const admin = createAdminClient();

  // ── Draft/published counts per content type (for the bulk controls) ──
  const cp = () =>
    admin.from("college_profiles").select("*", { count: "exact", head: true });
  const fs = () =>
    admin
      .from("college_field_strengths")
      .select("*", { count: "exact", head: true });
  const [
    histDraftsRes,
    histPublishedRes,
    fitDraftsRes,
    fitPublishedRes,
    progDraftsRes,
    progPublishedRes,
  ] = await Promise.all([
    cp().not("history", "is", null).is("history_verified_at", null),
    cp().not("history_verified_at", "is", null),
    cp().not("fit", "is", null).is("fit_verified_at", null),
    cp().not("fit_verified_at", "is", null),
    fs().is("verified_at", null),
    fs().not("verified_at", "is", null),
  ]);
  const bulkCounts = {
    history: {
      draft: headCount(histDraftsRes),
      live: headCount(histPublishedRes),
    },
    fit: { draft: headCount(fitDraftsRes), live: headCount(fitPublishedRes) },
    program: {
      draft: headCount(progDraftsRes),
      live: headCount(progPublishedRes),
    },
  };

  // ── Selected college → editor ──
  let editor: React.ReactNode = null;
  if (college) {
    const { data: c } = await admin
      .from("colleges")
      .select("id, canonical_name")
      .eq("id", college)
      .maybeSingle();
    if (c) {
      const { data: p } = await admin
        .from("college_profiles")
        .select(
          "history, history_source_url, history_verified_at, fit, fit_source_url, fit_verified_at",
        )
        .eq("college_id", c.id)
        .maybeSingle();
      const pr = p as ProfileRow | null;
      editor = (
        <ContentEditor
          collegeId={c.id}
          collegeName={c.canonical_name}
          initial={{
            history: pr?.history ?? "",
            historySourceUrl: pr?.history_source_url ?? "",
            historyPublished: pr?.history_verified_at != null,
            fit: {
              campusLife: pr?.fit?.campusLife ?? "",
              diversity: pr?.fit?.diversity ?? "",
              opportunities: pr?.fit?.opportunities ?? "",
              vibe: pr?.fit?.vibe ?? "",
              careerFit: pr?.fit?.careerFit ?? "",
            },
            fitSourceUrl: pr?.fit_source_url ?? "",
            fitPublished: pr?.fit_verified_at != null,
          }}
        />
      );
    }
  }

  // ── College list (searchable) ──
  let listQuery = admin
    .from("colleges")
    .select("id, canonical_name, state")
    .eq("status", "active")
    .order("canonical_name")
    .limit(40);
  if (q) listQuery = listQuery.ilike("canonical_name", `%${q}%`);
  const { data: colleges } = await listQuery;
  const ids = (colleges ?? []).map((c) => c.id);
  const { data: profiles } = ids.length
    ? await admin
        .from("college_profiles")
        .select(
          "college_id, history, history_verified_at, fit, fit_verified_at",
        )
        .in("college_id", ids)
    : { data: [] as ProfileRow[] };
  const pById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.college_id, p]),
  );

  const keepQuery = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">College content review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and publish per-college History and “fit” facets. Nothing shows
          to students until you mark it published. Structured facts (founded,
          setting) are ingested separately and always shown.
        </p>
      </div>

      <BulkPublishControls counts={bulkCounts} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* List + search */}
        <div className="space-y-3">
          <form method="GET" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search colleges…"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </form>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {(colleges ?? []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No colleges match.
              </p>
            )}
            {(colleges ?? []).map((c) => {
              const p = pById.get(c.id);
              const hist = stateOf(
                !!p?.history,
                p?.history_verified_at ?? null,
              );
              const fit = stateOf(!!p?.fit, p?.fit_verified_at ?? null);
              const active = c.id === college;
              return (
                <Link
                  key={c.id}
                  href={`/admin/college-content?college=${c.id}${keepQuery}`}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50",
                    active && "bg-brand-teal/5",
                  )}
                >
                  <span className="text-sm font-medium">
                    {c.canonical_name}
                    {c.state ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {c.state}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <Pill state={hist} label="Hist" />
                    <Pill state={fit} label="Fit" />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Showing up to 40. Search to narrow.
          </p>
        </div>

        {/* Editor */}
        <div>
          {editor ?? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Select a college on the left to review its content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
