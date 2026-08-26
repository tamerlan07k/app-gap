"use client";

// Clickable step indicator shown at the top of every onboarding page.
//
// One bar per step. Steps up to and including the current one are green;
// the current step also gets a ring. Hovering (or keyboard-focusing) a bar
// reveals the page name, and clicking it jumps straight to that step — so a
// returning user can skip the Back/Back/Continue/Continue shuffle.

import Link from "next/link";
import { cn } from "~/lib/utils";

interface Step {
  href: string;
  label: string;
}

const STEPS: Step[] = [
  { href: "/profile", label: "Academic profile" },
  { href: "/profile/school-type", label: "High school" },
  { href: "/profile/career-direction", label: "Career direction" },
  { href: "/profile/activities", label: "Activities & impact" },
  { href: "/profile/personal-statement", label: "Personal statement" },
  { href: "/profile/review", label: "Review & generate" },
];

export function OnboardingStepper({ current }: { current: number }) {
  return (
    <nav aria-label="Onboarding progress" className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber <= current;
        const isCurrent = stepNumber === current;

        return (
          <Link
            key={step.href}
            href={step.href}
            aria-label={`Step ${stepNumber} of ${STEPS.length}: ${step.label}`}
            aria-current={isCurrent ? "step" : undefined}
            className="group relative flex-1 rounded-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* Bar */}
            <span
              className={cn(
                "block h-2 rounded-full transition-colors",
                isComplete
                  ? "bg-brand-teal"
                  : "bg-border group-hover:bg-muted-foreground/40",
                isCurrent && "ring-2 ring-brand-teal/40",
              )}
            />

            {/* Tooltip — appears on hover or keyboard focus */}
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 scale-95 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
            >
              {step.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
