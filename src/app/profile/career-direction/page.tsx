"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CareerDirection {
  majorCategory: string;
  specificMajor: string;
  careerInterest: string;
  selectivity: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

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
  { value: "law", label: "Pre-Law / Legal Studies" },
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

// ─── Field helper ────────────────────────────────────────────────────────────

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

export default function CareerDirectionPage() {
  const [direction, setDirection] = useState<CareerDirection>({
    majorCategory: "",
    specificMajor: "",
    careerInterest: "",
    selectivity: "",
  });

  function setDir(field: keyof CareerDirection, value: string) {
    setDirection((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 2 of 5
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Career direction</h1>
          <p className="leading-relaxed text-muted-foreground">
            Help AppGap understand where you&apos;re aiming and what field
            you&apos;re interested in pursuing. This shapes how your profile is
            evaluated.
          </p>
        </div>

        {/* Section: Intended major */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">Intended major</h2>
            <p className="text-sm text-muted-foreground">
              Choose a broad category, then optionally name a specific major
              you&apos;re considering.
            </p>
          </div>

          <div className="space-y-5">
            <Field id="major-category" label="Academic interest / intended major">
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

        {/* Section: College goals */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">College goals</h2>
            <p className="text-sm text-muted-foreground">
              What kind of schools are you targeting? This helps calibrate
              where your profile currently stands relative to your goals.
            </p>
          </div>

          <div className="space-y-5">
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

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/profile/activities">
              Continue
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
