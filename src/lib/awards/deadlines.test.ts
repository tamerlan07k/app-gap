import { describe, expect, it } from "vitest";
import { daysBetween, nextDeadlineDate, resolveTiming } from "./deadlines";

// Fixed reference "now" so the date-aware logic is deterministic in tests.
const NOW = new Date(2026, 8, 26); // Sept 26, 2026 (month is 0-indexed)

describe("nextDeadlineDate — recurring, never a hardcoded year", () => {
  it("returns this year's date when it is still upcoming", () => {
    const d = nextDeadlineDate(11, 1, NOW); // Nov 1
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(1);
  });

  it("rolls to next year when this year's date has passed", () => {
    const d = nextDeadlineDate(2, 15, NOW); // Feb 15 already passed in Sept
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(1);
  });

  it("treats a deadline landing today as upcoming (not rolled forward)", () => {
    const d = nextDeadlineDate(9, 26, NOW);
    expect(d.getFullYear()).toBe(2026);
  });

  it("assumes mid-month when the exact day is unknown", () => {
    const d = nextDeadlineDate(10, null, NOW); // October, no day
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(15);
  });
});

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween(NOW, new Date(2026, 9, 6))).toBe(10);
  });
});

describe("resolveTiming — feasibility and urgency", () => {
  it("returns null for rolling opportunities (never late, never infeasible)", () => {
    expect(
      resolveTiming(
        {
          deadlineMonth: null,
          deadlineDay: null,
          estPrepDaysMin: 90,
          isRolling: true,
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("returns null when there is no deadline month", () => {
    expect(
      resolveTiming(
        {
          deadlineMonth: null,
          deadlineDay: null,
          estPrepDaysMin: 30,
          isRolling: false,
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("marks NOT feasible when the deadline is sooner than the prep time", () => {
    // Deadline ~Oct 15 (~19 days) but needs 90 days of prep.
    const t = resolveTiming(
      {
        deadlineMonth: 10,
        deadlineDay: 15,
        estPrepDaysMin: 90,
        isRolling: false,
      },
      NOW,
    );
    expect(t?.feasible).toBe(false);
  });

  it("marks feasible + urgent for a near deadline that needs little prep", () => {
    // Deadline ~Oct 15 (~19 days), quick 20-minute application (prep ~1 day).
    const t = resolveTiming(
      {
        deadlineMonth: 10,
        deadlineDay: 15,
        estPrepDaysMin: 1,
        isRolling: false,
      },
      NOW,
    );
    expect(t?.feasible).toBe(true);
    expect(t?.urgent).toBe(true);
  });

  it("is feasible but not urgent when the deadline is comfortably far off", () => {
    // Deadline Feb next year (~140+ days), needs 45 days.
    const t = resolveTiming(
      {
        deadlineMonth: 2,
        deadlineDay: 1,
        estPrepDaysMin: 45,
        isRolling: false,
      },
      NOW,
    );
    expect(t?.feasible).toBe(true);
    expect(t?.urgent).toBe(false);
  });

  it("assumes feasible when prep time is unknown (never penalize missing data)", () => {
    const t = resolveTiming(
      {
        deadlineMonth: 10,
        deadlineDay: 1,
        estPrepDaysMin: null,
        isRolling: false,
      },
      NOW,
    );
    expect(t?.feasible).toBe(true);
  });

  it("flags exactDay:false when only the month is known", () => {
    const t = resolveTiming(
      {
        deadlineMonth: 11,
        deadlineDay: null,
        estPrepDaysMin: 20,
        isRolling: false,
      },
      NOW,
    );
    expect(t?.exactDay).toBe(false);
  });
});
