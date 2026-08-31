"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { HistoryControls } from "~/components/history-controls";
import { OnboardingStepper } from "~/components/onboarding-stepper";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useHistory } from "~/hooks/use-history";
import {
  ACADEMIC_AREAS,
  fieldKeyForMajor,
  majorsForArea,
  specializationsForMajor,
} from "~/lib/academic-interests";
import { loadStep2FromDb, saveStep2ToDb } from "~/lib/profile-db";
import {
  type CareerDirection,
  loadStep2,
  saveStep2,
} from "~/lib/profile-storage";
import { OnboardingCollegeTargets } from "./onboarding-college-targets";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormErrors {
  academicMajor?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

const SELECT_ERROR_CLASS =
  "h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

// ─── Field helper ────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CareerDirectionPage() {
  const router = useRouter();

  const {
    state: direction,
    set: setDirection,
    reset: resetDirection,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<CareerDirection>({
    academicArea: "",
    academicMajor: "",
    academicInterests: [],
    majorCategory: "",
    specificMajor: "",
    careerInterest: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const dbData = await loadStep2FromDb();
      const data = dbData ?? loadStep2();
      if (data) resetDirection(data);
      setIsLoaded(true);
    }
    load();
  }, [resetDirection]);

  useEffect(() => {
    if (!isLoaded) return;
    saveStep2(direction);
  }, [direction, isLoaded]);

  function setDir(field: keyof CareerDirection, value: string) {
    setDirection((prev) => ({ ...prev, [field]: value }), {
      coalesceKey: `direction.${field}`,
    });
  }

  /** Broad area changed → reset the dependent major + specializations. */
  function selectArea(areaKey: string) {
    setDirection((prev) => ({
      ...prev,
      academicArea: areaKey,
      academicMajor: "",
      academicInterests: [],
      majorCategory: "",
    }));
  }

  /** Major changed → derive the coarse field key and clear specializations. */
  function selectMajor(majorKey: string) {
    setDirection((prev) => ({
      ...prev,
      academicMajor: majorKey,
      majorCategory: majorKey ? fieldKeyForMajor(majorKey) : "",
      academicInterests: [],
    }));
    setErrors((prev) => ({ ...prev, academicMajor: undefined }));
  }

  /** Toggle one specialization on/off. */
  function toggleInterest(specKey: string) {
    setDirection((prev) => {
      const has = prev.academicInterests.includes(specKey);
      return {
        ...prev,
        academicInterests: has
          ? prev.academicInterests.filter((k) => k !== specKey)
          : [...prev.academicInterests, specKey],
      };
    });
  }

  async function handleContinue() {
    const next: FormErrors = {};
    if (!direction.academicMajor)
      next.academicMajor =
        "Please choose an area and a major (or “Not sure yet”).";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      await saveStep2ToDb(direction);
      router.push("/profile/activities");
    } catch {
      setSaveError(
        "Couldn't save your progress. Please check your connection and try again.",
      );
      setIsSaving(false);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

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
          <OnboardingStepper current={3} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Step 3 of 6
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Career direction
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Help AppGap understand where you&apos;re aiming and what field
            you&apos;re interested in pursuing. This shapes how your profile is
            evaluated.
          </p>
        </div>

        {/* Section: Academic direction (broad area → major → specializations) */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">Academic direction</h2>
            <p className="text-sm text-muted-foreground">
              Pick a broad area, then the specific major that fits best. You can
              add specializations if you have them — or choose “Not sure yet.”
            </p>
          </div>

          <div className="space-y-5">
            <Field id="academic-area" label="Broad academic area">
              <select
                id="academic-area"
                value={direction.academicArea}
                onChange={(e) => selectArea(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select an area</option>
                {ACADEMIC_AREAS.map((area) => (
                  <option key={area.key} value={area.key}>
                    {area.label}
                  </option>
                ))}
              </select>
            </Field>

            {direction.academicArea && (
              <Field
                id="academic-major"
                label="Specific major"
                error={errors.academicMajor}
              >
                <select
                  id="academic-major"
                  value={direction.academicMajor}
                  onChange={(e) => selectMajor(e.target.value)}
                  className={
                    errors.academicMajor ? SELECT_ERROR_CLASS : SELECT_CLASS
                  }
                >
                  <option value="">Select a major</option>
                  {majorsForArea(direction.academicArea).map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {specializationsForMajor(direction.academicMajor).length > 0 && (
              <Field
                id="academic-interests"
                label="Specializations / interests"
                hint="optional — pick any that apply"
              >
                <div className="flex flex-wrap gap-2">
                  {specializationsForMajor(direction.academicMajor).map(
                    (spec) => {
                      const active = direction.academicInterests.includes(
                        spec.key,
                      );
                      return (
                        <button
                          key={spec.key}
                          type="button"
                          onClick={() => toggleInterest(spec.key)}
                          aria-pressed={active}
                          className={
                            active
                              ? "rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1 text-sm font-medium text-brand-teal transition"
                              : "rounded-full border border-input px-3 py-1 text-sm text-muted-foreground transition hover:border-brand-teal/50 hover:text-foreground"
                          }
                        >
                          {spec.label}
                        </button>
                      );
                    },
                  )}
                </div>
              </Field>
            )}

            <Field
              id="specific-major"
              label="Exact program name"
              hint="optional — if it isn't listed above"
            >
              <Input
                id="specific-major"
                type="text"
                placeholder="e.g. Symbolic Systems, PPE, Computational Biology"
                value={direction.specificMajor}
                onChange={(e) => setDir("specificMajor", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section: Career interests */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">Career interests</h2>
            <p className="text-sm text-muted-foreground">
              What kind of work or impact do you see yourself doing after
              college? This helps AppGap assess alignment between your
              activities and your stated goals.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              id="career-interest"
              label="Career goal or industry"
              hint="optional"
            >
              <Input
                id="career-interest"
                type="text"
                placeholder="e.g. Software engineer, physician, entrepreneur, policy analyst"
                value={direction.careerInterest}
                onChange={(e) => setDir("careerInterest", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section: College targets — add real colleges; they auto-import into
            My Colleges after onboarding. Replaces the old generic selectivity
            question. */}
        <OnboardingCollegeTargets />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile/school-type">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {hasErrors && (
              <p className="text-sm text-muted-foreground">
                Please fill in the required fields above.
              </p>
            )}
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
