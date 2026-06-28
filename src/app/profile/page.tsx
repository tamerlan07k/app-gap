"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademicInfo {
  gradeLevel: string;
  unweightedGpa: string;
  satScore: string;
  actScore: string;
}

interface FormErrors {
  gradeLevel?: string;
  unweightedGpa?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

const SELECT_ERROR_CLASS =
  "h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade (senior)" },
  { value: "gap", label: "Graduated / gap year" },
];

// ─── Validation helpers ──────────────────────────────────────────────────────

function clamp(
  value: string,
  min: number,
  max: number,
  integer = false,
): string {
  const n = integer ? parseInt(value, 10) : parseFloat(value);
  if (Number.isNaN(n) || value === "") return value;
  return String(Math.min(max, Math.max(min, integer ? Math.round(n) : n)));
}

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

export default function ProfilePage() {
  const router = useRouter();

  const [info, setInfo] = useState<AcademicInfo>({
    gradeLevel: "",
    unweightedGpa: "",
    satScore: "",
    actScore: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  function setAcademic(field: keyof AcademicInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "gradeLevel" || field === "unweightedGpa") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleContinue() {
    const next: FormErrors = {};
    if (!info.gradeLevel) next.gradeLevel = "Please select your grade level.";
    if (!info.unweightedGpa.trim())
      next.unweightedGpa = "Please enter your GPA.";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    router.push("/profile/career-direction");
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 1 of 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Your academic profile
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Start with the core details of your academic profile. AppGap uses
            this to evaluate your current position, identify meaningful gaps,
            and build a clear path forward.
          </p>
        </div>

        {/* Section: Basic academic info */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">Basic academic info</h2>
            <p className="text-sm text-muted-foreground">
              Fill in what you have. You can estimate GPA if you&apos;re not
              sure of the exact number.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              id="grade-level"
              label="Grade level"
              error={errors.gradeLevel}
            >
              <select
                id="grade-level"
                value={info.gradeLevel}
                onChange={(e) => setAcademic("gradeLevel", e.target.value)}
                className={
                  errors.gradeLevel ? SELECT_ERROR_CLASS : SELECT_CLASS
                }
              >
                {GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="unweighted-gpa"
              label="Unweighted GPA"
              hint="out of 4.0"
              error={errors.unweightedGpa}
            >
              <Input
                id="unweighted-gpa"
                type="number"
                inputMode="decimal"
                min={0}
                max={4}
                step={0.1}
                placeholder="e.g. 3.7"
                value={info.unweightedGpa}
                onChange={(e) => setAcademic("unweightedGpa", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value)
                    setAcademic("unweightedGpa", clamp(e.target.value, 0, 4));
                }}
                className={errors.unweightedGpa ? "border-destructive" : ""}
              />
            </Field>

            <Field id="sat-score" label="SAT score" hint="optional · 400–1600">
              <Input
                id="sat-score"
                type="number"
                inputMode="numeric"
                min={400}
                max={1600}
                step={10}
                placeholder="e.g. 1350"
                value={info.satScore}
                onChange={(e) => setAcademic("satScore", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value)
                    setAcademic(
                      "satScore",
                      clamp(e.target.value, 400, 1600, true),
                    );
                }}
              />
            </Field>

            <Field id="act-score" label="ACT score" hint="optional · 1–36">
              <Input
                id="act-score"
                type="number"
                inputMode="numeric"
                min={1}
                max={36}
                step={1}
                placeholder="e.g. 30"
                value={info.actScore}
                onChange={(e) => setAcademic("actScore", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value)
                    setAcademic("actScore", clamp(e.target.value, 1, 36, true));
                }}
              />
            </Field>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end gap-4">
          {hasErrors && (
            <p className="text-sm text-muted-foreground">
              Please fill in the required fields above.
            </p>
          )}
          <Button onClick={handleContinue}>
            Continue
            <ArrowRight />
          </Button>
        </div>
      </div>
    </main>
  );
}
