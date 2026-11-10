import { describe, expect, it } from "vitest";
import { daysFromToday, formatDueDate, isOverdue, toISODate } from "./dates";

const now = new Date(2026, 10, 10, 15, 30); // 10 Nov 2026, local time

describe("dates", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(toISODate(now)).toBe("2026-11-10");
  });

  it("counts days from today", () => {
    expect(daysFromToday("2026-11-10", now)).toBe(0);
    expect(daysFromToday("2026-11-12", now)).toBe(2);
    expect(daysFromToday("2026-11-01", now)).toBe(-9);
  });

  it("labels near dates in Polish", () => {
    expect(formatDueDate("2026-11-10", now)).toBe("Dzisiaj");
    expect(formatDueDate("2026-11-11", now)).toBe("Jutro");
    expect(formatDueDate("2026-11-09", now)).toBe("Wczoraj");
    expect(formatDueDate("2027-01-05", now)).toMatch(/2027/);
  });

  it("detects overdue tasks", () => {
    expect(isOverdue("2026-11-09", now)).toBe(true);
    expect(isOverdue("2026-11-10", now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });
});
