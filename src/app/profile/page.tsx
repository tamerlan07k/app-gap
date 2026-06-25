"use client";

import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

// State for the "basic academic info" section.
// Expand this interface as more form sections are added.
interface AcademicInfo {
  gradeLevel: string;
  unweightedGpa: string;
  satScore: string;
  actScore: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade (senior)" },
  { value: "gap", label: "Graduated / gap year" },
];

// ─── Field helper ────────────────────────────────────────────────────────────

// Wraps a Label + optional hint text above any input element.
// Pass the same `id` to this component and to the input inside it.
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [info, setInfo] = useState<AcademicInfo>({
    gradeLevel: "",
    unweightedGpa: "",
    satScore: "",
    actScore: "",
  });

  function set(field: keyof AcademicInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-10">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 1 of 3
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
              Fill in what you have. You can estimate GPA if you're not sure of
              the exact number.
            </p>
          </div>

          <div className="space-y-5">
            <Field id="grade-level" label="Grade level">
              <select
                id="grade-level"
                value={info.gradeLevel}
                onChange={(e) => set("gradeLevel", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              >
                {GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="unweighted-gpa" label="Unweighted GPA" hint="out of 4.0">
              <Input
                id="unweighted-gpa"
                type="number"
                inputMode="decimal"
                min={0}
                max={4}
                step={0.01}
                placeholder="e.g. 3.7"
                value={info.unweightedGpa}
                onChange={(e) => set("unweightedGpa", e.target.value)}
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
                onChange={(e) => set("satScore", e.target.value)}
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
                onChange={(e) => set("actScore", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            {/* TODO: wire up to step 2 (courses & extracurriculars) */}
            <Button>
              Continue
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
