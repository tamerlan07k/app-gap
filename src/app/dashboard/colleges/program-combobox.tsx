"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  filterProgramsByQuery,
  programDegreeLabel,
  type SelectorProgram,
} from "~/lib/colleges/program-selection";
import { cn } from "~/lib/utils";

const CAP = 50; // max option rows rendered — keeps 100+-program colleges light

/**
 * Searchable / typeahead program picker for single-admission colleges
 * (University → Program → Degree). Filters the college's already-loaded program
 * list client-side (never all 20k — the parent queries one college's programs),
 * caps the rendered rows, and stays usable for colleges with 30–100+ programs.
 * "Not sure yet" (clear) is always available; nothing is fabricated.
 */
export function ProgramCombobox({
  programs,
  value,
  onChange,
}: {
  programs: SelectorProgram[];
  value: string;
  onChange: (programId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => programs.find((p) => p.id === value) ?? null,
    [programs, value],
  );

  const { items, total, truncated } = useMemo(
    () => filterProgramsByQuery(programs, query, CAP),
    [programs, query],
  );

  // Options include a leading "Not sure yet" clear row (index 0).
  const optionCount = items.length + 1;
  useEffect(() => {
    if (highlight > optionCount - 1) setHighlight(0);
  }, [highlight, optionCount]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function commit(programId: string) {
    onChange(programId);
    setOpen(false);
    setQuery("");
  }

  function openMenu() {
    setOpen(true);
    setQuery("");
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      openMenu();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight === 0) commit("");
      else commit(items[highlight - 1]?.id ?? "");
    }
  }

  return (
    <div className="block text-xs">
      <span className="mb-1 block text-muted-foreground">Program</span>
      <div className="relative" ref={rootRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={open ? query : (selected?.name ?? "")}
            placeholder={selected ? selected.name : "Search programs…"}
            onFocus={openMenu}
            onChange={(e) => {
              if (!open) setOpen(true);
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            className={cn(
              "h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-14 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30",
              !open && !selected && "text-muted-foreground",
            )}
          />
          {selected && !open && (
            <button
              type="button"
              aria-label="Clear program"
              onClick={() => commit("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Programs"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
          >
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onMouseEnter={() => setHighlight(0)}
              onClick={() => commit("")}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm",
                highlight === 0 ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="text-muted-foreground">Not sure yet</span>
              {value === "" && <Check className="size-3.5 text-brand-teal" />}
            </button>

            {items.map((p, i) => {
              const idx = i + 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={p.id === value}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => commit(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm",
                    highlight === idx ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="min-w-0 truncate">{p.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {p.degree && (
                      <span className="rounded bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-teal">
                        {p.degree}
                      </span>
                    )}
                    {p.id === value && (
                      <Check className="size-3.5 text-brand-teal" />
                    )}
                  </span>
                </button>
              );
            })}

            {items.length === 0 && (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                No matching programs.
              </p>
            )}
            {truncated && (
              <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Showing {CAP} of {total} — keep typing to narrow.
              </p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Grants:{" "}
          <span className="font-medium text-foreground/70">
            {programDegreeLabel(selected)}
          </span>
        </p>
      )}
    </div>
  );
}
