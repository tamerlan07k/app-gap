"use client";

import { HelpCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ARCHETYPE_LABELS } from "~/lib/supplemental/archetypes";
import type { PromptParse } from "~/lib/supplemental/schemas";

// "What is this prompt really asking" — the prompt-first analysis panel. Shows
// the plain-language read, the archetype(s), the explicit directives to cover,
// and any constraints. Re-runnable.
export function PromptParsePanel({
  parse,
  pending,
  onAnalyze,
}: {
  parse: PromptParse | null;
  pending: boolean;
  onAnalyze: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-brand-teal" aria-hidden={true} />
          <h3 className="font-semibold">What this prompt is really asking</h3>
        </div>
        <Button
          variant={parse ? "ghost" : "default"}
          size="sm"
          onClick={onAnalyze}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {parse ? "Re-analyze" : "Analyze prompt"}
        </Button>
      </div>

      {!parse ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Analyze the prompt to see what it's really asking, which directives
          you must cover, and how AppGap will weight your essay.
        </p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <p className="leading-relaxed">{parse.plainLanguageAsk}</p>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-medium text-brand-teal">
              {ARCHETYPE_LABELS[parse.primaryArchetype]}
            </span>
            {parse.secondaryArchetypes.map((a) => (
              <span
                key={a}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {ARCHETYPE_LABELS[a]}
              </span>
            ))}
          </div>

          {parse.directives.length > 0 && (
            <div>
              <p className="font-medium">The prompt explicitly asks you to:</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted-foreground">
                {parse.directives.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ol>
            </div>
          )}

          {parse.thingsToAnswer.length > 0 && (
            <div>
              <p className="font-medium">
                A strong response also thinks about:
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted-foreground">
                {parse.thingsToAnswer.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {parse.constraints.length > 0 && (
            <div>
              <p className="font-medium">Constraints:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted-foreground">
                {parse.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
