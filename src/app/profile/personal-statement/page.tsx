"use client";

import { ArrowLeft, ArrowRight, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingStepper } from "~/components/onboarding-stepper";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { countWords, WORD_LIMIT } from "~/lib/personal-statement/prompts";
import {
  loadPersonalStatementDraftFromDb,
  savePersonalStatementDraftToDb,
} from "~/lib/profile-db";
import {
  loadPersonalStatementInfo,
  savePersonalStatementInfo,
} from "~/lib/profile-storage";
import { cn } from "~/lib/utils";

const GATE_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "yes",
    label: "Yes, I have one",
    description: "Paste what you've written for a quick, rough read.",
  },
  {
    value: "no",
    label: "No, not yet",
    description: "That's completely normal — you can skip this.",
  },
  {
    value: "unsure",
    label: "Not sure what this is",
    description: "No problem — skip it and come back whenever you're ready.",
  },
];

export default function OnboardingPersonalStatementPage() {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const dbText = await loadPersonalStatementDraftFromDb();
      if (dbText) {
        setChoice("yes");
        setText(dbText);
      } else {
        const local = loadPersonalStatementInfo();
        if (local) {
          setChoice(local.choice);
          setText(local.text);
        }
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  // Persist locally on every change.
  useEffect(() => {
    if (!isLoaded) return;
    savePersonalStatementInfo({ choice, text });
  }, [choice, text, isLoaded]);

  async function handleContinue() {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      // Only persist an essay when they actually have one; skipping stores null,
      // so the diagnostic is never run and the score never fabricated.
      await savePersonalStatementDraftToDb(choice === "yes" ? text : "");
      router.push("/profile/review");
    } catch {
      setSaveError(
        "Couldn't save your progress. Please check your connection and try again.",
      );
      setIsSaving(false);
    }
  }

  const words = countWords(text);
  const overLimit = words > WORD_LIMIT;

  if (!isLoaded) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <OnboardingStepper current={5} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Step 5 of 6 · Optional
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Your personal statement
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            The personal statement (also called the Common App essay) is a short
            essay you write for college applications. This step is completely
            optional — if you have a draft, we'll give it a quick read; if not,
            just skip it and keep going.
          </p>
        </div>

        {/* Friendly explainer for younger students */}
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-teal" />
          <p className="text-muted-foreground">
            New to this? Most 9th and 10th graders haven't written one yet —
            that's exactly what AppGap helps you build over time. You won't be
            penalized for skipping, and the full Personal Statement coach is
            waiting for you in your dashboard whenever you're ready.
          </p>
        </div>

        {/* Gate */}
        <div className="space-y-3">
          <p className="font-semibold">
            Do you already have a personal statement?
          </p>
          <div className="grid gap-3">
            {GATE_OPTIONS.map((option) => {
              const isSelected = choice === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoice(option.value)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-foreground bg-card shadow-sm"
                      : "border-border bg-card hover:border-foreground/40 hover:shadow-sm",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-background" />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paste box — only when they have one */}
        {choice === "yes" && (
          <div className="space-y-2">
            <label
              htmlFor="ps-onboarding"
              className="text-sm font-medium text-foreground"
            >
              Paste your personal statement
            </label>
            <Textarea
              id="ps-onboarding"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your current draft here…"
              rows={12}
              maxLength={20000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                We'll give this a quick, rough read — it won't be rewritten. For
                detailed coaching, use the full Personal Statement section
                later.
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  overLimit && "text-amber-600 dark:text-amber-400",
                )}
              >
                {words} / {WORD_LIMIT}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile/activities">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            <Button onClick={handleContinue} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}
              {choice === "yes" ? "Continue" : "Skip & continue"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
