"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { loadSchoolTypeFromDb, saveSchoolTypeToDb } from "~/lib/profile-db";
import { loadSchoolInfo, saveSchoolInfo } from "~/lib/profile-storage";

const SCHOOL_OPTIONS: { value: string; label: string; description: string }[] =
  [
    {
      value: "public",
      label: "Public High School",
      description: "A tuition-free school funded by local or state government",
    },
    {
      value: "private",
      label: "Private High School",
      description: "An independent school with tuition, religious or secular",
    },
    {
      value: "early-college",
      label: "Early College High School",
      description:
        "A program where students earn college credits while in high school",
    },
    {
      value: "magnet-stem",
      label: "Magnet / STEM School",
      description:
        "A specialized school focused on specific academic disciplines",
    },
    {
      value: "homeschool",
      label: "Homeschool",
      description: "Education primarily delivered at home by parents or tutors",
    },
    {
      value: "other",
      label: "Other",
      description: "Charter school, online school, or another type",
    },
  ];

export default function SchoolTypePage() {
  const router = useRouter();
  const [schoolType, setSchoolType] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const dbData = await loadSchoolTypeFromDb();
      const data = dbData ?? loadSchoolInfo();
      if (data) setSchoolType(data.schoolType);
      setIsLoaded(true);
    }
    load();
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!isLoaded) return;
    saveSchoolInfo({ schoolType });
  }, [schoolType, isLoaded]);

  async function handleContinue() {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      await saveSchoolTypeToDb({ schoolType });
      router.push("/profile/career-direction");
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
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 2 of 5
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Your high school
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            The type of school you attend shapes the opportunities available to
            you. AppGap uses this to tailor its recommendations to your specific
            context.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <p className="font-semibold">
            What type of high school do you attend?
          </p>
          <div className="grid gap-3">
            {SCHOOL_OPTIONS.map((option) => {
              const isSelected = schoolType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSchoolType(option.value)}
                  className={[
                    "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-foreground bg-card shadow-sm"
                      : "border-border bg-card hover:border-foreground/40 hover:shadow-sm",
                  ].join(" ")}
                >
                  {/* Radio indicator */}
                  <span
                    className={[
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground"
                        : "border-muted-foreground/40",
                    ].join(" ")}
                  >
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-background" />
                    )}
                  </span>

                  {/* Label + description */}
                  <div className="space-y-0.5">
                    <p
                      className={[
                        "text-sm font-medium",
                        isSelected ? "text-foreground" : "",
                      ].join(" ")}
                    >
                      {option.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional — you can skip this and continue.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile">
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
              Continue
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
