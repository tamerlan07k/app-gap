"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { addCollege } from "./actions";

export interface AddableCollege {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export function AddCollege({ colleges }: { colleges: AddableCollege[] }) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return colleges.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, colleges]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a college by name…"
          className="pl-9"
          aria-label="Search colleges to add"
        />
      </div>

      {query.trim() && (
        <ul className="mt-2 space-y-1">
          {results.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted-foreground">
              No matching colleges in the database.
            </li>
          ) : (
            results.map((c) => {
              const added = addedIds.has(c.id);
              const loading = pendingId === c.id && isPending;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={added || loading}
                    onClick={() => {
                      setPendingId(c.id);
                      startTransition(async () => {
                        const res = await addCollege(c.id);
                        if (res.ok) {
                          setAddedIds((prev) => new Set(prev).add(c.id));
                        }
                      });
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      added
                        ? "text-muted-foreground"
                        : "hover:bg-brand-teal/[0.06]",
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
                    {added ? (
                      <Check className="size-4 shrink-0 text-brand-teal" />
                    ) : (
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
