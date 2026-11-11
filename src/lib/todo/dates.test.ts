import { describe, expect, it } from "vitest";
import {
  daysFromToday,
  formatDueDate,
  isOverdue,
  reminderInstant,
  toISODate,
} from "./dates";

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

describe("reminderInstant", () => {
  it("combines the due date and local time into an instant", () => {
    expect(reminderInstant("2026-11-12", "07:35")).toBe(
      new Date(2026, 10, 12, 7, 35).toISOString(),
    );
  });

  it("is null without a date or a time", () => {
    expect(reminderInstant(null, "07:35")).toBeNull();
    expect(reminderInstant("2026-11-12", null)).toBeNull();
  });
});
