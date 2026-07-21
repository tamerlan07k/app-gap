"use client";

import { Bell, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface BillingNotification {
  id: string;
  type: "granted" | "expired";
  tier: "free" | "pro";
  duration_label: string | null;
  expires_at: string | null;
  message: string;
  created_at: string;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function tierLabel(tier: "free" | "pro"): string {
  return tier === "pro" ? "Pro" : "Free";
}

export function SubscriptionNotification({
  notifications,
}: {
  notifications: BillingNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);

  const hasUnread = items.length > 0;

  async function handleOpen() {
    setOpen(true);
    if (items.length === 0) return;
    // Mark everything currently shown as read; badge clears optimistically.
    const ids = items.map((n) => n.id);
    try {
      await fetch("/api/billing/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // Non-fatal: the badge stays cleared for this view; server retries next load.
    }
    setItems([]);
  }

  // Show the most recent notification (they're pre-sorted newest first). If the
  // user had no unread items we still render a disabled bell for consistency.
  const active = notifications[0] ?? null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Subscription notifications"
        className="relative inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/60" />
            <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {items.length}
            </span>
          </span>
        )}
      </button>

      {open && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <NotificationCard
            notification={active}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}

function NotificationCard({
  notification,
  onClose,
}: {
  notification: BillingNotification;
  onClose: () => void;
}) {
  const isGranted = notification.type === "granted";
  const expires = formatDate(notification.expires_at);

  return (
    <div
      className={cn(
        "animate-fade-up relative z-10 w-full max-w-md overflow-hidden rounded-3xl border bg-card shadow-2xl",
        isGranted ? "border-brand-teal/40" : "border-amber-500/40",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div
        className={cn(
          "flex flex-col items-center gap-3 px-8 pt-8 pb-6 text-center",
          isGranted
            ? "bg-gradient-to-b from-brand-teal/10 to-transparent"
            : "bg-gradient-to-b from-amber-500/10 to-transparent",
        )}
      >
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl",
            isGranted
              ? "bg-brand-teal/15 text-brand-teal"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          )}
        >
          <Sparkles className="size-7" />
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          {isGranted
            ? "Your subscription has been updated"
            : "Your complimentary plan has expired"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isGranted ? "Updated by the AppGap Admin." : notification.message}
        </p>
      </div>

      {isGranted && (
        <div className="space-y-3 px-8 py-6">
          <DetailRow
            label="Current Plan"
            value={tierLabel(notification.tier)}
          />
          {notification.duration_label && (
            <DetailRow label="Duration" value={notification.duration_label} />
          )}
          {expires && <DetailRow label="Expires" value={expires} />}
          <p className="pt-2 text-center text-sm font-medium text-brand-teal">
            Enjoy your premium features.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border px-8 py-5">
        {!isGranted && (
          <Button
            asChild
            className="h-10 rounded-xl bg-brand-teal text-white hover:bg-brand-teal/90"
          >
            <Link href="/dashboard/billing" onClick={onClose}>
              Billing
            </Link>
          </Button>
        )}
        <Button
          variant={isGranted ? "default" : "outline"}
          onClick={onClose}
          className={cn(
            "h-10 rounded-xl",
            isGranted && "bg-brand-teal text-white hover:bg-brand-teal/90",
          )}
        >
          {isGranted ? "Got it" : "Maybe later"}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
