"use client";

import { Check, GraduationCap, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  addOnboardingCollege,
  getOnboardingCollegeData,
  type OnboardingCollege,
  removeOnboardingCollege,
} from "./college-target-actions";

/**
 * College-target selection for onboarding Step 3. Persists through SERVER
 * actions (server Supabase client), which resolve the user reliably from
 * cookies — the same path the protected dashboard uses. It does NOT use the
 * browser client's auth.getUser() for loading or writing, because that call was
 * hanging on this page (navigator.locks auth-token contention), which froze the
 * section and prevented any write. Picks land in the shared user_colleges table
 * idempotently, so they appear in My Colleges — no second list, no duplicates.
 *
 * Adding a college is OPTIONAL: younger/undecided students can skip this.
 */
export function OnboardingCollegeTargets() {
  const [colleges, setColleges] = useState<OnboardingCollege[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    // Load the search list + already-saved ids via the SERVER action, which
    // resolves the user reliably from cookies.
    (async () => {
      try {
        const data = await getOnboardingCollegeData();
        if (cancelled) return;
        setColleges(data.colleges);
        setSavedIds(new Set(data.savedIds));
      } catch {
        // Best-effort — leave the section empty if the load fails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(
    () => new Map(colleges.map((c) => [c.id, c])),
    [colleges],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return colleges
      .filter((c) => !savedIds.has(c.id) && c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, colleges, savedIds]);

  const savedList = useMemo(
    () =>
      [...savedIds]
        .map((id) => byId.get(id))
        .filter(Boolean) as OnboardingCollege[],
    [savedIds, byId],
  );

  function handleAdd(id: string) {
    setPendingId(id);
    setAddError(null);
    // Optimistic: reflect immediately, reconcile on failure.
    setSavedIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await addOnboardingCollege(id);
      if (!res.ok) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setAddError(res.error ?? "Couldn't save this college.");
      } else {
        setQuery("");
      }
      setPendingId(null);
    });
  }

  function handleRemove(id: string) {
    setPendingId(id);
    const prevHad = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    startTransition(async () => {
      const res = await removeOnboardingCollege(id);
      if (!res.ok && prevHad) {
        setSavedIds((prev) => new Set(prev).add(id));
        setAddError(res.error ?? "Couldn't remove this college.");
      }
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="font-semibold">College targets</h2>
        <p className="text-sm text-muted-foreground">
          Add the specific colleges you&apos;re considering. They&apos;ll appear
          in My Colleges automatically, and AppGap will estimate your chances at
          each. Optional — you can add these later if you&apos;re not sure yet.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search colleges by name…"
            className="pl-9"
            aria-label="Search colleges to add"
            disabled={loading}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {addError && <p className="text-xs text-destructive">{addError}</p>}

        {query.trim() && (
          <ul className="space-y-1">
            {results.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">
                No matching colleges in the database.
              </li>
            ) : (
              results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(c.id)}
                    disabled={pendingId === c.id}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-brand-teal/[0.06]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {c.name}
                      </span>
                      {(c.city || c.state) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                    {pendingId === c.id ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {savedList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {savedList.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/40 bg-brand-teal/[0.06] py-1 pl-3 pr-1.5 text-sm"
              >
                <Check className="size-3.5 text-brand-teal" />
                <span className="max-w-[14rem] truncate">{c.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(c.id)}
                  disabled={pendingId === c.id}
                  aria-label={`Remove ${c.name}`}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              <GraduationCap className="size-4 shrink-0" />
              No colleges added yet — search above, or skip and add them later.
            </div>
          )
        )}
      </div>
    </div>
  );
}
