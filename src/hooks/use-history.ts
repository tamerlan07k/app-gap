"use client";

// Generic undo/redo history for a single immutable state snapshot.
//
// Each onboarding page manages one "committed" object (its persisted fields and
// lists). Wrapping that object here gives the page undo/redo without changing
// how it reads or renders state — `state` is used exactly like a useState value.
//
// Coalescing: rapid edits that share a `coalesceKey` (e.g. typing into the same
// field) collapse into a single undo step instead of one step per keystroke.
// Discrete actions (adding/deleting an item) omit the key and always push a new
// step.
//
// The last coalesce key lives inside the history state (not a ref) so the state
// updater stays pure — React StrictMode double-invokes updaters in dev, and a
// ref mutated inside the updater would make coalescing misfire on the replay.

import { useCallback, useState } from "react";

// Cap history so long editing sessions can't grow memory without bound.
const MAX_HISTORY = 100;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  // coalesceKey of the last committed `set`; a matching key merges in place.
  lastKey: string | null;
}

export interface UseHistoryResult<T> {
  /** Current snapshot — read this like a normal state value. */
  state: T;
  /** Push a new snapshot. Pass a `coalesceKey` to merge consecutive edits. */
  set: (next: T | ((prev: T) => T), options?: { coalesceKey?: string }) => void;
  undo: () => void;
  redo: () => void;
  /** Replace the baseline with no undo step (e.g. after loading saved data). */
  reset: (value: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory<T>(initial: T): UseHistoryResult<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
    lastKey: null,
  });

  const set = useCallback<UseHistoryResult<T>["set"]>((next, options) => {
    setHistory((h) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(h.present) : next;
      if (Object.is(resolved, h.present)) return h;

      const key = options?.coalesceKey ?? null;
      // Same field edited again in a row: replace the value, keep one undo step.
      if (key !== null && key === h.lastKey) {
        return { ...h, present: resolved, future: [] };
      }

      const past = [...h.past, h.present];
      if (past.length > MAX_HISTORY) past.shift();
      return { past, present: resolved, future: [], lastKey: key };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1] as T;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
        lastKey: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0] as T;
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
        lastKey: null,
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [], lastKey: null });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
