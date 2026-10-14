"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HistoryControls } from "~/components/history-controls";
import { OnboardingStepper } from "~/components/onboarding-stepper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useHistory } from "~/hooks/use-history";
import { loadWelcomeFromDb, saveWelcomeToDb } from "~/lib/profile-db";
import {
  loadWelcome,
  saveWelcome,
  type WelcomeInfo,
} from "~/lib/profile-storage";

export default function WelcomePage() {
  const router = useRouter();
  const {
    state: info,
    set: setInfo,
    reset: resetInfo,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<WelcomeInfo>({ name: "", location: "" });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const dbData = await loadWelcomeFromDb();
      const data = dbData ?? loadWelcome();
      if (data)
        resetInfo({ name: data.name ?? "", location: data.location ?? "" });
      setIsLoaded(true);
    }
    load();
  }, [resetInfo]);

  useEffect(() => {
    if (!isLoaded) return;
    saveWelcome(info);
  }, [info, isLoaded]);

  function setField(field: keyof WelcomeInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }), {
      coalesceKey: `welcome.${field}`,
    });
    if (field === "name") setNameError(null);
  }

  async function handleContinue() {
    if (isSaving) return;
    if (!info.name.trim()) {
      setNameError("Please enter your name.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      await saveWelcomeToDb(info);
      router.push("/profile");
    } catch {
      setSaveError(
        "Couldn't save your progress. Please check your connection and try again.",
      );
      setIsSaving(false);
    }
  }

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
        <HistoryControls
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Page header */}
        <div className="space-y-3">
          <OnboardingStepper current={1} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Step 1 of 7
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to AppGap
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Let&apos;s start with the basics. We&apos;ll use your name to
            personalize your dashboard, and where you live to help build a
            balanced, location-aware college list.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="welcome-name">What should we call you?</Label>
            <Input
              id="welcome-name"
              type="text"
              placeholder="e.g. Alex"
              value={info.name}
              onChange={(e) => setField("name", e.target.value)}
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Label htmlFor="welcome-location">Where do you live?</Label>
              <span className="text-xs text-muted-foreground">
                city &amp; state, or however you like
              </span>
            </div>
            <Input
              id="welcome-location"
              type="text"
              placeholder="e.g. Austin, TX"
              value={info.location}
              onChange={(e) => setField("location", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Including your U.S. state lets you filter your college
              list by state or region later.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end gap-4">
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <Button onClick={handleContinue} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Continue
            <ArrowRight />
          </Button>
        </div>
      </div>
    </main>
  );
}
