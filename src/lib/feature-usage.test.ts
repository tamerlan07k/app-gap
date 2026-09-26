import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { resolveFeatureAccess } from "./ai/config";
import { checkFeatureAllowance } from "./feature-usage";

// A minimal fake Supabase client whose feature_usage count query resolves to a
// fixed `count`. Each chain step (from → select → eq → eq → gte) returns a REAL
// Promise with the chain methods attached, so `await query` yields
// { count, error: null } — enough to exercise the real checkFeatureAllowance
// against the real FEATURE_ACCESS config, with no DB and no AI.
type CountQuery = Promise<{ count: number; error: null }> & {
  select: () => CountQuery;
  eq: () => CountQuery;
  gte: () => CountQuery;
};

function fakeClient(count: number): SupabaseClient {
  const make = (): CountQuery => {
    const q = Promise.resolve({ count, error: null }) as CountQuery;
    q.select = make;
    q.eq = make;
    q.gte = make;
    return q;
  };
  return { from: () => make() } as unknown as SupabaseClient;
}

describe("free-tier Awards caps — 5 per month each", () => {
  it("config: free awardsRecognition is 5/month", () => {
    const a = resolveFeatureAccess("awardsRecognition", "free");
    expect(a.enabled).toBe(true);
    expect(a.limit).toBe(5);
    expect(a.window).toBe("month");
  });

  it("config: free opportunityExperiment is 5/month", () => {
    const a = resolveFeatureAccess("opportunityExperiment", "free");
    expect(a.enabled).toBe(true);
    expect(a.limit).toBe(5);
    expect(a.window).toBe("month");
  });

  it("awardsRecognition (free): allows the 5th use, blocks the 6th", async () => {
    // 4 already used → the 5th is allowed.
    const fifth = await checkFeatureAllowance(
      fakeClient(4),
      "u",
      "awardsRecognition",
      "free",
    );
    expect(fifth.allowed).toBe(true);
    // 5 already used → the 6th is blocked.
    const sixth = await checkFeatureAllowance(
      fakeClient(5),
      "u",
      "awardsRecognition",
      "free",
    );
    expect(sixth.allowed).toBe(false);
    expect(sixth.enabled).toBe(true);
    expect(sixth.limit).toBe(5);
  });

  it("opportunityExperiment (free): allows the 5th use, blocks the 6th", async () => {
    const fifth = await checkFeatureAllowance(
      fakeClient(4),
      "u",
      "opportunityExperiment",
      "free",
    );
    expect(fifth.allowed).toBe(true);
    const sixth = await checkFeatureAllowance(
      fakeClient(5),
      "u",
      "opportunityExperiment",
      "free",
    );
    expect(sixth.allowed).toBe(false);
  });
});

describe("Pro Awards caps — 25 per month each (≈ $0.25/mo combined)", () => {
  for (const feature of [
    "awardsRecognition",
    "opportunityExperiment",
  ] as const) {
    it(`${feature} (pro) is 25/month and blocks the 26th`, async () => {
      const access = resolveFeatureAccess(feature, "pro");
      expect(access.limit).toBe(25);
      expect(access.window).toBe("month");

      const at25 = await checkFeatureAllowance(
        fakeClient(24),
        "u",
        feature,
        "pro",
      );
      expect(at25.allowed).toBe(true); // 25th use allowed
      const at26 = await checkFeatureAllowance(
        fakeClient(25),
        "u",
        feature,
        "pro",
      );
      expect(at26.allowed).toBe(false); // 26th blocked
    });
  }
});
