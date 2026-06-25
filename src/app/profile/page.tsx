"use client";

import { ArrowRight } from "lucide-react";
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

interface CollegeDirection {
  majorCategory: string;
  specificMajor: string;
  selectivity: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Shared className for all native <select> elements — mirrors the Input style.
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade (senior)" },
  { value: "gap", label: "Graduated / gap year" },
];

const MAJOR_CATEGORIES = [
  { value: "", label: "Select a category" },
  { value: "cs", label: "Computer Science / Software / Data" },
  { value: "engineering", label: "Engineering" },
  { value: "bio-premed", label: "Biology / Pre-Med / Health Sciences" },
  { value: "business", label: "Business / Finance / Economics" },
  { value: "math-physics", label: "Math / Physics / Statistics" },
  { value: "polisci", label: "Political Science / International Relations" },
  { value: "psych", label: "Psychology / Neuroscience" },
  { value: "humanities", label: "English / History / Humanities" },
  { value: "design", label: "Architecture / Design / Arts" },
  { value: "education", label: "Education / Social Work / Public Policy" },
  { value: "undecided", label: "Undecided" },
  { value: "other", label: "Other" },
];

const SELECTIVITY_OPTIONS = [
  { value: "", label: "Select a goal" },
  { value: "highly-selective", label: "Highly selective / reach schools" },
  { value: "competitive", label: "Competitive target schools" },
  { value: "balanced", label: "Balanced mix" },
  { value: "safer", label: "Mostly safer / likely schools" },
  { value: "unsure", label: "Not sure yet" },
];

// ─── Validation helpers ──────────────────────────────────────────────────────

// Clamps a numeric string into [min, max] on blur.
// Pass integer=true to round to a whole number (SAT, ACT).
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

  const [direction, setDirection] = useState<CollegeDirection>({
    majorCategory: "",
    specificMajor: "",
    selectivity: "",
  });

  function setAcademic(field: keyof AcademicInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
  }

  function setDir(field: keyof CollegeDirection, value: string) {
    setDirection((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
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
                onChange={(e) => setAcademic("gradeLevel", e.target.value)}
                className={SELECT_CLASS}
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
                step={0.1}
                placeholder="e.g. 3.7"
                value={info.unweightedGpa}
                onChange={(e) => setAcademic("unweightedGpa", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value)
                    setAcademic("unweightedGpa", clamp(e.target.value, 0, 4));
                }}
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

        {/* Section: College direction */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">College direction</h2>
            <p className="text-sm text-muted-foreground">
              Help AppGap understand where you're aiming and what field you're
              interested in pursuing.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              id="major-category"
              label="Academic interest / intended major"
            >
              <select
                id="major-category"
                value={direction.majorCategory}
                onChange={(e) => setDir("majorCategory", e.target.value)}
                className={SELECT_CLASS}
              >
                {MAJOR_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="specific-major"
              label="Specific intended major"
              hint="optional"
            >
              <Input
                id="specific-major"
                type="text"
                placeholder="e.g. Computational Biology, Finance, Architecture"
                value={direction.specificMajor}
                onChange={(e) => setDir("specificMajor", e.target.value)}
              />
            </Field>

            <Field id="selectivity" label="College goals / selectivity">
              <select
                id="selectivity"
                value={direction.selectivity}
                onChange={(e) => setDir("selectivity", e.target.value)}
                className={SELECT_CLASS}
              >
                {SELECTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Continue — sits below all sections */}
        <div className="flex justify-end">
          {/* TODO: wire up to step 2 (extracurriculars) */}
          <Button>
            Continue
            <ArrowRight />
          </Button>
        </div>
      </div>
    </main>
  );
}
