import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// AppGap Score / chancing ISOLATION guard.
//
// Coursework is a profile-analysis feature and must never silently influence the
// AppGap Score or the per-college chancing engine. This test enforces that at the
// source level: no module in src/lib/coursework may import from the scoring or
// chancing internals. If a future change wires coursework into scoring, this test
// fails loudly — which is the intended, explicit-approval-required checkpoint.

const dir = fileURLToPath(new URL(".", import.meta.url));

const FORBIDDEN = [
  "~/lib/ai/prompt",
  "~/lib/ai/score",
  "~/lib/ai/schema",
  "~/lib/ai/analyze-profile",
  "~/lib/colleges/assessment",
  "~/lib/colleges/strength",
  "~/lib/colleges/matching",
];

describe("coursework engine isolation from scoring/chancing", () => {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  );

  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} imports no scoring/chancing internals`, () => {
      const src = readFileSync(new URL(file, import.meta.url), "utf8");
      for (const forbidden of FORBIDDEN) {
        expect(
          src.includes(forbidden),
          `${file} must not import ${forbidden}`,
        ).toBe(false);
      }
    });
  }
});
