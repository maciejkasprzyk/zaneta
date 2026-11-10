import { describe, expect, it } from "vitest";
import { addRecurrence, formatRecurrence, nextOccurrence } from "./recurrence";

describe("addRecurrence", () => {
  it("adds days, weeks, months and years", () => {
    expect(addRecurrence("2026-11-10", { interval: 1, unit: "day" })).toBe(
      "2026-11-11",
    );
    expect(addRecurrence("2026-11-10", { interval: 2, unit: "week" })).toBe(
      "2026-11-24",
    );
    expect(addRecurrence("2026-11-10", { interval: 3, unit: "month" })).toBe(
      "2027-02-10",
    );
    expect(addRecurrence("2026-11-10", { interval: 1, unit: "year" })).toBe(
      "2027-11-10",
    );
  });

  it("clamps the day of month", () => {
    expect(addRecurrence("2027-01-31", { interval: 1, unit: "month" })).toBe(
      "2027-02-28",
    );
    expect(addRecurrence("2028-02-29", { interval: 1, unit: "year" })).toBe(
      "2029-02-28",
    );
  });
});

describe("nextOccurrence", () => {
  const now = new Date(2026, 10, 10, 12);

  it("moves one step forward from the due date", () => {
    expect(
      nextOccurrence("2026-11-10", { interval: 1, unit: "week" }, now),
    ).toBe("2026-11-17");
  });

  it("skips occurrences that are already in the past", () => {
    expect(
      nextOccurrence("2026-11-01", { interval: 1, unit: "day" }, now),
    ).toBe("2026-11-10");
  });

  it("starts from today when the task has no date", () => {
    expect(nextOccurrence(null, { interval: 1, unit: "day" }, now)).toBe(
      "2026-11-11",
    );
  });
});

describe("formatRecurrence", () => {
  it("formats in Polish", () => {
    expect(formatRecurrence({ interval: 1, unit: "day" })).toBe("Codziennie");
    expect(formatRecurrence({ interval: 2, unit: "week" })).toBe(
      "Co 2 tygodnie",
    );
    expect(formatRecurrence({ interval: 5, unit: "month" })).toBe(
      "Co 5 miesięcy",
    );
    expect(formatRecurrence({ interval: 12, unit: "year" })).toBe("Co 12 lat");
    expect(formatRecurrence(null)).toBe("");
  });
});
