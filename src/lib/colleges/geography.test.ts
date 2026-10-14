import { describe, expect, it } from "vitest";
import {
  allowedStatesFor,
  detectState,
  statesWithBordering,
} from "./geography";

describe("detectState", () => {
  it("detects a full state name (case-insensitive, word-bounded)", () => {
    expect(detectState("Austin, Texas")).toBe("TX");
    expect(detectState("i live in california")).toBe("CA");
  });

  it("prefers the longest matching name (West Virginia ≠ Virginia)", () => {
    expect(detectState("Charleston, West Virginia")).toBe("WV");
  });

  it("detects a standalone uppercase 2-letter USPS code", () => {
    expect(detectState("Brooklyn, NY")).toBe("NY");
    expect(detectState("Boston, MA")).toBe("MA");
  });

  it("does not false-match lowercase English words that collide with codes", () => {
    // "in" / "or" are common words AND state codes — must not trigger a state.
    expect(detectState("somewhere in the suburbs")).toBeNull();
    expect(detectState("coffee or tea")).toBeNull();
  });

  it("returns null when nothing confident is found", () => {
    expect(detectState("")).toBeNull();
    expect(detectState(null)).toBeNull();
    expect(detectState("the moon")).toBeNull();
  });
});

describe("statesWithBordering", () => {
  it("includes the state itself plus its land neighbors", () => {
    const set = statesWithBordering("NY");
    expect(set.has("NY")).toBe(true);
    expect(set.has("NJ")).toBe(true);
    expect(set.has("PA")).toBe(true);
    expect(set.has("CA")).toBe(false);
  });

  it("degenerates to just the state for non-contiguous states", () => {
    expect([...statesWithBordering("HI")]).toEqual(["HI"]);
  });
});

describe("allowedStatesFor", () => {
  it("returns null (no restriction) for the standard filter", () => {
    expect(allowedStatesFor({ kind: "none" }, "TX")).toBeNull();
  });

  it("returns null when a state-based filter has no known state", () => {
    expect(allowedStatesFor({ kind: "state" }, null)).toBeNull();
    expect(allowedStatesFor({ kind: "bordering" }, null)).toBeNull();
  });

  it("restricts to the student's own state", () => {
    const set = allowedStatesFor({ kind: "state" }, "TX");
    expect([...(set ?? [])]).toEqual(["TX"]);
  });

  it("resolves a named region to its member states", () => {
    const set = allowedStatesFor({ kind: "region", region: "southwest" }, null);
    expect(set?.has("TX")).toBe(true);
    expect(set?.has("NY")).toBe(false);
  });
});
