import { BadgeCheck, Compass, ShieldCheck } from "lucide-react";
import { FIELD_STRENGTH_META } from "~/lib/coursework/labels";
import type { TargetContext } from "~/lib/coursework/types";
import { cn } from "~/lib/utils";

// Target-Program Fit. Shows what AppGap can say about the student's EXACT target
// using only verified data: the college's verified field strength (a real signal,
// explicitly NOT a coursework requirement), plus any verified scope-resolved
// academic requirements (empty until such data is ingested — never fabricated).
// The hierarchy (college → school → program → track) is preserved for the future
// requirements + Supplemental Essays system.
export function TargetFitCard({
  target,
  fieldLabel,
}: {
  target: TargetContext;
  fieldLabel: string;
}) {
  if (!target.hasTarget) {
    return (
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 size-4 shrink-0 text-brand-teal" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Add a college target in My Colleges to ground this section. AppGap
          will then show that college's verified field strength for {fieldLabel}{" "}
          and, as verified program requirements are added, compare your
          coursework against your exact school / program / track — never an
          invented requirement.
        </p>
      </div>
    );
  }

  const fs = target.fieldStrength;
  const fsMeta = fs ? FIELD_STRENGTH_META[fs.rating] : null;

  return (
    <div className="space-y-4">
      {/* Target identity (hierarchy preserved) */}
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 size-4 shrink-0 text-brand-teal" />
        <p className="text-sm leading-relaxed">
          <span className="font-medium">
            {target.collegeName ?? "Your saved target"}
          </span>
          {target.programLabel ? (
            <span className="text-muted-foreground">
              {" "}
              · {target.programLabel}
            </span>
          ) : null}
        </p>
      </div>

      {/* Verified field strength — real data, NOT a requirement */}
      {fs && fsMeta ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-brand-teal" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Verified field strength
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                fsMeta.badge,
              )}
            >
              {fsMeta.label}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">
            This college is rated{" "}
            <span className="font-medium">{fsMeta.label.toLowerCase()}</span> in{" "}
            {fieldLabel}.{fs.headline ? ` ${fs.headline}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This reflects the college's strength in your field — not a
            coursework requirement.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No verified field-strength rating is on file for {fieldLabel} at this
          college yet.
        </p>
      )}

      {/* Verified, scope-resolved requirements */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-teal" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Program-specific requirements
          </span>
        </div>
        {target.verifiedExpectations.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {target.verifiedExpectations.map((e) => (
              <li key={`${e.subjectArea}:${e.topic ?? ""}`} className="text-sm">
                <span className="font-medium">{e.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {e.requirementType} ({e.scope})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            No verified coursework requirements are on file for this exact
            school / program / track yet, so none are shown. AppGap never
            invents requirements — when verified data is added, it will appear
            here scoped precisely to your target (and never leak from a
            different program).
          </p>
        )}
      </div>
    </div>
  );
}
