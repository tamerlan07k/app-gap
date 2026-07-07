"use client";

import { Check, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

const FREE_FEATURES = [
  "Full college profile evaluation",
  "AI roadmap generation",
  "Basic recommendations",
  "1 roadmap generation per month",
  "Standard AI models",
];

const PRO_FEATURES = [
  "Everything in Free, plus:",
  "4 roadmap generations per month",
  "Latest premium reasoning AI models",
  "More detailed evaluations",
  "Stronger strategic recommendations",
  "Better essay & application guidance",
  "Higher-quality personalized analysis",
  "Early access to new AppGap features",
];

interface BillingCardsProps {
  isPro: boolean;
  currentPeriodEnd: string | null;
}

export function BillingCards({ isPro, currentPeriodEnd }: BillingCardsProps) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  const formattedDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  async function handleCheckout() {
    setLoading("checkout");
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Free Card */}
      <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Free
            </p>
            {!isPro && (
              <span className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                Current Plan
              </span>
            )}
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-3xl font-bold tracking-tight">$0</span>
            <span className="mb-1 text-sm text-muted-foreground">/month</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Start evaluating your college profile.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <ul className="flex flex-col gap-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-2">
            <div className="flex h-10 items-center justify-center rounded-xl border border-border text-sm font-medium text-muted-foreground">
              Your current plan
            </div>
          </div>
        </div>
      </div>

      {/* Pro Card */}
      <div className="flex flex-col rounded-2xl border-2 border-brand-teal bg-brand-teal/[0.04] shadow-md">
        <div className="border-b border-brand-teal/20 px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Most Popular
            </p>
            {isPro && (
              <span className="rounded-full bg-brand-teal px-2.5 py-0.5 text-xs font-semibold text-white">
                Current Plan
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-3xl font-bold tracking-tight">$14.99</span>
            <span className="mt-2 text-sm text-muted-foreground">/month</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium AI for serious college applicants.
          </p>
          {isPro && formattedDate && (
            <p className="mt-2 text-xs text-muted-foreground">
              Renews {formattedDate}
            </p>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <ul className="flex flex-col gap-2.5">
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className={cn(
                  "flex items-start gap-2.5 text-sm",
                  f.startsWith("Everything") && "font-medium",
                )}
              >
                {!f.startsWith("Everything") && (
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                )}
                {f.startsWith("Everything") && (
                  <span className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            {!isPro ? (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading !== null}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-teal text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading === "checkout" && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Upgrade to Pro
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={loading !== null}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-teal text-sm font-medium text-brand-teal transition-colors hover:bg-brand-teal/10 disabled:opacity-60"
                >
                  {loading === "portal" && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Manage Subscription
                </button>
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={loading !== null}
                  className="flex h-10 items-center justify-center rounded-xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Update Payment Method
                </button>
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={loading !== null}
                  className="flex h-10 items-center justify-center rounded-xl border border-destructive/40 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-60"
                >
                  Cancel Subscription
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="flex flex-col rounded-2xl border border-border bg-brand-dark opacity-75 shadow-sm">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-white/50" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Coming Soon
            </p>
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-3xl font-bold tracking-tight text-white">
              —
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Our next-generation AI membership is currently in development.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <Lock className="size-8 text-white/20" />
              <p className="text-sm text-white/40">
                Stay tuned for something exceptional.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="flex h-10 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-white/20"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
