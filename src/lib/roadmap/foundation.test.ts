import { describe, expect, it } from "vitest";
import {
  computeFoundationState,
  type FoundationInputs,
  hasClearMajor,
} from "./foundation";

function inputs(overrides: Partial<FoundationInputs> = {}): FoundationInputs {
  return {
    hasAnalysis: false,
    profileReadyForDiagnostic: true,
    diagnosticMissing: [],
    careerConfirmed: false,
    hasClearMajor: false,
    calendarConfirmed: false,
    journeyStarted: false,
    ...overrides,
  };
}

describe("hasClearMajor", () => {
  it("is false when empty or undecided", () => {
    expect(hasClearMajor("", "")).toBe(false);
    expect(hasClearMajor(null, null)).toBe(false);
    expect(hasClearMajor("undecided", "")).toBe(false);
    expect(hasClearMajor("", "undecided")).toBe(false);
  });
  it("is true for a real direction", () => {
    expect(hasClearMajor("cs", "")).toBe(true);
    expect(hasClearMajor("", "computer-science")).toBe(true);
  });
});

describe("computeFoundationState — diagnostic", () => {
  it("complete when an analysis exists", () => {
    expect(
      computeFoundationState(inputs({ hasAnalysis: true })).steps.diagnostic,
    ).toBe("complete");
  });
  it("needs info (attention) when the profile isn't diagnostic-ready", () => {
    const s = computeFoundationState(
      inputs({
        profileReadyForDiagnostic: false,
        diagnosticMissing: ["your grade level"],
      }),
    );
    expect(s.steps.diagnostic).toBe("attention");
    expect(s.diagnosticMissing).toEqual(["your grade level"]);
  });
  it("ready when profile is complete but no analysis yet", () => {
    expect(computeFoundationState(inputs()).steps.diagnostic).toBe("ready");
  });
});

describe("computeFoundationState — career", () => {
  it("complete only when confirmed, not by grade", () => {
    expect(
      computeFoundationState(inputs({ careerConfirmed: false })).steps.career,
    ).toBe("ready");
    expect(
      computeFoundationState(inputs({ careerConfirmed: true })).steps.career,
    ).toBe("complete");
  });
  it("offers to confirm an existing major when one exists and not yet confirmed", () => {
    const s = computeFoundationState(inputs({ hasClearMajor: true }));
    expect(s.careerCanConfirmExisting).toBe(true);
    const s2 = computeFoundationState(
      inputs({ hasClearMajor: true, careerConfirmed: true }),
    );
    expect(s2.careerCanConfirmExisting).toBe(false);
  });
});

describe("computeFoundationState — begin gate", () => {
  it("is locked until diagnostic + career + calendar are all complete", () => {
    expect(computeFoundationState(inputs()).steps.begin).toBe("locked");
    expect(
      computeFoundationState(
        inputs({ hasAnalysis: true, careerConfirmed: true }),
      ).steps.begin,
    ).toBe("locked");
  });
  it("is ready when the first three are complete and the journey hasn't started", () => {
    const s = computeFoundationState(
      inputs({
        hasAnalysis: true,
        careerConfirmed: true,
        calendarConfirmed: true,
      }),
    );
    expect(s.steps.begin).toBe("ready");
    expect(s.readyToBegin).toBe(true);
  });
  it("is complete once the journey has started", () => {
    const s = computeFoundationState(
      inputs({
        hasAnalysis: true,
        careerConfirmed: true,
        calendarConfirmed: true,
        journeyStarted: true,
      }),
    );
    expect(s.steps.begin).toBe("complete");
    expect(s.readyToBegin).toBe(false);
    expect(s.journeyStarted).toBe(true);
  });
});
