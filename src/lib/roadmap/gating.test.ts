import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { resolveFeatureAccess } from "~/lib/ai/config";
import { checkFeatureAllowance } from "~/lib/feature-usage";

// Minimal fake client whose feature_usage count resolves to a fixed value.
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

describe("roadmap + calendar generation gating (free + Pro, lifetime-once)", () => {
  for (const feature of ["roadmapGeneration", "calendarGeneration"] as const) {
    for (const tier of ["free", "pro"] as const) {
      it(`${feature} (${tier}) is enabled, 1 per lifetime`, () => {
        const a = resolveFeatureAccess(feature, tier);
        expect(a.enabled).toBe(true);
        expect(a.limit).toBe(1);
        expect(a.window).toBe("lifetime");
      });

      it(`${feature} (${tier}) allows the first generation, blocks the second`, async () => {
        const first = await checkFeatureAllowance(
          fakeClient(0),
          "u",
          feature,
          tier,
        );
        expect(first.allowed).toBe(true);
        const second = await checkFeatureAllowance(
          fakeClient(1),
          "u",
          feature,
          tier,
        );
        expect(second.allowed).toBe(false);
        expect(second.enabled).toBe(true);
      });
    }
  }

  it("calendarGeneration has no model (fully deterministic, no AI cost)", () => {
    expect(
      resolveFeatureAccess("calendarGeneration", "pro").model,
    ).toBeUndefined();
    expect(
      resolveFeatureAccess("calendarGeneration", "free").model,
    ).toBeUndefined();
  });
});
