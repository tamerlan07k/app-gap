import { describe, expect, it, type Mock, vi } from "vitest";
import {
  type GenerationDeps,
  type ReserveOutcome,
  type RoadmapStore,
  runRoadmapGeneration,
} from "./generation";
import type { SavedMilestone, StoredRoadmap } from "./types";

const SAMPLE: SavedMilestone[] = [
  { id: "acad-coursework", branch: "academics", state: "upcoming" },
  { id: "essay-requirements", branch: "essays", state: "upcoming" },
];

/** In-memory store that mirrors the real store's atomic reserve semantics:
 *  a row can exist at most once, and reserve() check-and-sets synchronously (so
 *  concurrent callers race deterministically the way the unique DB constraint
 *  forces in production). */
class MemStore implements RoadmapStore {
  row: StoredRoadmap | null;
  constructor(initial: StoredRoadmap | null = null) {
    this.row = initial;
  }
  get(): Promise<StoredRoadmap | null> {
    return Promise.resolve(this.row);
  }
  reserve(): Promise<ReserveOutcome> {
    if (!this.row) {
      this.row = { status: "generating", milestones: [], nextStepId: null };
      return Promise.resolve("reserved");
    }
    if (this.row.status === "failed") {
      this.row = { status: "generating", milestones: [], nextStepId: null };
      return Promise.resolve("recovered");
    }
    return Promise.resolve("exists");
  }
  markReady(
    milestones: SavedMilestone[],
    nextStepId: string | null,
  ): Promise<void> {
    this.row = { status: "ready", milestones, nextStepId };
    return Promise.resolve();
  }
  markFailed(error: string): Promise<void> {
    this.row = { status: "failed", milestones: [], nextStepId: null, error };
    return Promise.resolve();
  }
}

function makeDeps(overrides: Partial<GenerationDeps> = {}): {
  deps: GenerationDeps;
  usage: { count: number };
  generate: Mock<() => Promise<SavedMilestone[]>>;
} {
  const usage = { count: 0 };
  const generate = vi.fn<() => Promise<SavedMilestone[]>>(async () => SAMPLE);
  const deps: GenerationDeps = {
    store: new MemStore(),
    isPro: true,
    unlimited: false,
    checkAllowance: async () => ({ allowed: usage.count < 1, enabled: true }),
    generate,
    recordUsage: async () => {
      usage.count += 1;
    },
    deriveNextStep: (ms) => ms[0]?.id ?? null,
    ...overrides,
  };
  return { deps, usage, generate };
}

describe("runRoadmapGeneration — gating", () => {
  it("free users cannot generate", async () => {
    const { deps, generate } = makeDeps({ isPro: false });
    const result = await runRoadmapGeneration(deps);
    expect(result.status).toBe("not_pro");
    expect(generate).not.toHaveBeenCalled();
  });

  it("a Pro user generates their first roadmap and consumes one use", async () => {
    const { deps, usage, generate } = makeDeps();
    const result = await runRoadmapGeneration(deps);
    expect(result.status).toBe("ready");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(usage.count).toBe(1);
  });

  it("blocks generation when the lifetime allowance is already used", async () => {
    const { deps, generate } = makeDeps({
      checkAllowance: async () => ({ allowed: false, enabled: true }),
    });
    const result = await runRoadmapGeneration(deps);
    expect(result.status).toBe("limit_reached");
    expect(generate).not.toHaveBeenCalled();
  });

  it("admin (unlimited) never records usage", async () => {
    const { deps, usage } = makeDeps({ unlimited: true });
    const result = await runRoadmapGeneration(deps);
    expect(result.status).toBe("ready");
    expect(usage.count).toBe(0);
  });
});

describe("runRoadmapGeneration — one roadmap, ever", () => {
  it("a second request returns the saved roadmap without regenerating", async () => {
    const store = new MemStore();
    const { deps: deps1, usage, generate } = makeDeps({ store });
    await runRoadmapGeneration(deps1);

    // Second request: same store, allowance now exhausted.
    const { deps: deps2 } = makeDeps({
      store,
      generate,
      checkAllowance: async () => ({ allowed: false, enabled: true }),
      recordUsage: async () => {
        usage.count += 1;
      },
    });
    const second = await runRoadmapGeneration(deps2);

    expect(second.status).toBe("ready");
    expect(generate).toHaveBeenCalledTimes(1); // not called again
    expect(usage.count).toBe(1); // no second use consumed
  });

  it("concurrent requests cannot create two roadmaps or consume two uses", async () => {
    const store = new MemStore();
    const usage = { count: 0 };
    const generate = vi.fn(async () => {
      await Promise.resolve(); // yield so the two calls interleave
      return SAMPLE;
    });
    const mk = (): GenerationDeps => ({
      store,
      isPro: true,
      unlimited: false,
      checkAllowance: async () => ({ allowed: usage.count < 1, enabled: true }),
      generate,
      recordUsage: async () => {
        usage.count += 1;
      },
      deriveNextStep: (ms) => ms[0]?.id ?? null,
    });

    const [a, b] = await Promise.all([
      runRoadmapGeneration(mk()),
      runRoadmapGeneration(mk()),
    ]);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(usage.count).toBe(1);
    expect(store.row?.status).toBe("ready");
    // One ready; the other is ready (saw the finished row) or in_progress.
    const statuses = [a.status, b.status].sort();
    expect(statuses).toContain("ready");
    expect(statuses.every((s) => s === "ready" || s === "in_progress")).toBe(
      true,
    );
  });
});

describe("runRoadmapGeneration — failure recovery", () => {
  it("a failed generation is recoverable and consumes no allowance", async () => {
    const store = new MemStore();
    const usage = { count: 0 };
    const generate = vi
      .fn<() => Promise<SavedMilestone[]>>()
      .mockRejectedValueOnce(new Error("gateway down"))
      .mockResolvedValueOnce(SAMPLE);

    const mk = (): GenerationDeps => ({
      store,
      isPro: true,
      unlimited: false,
      checkAllowance: async () => ({ allowed: usage.count < 1, enabled: true }),
      generate,
      recordUsage: async () => {
        usage.count += 1;
      },
      deriveNextStep: (ms) => ms[0]?.id ?? null,
    });

    const first = await runRoadmapGeneration(mk());
    expect(first.status).toBe("failed");
    expect(usage.count).toBe(0); // allowance intact
    expect(store.row?.status).toBe("failed");

    // Retry succeeds (recovers the failed reservation).
    const second = await runRoadmapGeneration(mk());
    expect(second.status).toBe("ready");
    expect(usage.count).toBe(1);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("propagates an allowance-check failure (route fails closed)", async () => {
    const { deps } = makeDeps({
      checkAllowance: async () => {
        throw new Error("ledger unreachable");
      },
    });
    await expect(runRoadmapGeneration(deps)).rejects.toThrow(
      "ledger unreachable",
    );
  });
});
