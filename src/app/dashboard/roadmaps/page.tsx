import { ArrowRight, MapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { analysisSchema } from "~/lib/ai/schema";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { checkFeatureAllowance } from "~/lib/feature-usage";
import { createClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { DeleteButton } from "./delete-button";

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Developing";
  if (score >= 35) return "Building";
  return "Early Stage";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-brand-teal";
  if (score >= 50) return "text-amber-500";
  return "text-red-500 dark:text-red-400";
}

export default async function RoadmapsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [analysesRes, profileRes] = await Promise.all([
    supabase
      .from("ai_analyses")
      .select("id, created_at, analysis")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, admin_override, admin_override_tier, admin_override_expires_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const roadmaps = (analysesRes.data ?? []).flatMap((row) => {
    const parsed = analysisSchema.safeParse(row.analysis);
    if (!parsed.success) return [];
    return [
      {
        id: row.id as string,
        createdAt: row.created_at as string,
        gapScore: parsed.data.gapScore,
      },
    ];
  });

  // Effective tier (an active admin override outranks Stripe), then check whether a
  // new diagnostic is available under the feature-based entitlement. Fail closed
  // (hide the generate action) if usage can't be verified.
  const entitlement = resolveEntitlement(
    profileRes.data as EntitlementProfile | null,
  );
  const tier = entitlement.tier;
  const allowance = await checkFeatureAllowance(
    supabase,
    user.id,
    "profileAnalysis",
    tier,
  ).catch(() => null);
  const canGenerate = allowance?.allowed ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {roadmaps.length > 0
              ? `${roadmaps.length} saved ${roadmaps.length === 1 ? "analysis" : "analyses"}`
              : "Your saved analyses will appear here once you generate them."}
          </p>
        </div>
        {roadmaps.length > 0 &&
          (canGenerate ? (
            <Button size="sm" asChild>
              <Link href="/profile/review">
                Generate New
                <ArrowRight />
              </Link>
            </Button>
          ) : tier === "free" ? (
            <Button size="sm" asChild>
              <Link href="/dashboard/billing">
                Upgrade to Pro
                <ArrowRight />
              </Link>
            </Button>
          ) : null)}
      </div>

      {roadmaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10">
            <MapIcon className="size-7 text-brand-teal" />
          </div>
          <div>
            <p className="font-semibold">No analysis yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canGenerate
                ? "Complete your profile to generate your first AppGap Analysis."
                : tier === "free"
                  ? "You've used your free AppGap analysis. Upgrade to Pro to generate more."
                  : "You've reached your analysis limit for this month. Check billing for options."}
            </p>
          </div>
          {canGenerate ? (
            <Button size="sm" asChild>
              <Link href="/profile">
                Generate my analysis
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/dashboard/billing">
                {tier === "free" ? "Upgrade to Pro" : "Check Billing"}
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {roadmaps.map((r, i) => {
            const date = new Date(r.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            });
            const label = getScoreLabel(r.gapScore);
            const scoreColor = getScoreColor(r.gapScore);

            return (
              <div
                key={r.id}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
              >
                <Link
                  href={`/dashboard/roadmap/${r.id}`}
                  className="flex flex-1 items-center gap-4 p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
                    <span className="text-lg font-bold tabular-nums text-brand-teal">
                      {r.gapScore}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold", scoreColor)}>
                        {label}
                      </p>
                      {i === 0 && (
                        <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Analyzed {date}
                    </p>
                  </div>

                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>

                <div className="pr-4">
                  <DeleteButton id={r.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
