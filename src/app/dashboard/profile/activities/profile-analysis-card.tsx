"use client";

import { Compass, Layers, Sparkles } from "lucide-react";
import type { ActivityProfile } from "~/lib/ai/activities-schema";

// The collective read of the whole activity portfolio — what the student already
// demonstrates, recurring themes, field alignment, and dimensions that could
// complement the profile. Gaps are framed as "what would complement this," never
// a bare "you need more."
export function ProfileAnalysisCard({ profile }: { profile: ActivityProfile }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Your activity profile
        </p>
      </div>
      <div className="space-y-5 p-6">
        <p className="text-sm font-medium leading-relaxed">
          {profile.headline}
        </p>

        {profile.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.themes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-brand-teal/10 px-2.5 py-1 text-xs font-medium text-brand-teal"
              >
                <Layers className="size-3" />
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {profile.strengths.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Sparkles className="size-3.5 text-brand-teal" />
                What you already show
              </p>
              <ul className="space-y-1.5">
                {profile.strengths.map((s) => (
                  <li key={s} className="text-sm leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.gaps.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Compass className="size-3.5 text-brand-teal" />
                Could complement this
              </p>
              <ul className="space-y-2">
                {profile.gaps.map((g) => (
                  <li key={g.gap} className="text-sm leading-relaxed">
                    <span className="font-medium">{g.gap}</span>
                    <span className="text-muted-foreground"> — {g.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold text-foreground">
            Field alignment
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {profile.fieldAlignmentSummary}
          </p>
        </div>
      </div>
    </div>
  );
}
