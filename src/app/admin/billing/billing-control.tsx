"use client";

import {
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  assignSubscription,
  getBillingMethod,
  revokeOverride,
} from "./actions";

export interface BillingUser {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  effectiveTier: "free" | "pro";
  source: "admin_override" | "stripe";
  status: string | null;
  expiresAt: string | null;
  stripeCustomerId: string | null;
  hasStripeSubscription: boolean;
  hasActiveOverride: boolean;
  overrideTier: "free" | "pro" | null;
  overrideExpiresAt: string | null;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tierLabel(tier: "free" | "pro"): string {
  return tier === "pro" ? "Pro" : "Free";
}

export function BillingControl({ users }: { users: BillingUser[] }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      )
    : users;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name…"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No users match “{query}”.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => {
              const isOpen = expandedId === u.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : u.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {u.name || u.email}
                      </p>
                      {u.name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        u.effectiveTier === "pro"
                          ? "bg-brand-teal/10 text-brand-teal"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tierLabel(u.effectiveTier)}
                    </span>
                    {u.hasActiveOverride && (
                      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 sm:inline-flex dark:bg-amber-900/30 dark:text-amber-400">
                        <ShieldCheck className="size-3" />
                        Override
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && <UserDetail user={u} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function UserDetail({ user }: { user: BillingUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<string | null | undefined>(undefined);
  const [tier, setTier] = useState<"free" | "pro">(
    user.overrideTier ?? user.effectiveTier,
  );
  const [duration, setDuration] = useState("1");
  const [customDate, setCustomDate] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (user.stripeCustomerId) {
      getBillingMethod(user.id).then((r) => {
        if (active) setMethod(r.method);
      });
    } else {
      setMethod(null);
    }
    return () => {
      active = false;
    };
  }, [user.id, user.stripeCustomerId]);

  function handleAssign() {
    setMsg(null);
    startTransition(async () => {
      const res = await assignSubscription({
        userId: user.id,
        tier,
        durationMonths: duration === "custom" ? null : Number(duration),
        customEndDate: duration === "custom" ? customDate : null,
      });
      if (res.ok) {
        setMsg({
          ok: true,
          text: "Subscription assigned. The user has been notified.",
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  function handleRevoke() {
    setMsg(null);
    startTransition(async () => {
      const res = await revokeOverride(user.id);
      if (res.ok) {
        setMsg({ ok: true, text: "Override revoked." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  const methodDisplay =
    method === undefined ? "Loading…" : (method ?? "None on file");

  return (
    <div className="border-t border-border bg-muted/20 px-5 py-5">
      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Detail label="Current tier" value={tierLabel(user.effectiveTier)} />
        <Detail
          label="Status"
          value={
            user.status
              ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
              : "—"
          }
        />
        <Detail label="Expires" value={formatDate(user.expiresAt)} />
        <Detail
          label="Source"
          value={user.source === "admin_override" ? "Admin override" : "Stripe"}
        />
        <Detail label="Billing method" value={methodDisplay} />
        <Detail
          label="Stripe customer ID"
          value={user.stripeCustomerId ?? "None"}
          mono
        />
      </div>

      {user.hasActiveOverride && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Active complimentary override —{" "}
            {user.overrideTier ? tierLabel(user.overrideTier) : "Pro"} until{" "}
            {formatDate(user.overrideExpiresAt)}. The user is not being charged.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevoke}
            disabled={pending}
            className="shrink-0"
          >
            Revoke
          </Button>
        </div>
      )}

      {/* Assign form */}
      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-brand-teal" />
          Assign complimentary subscription
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Plan
            </span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as "free" | "pro")}
              className={SELECT_CLASS}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Duration
            </span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="1">1 Month</option>
              <option value="2">2 Months</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
              <option value="custom">Custom…</option>
            </select>
          </label>
          {duration === "custom" && (
            <label htmlFor="custom-end-date" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                End date
              </span>
              <Input
                id="custom-end-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleAssign}
            disabled={pending || (duration === "custom" && !customDate)}
            className="bg-brand-teal text-white hover:bg-brand-teal/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Assign Subscription
          </Button>
          {msg && (
            <p
              className={cn(
                "text-xs font-medium",
                msg.ok ? "text-brand-teal" : "text-destructive",
              )}
            >
              {msg.text}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The user is never charged during the override. Any active Stripe
          subscription is paused (not cancelled) and resumes automatically when
          the override expires.
        </p>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-medium",
          mono && "font-mono text-xs",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
