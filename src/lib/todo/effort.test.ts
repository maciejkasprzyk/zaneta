import { describe, expect, it } from "vitest";
import { formatEffort, splitEffort, sumEffort, toMinutes } from "./effort";

describe("effort", () => {
  it("converts hours and minutes to minutes", () => {
    expect(toMinutes(1.5, "h")).toBe(90);
    expect(toMinutes(45, "min")).toBe(45);
    expect(toMinutes(0, "min")).toBeNull();
    expect(toMinutes(Number.NaN, "h")).toBeNull();
  });

  it("formats minutes", () => {
    expect(formatEffort(45)).toBe("45 min");
    expect(formatEffort(120)).toBe("2 h");
    expect(formatEffort(90)).toBe("1 h 30 min");
    expect(formatEffort(null)).toBe("");
  });

  it("picks a unit for editing", () => {
    expect(splitEffort(90)).toEqual({ value: "1.5", unit: "h" });
    expect(splitEffort(40)).toEqual({ value: "40", unit: "min" });
    expect(splitEffort(null)).toEqual({ value: "", unit: "min" });
  });

  it("sums effort", () => {
    expect(
      sumEffort([
        { effortMinutes: 30 },
        { effortMinutes: null },
        { effortMinutes: 60 },
      ]),
    ).toBe(90);
  });
});
