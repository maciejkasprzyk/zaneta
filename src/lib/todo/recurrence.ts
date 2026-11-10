import { daysFromToday, parseISODate, toISODate } from "./dates";
import type { Recurrence, RecurrenceUnit } from "./types";

/** Adds `count` recurrence steps to a `YYYY-MM-DD` date. */
export function addRecurrence(
  iso: string,
  { interval, unit }: Recurrence,
  count = 1,
): string {
  const date = parseISODate(iso);
  const n = interval * count;
  if (unit === "day") date.setDate(date.getDate() + n);
  else if (unit === "week") date.setDate(date.getDate() + 7 * n);
  else {
    // Months/years keep the day of month, clamped to the month's length
    // (e.g. 31 Jan + 1 month = 28/29 Feb).
    const day = date.getDate();
    date.setDate(1);
    if (unit === "month") date.setMonth(date.getMonth() + n);
    else date.setFullYear(date.getFullYear() + n);
    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return toISODate(date);
}

/**
 * Due date of the next occurrence after completing a task due `iso`:
 * one step later, skipping occurrences that are already in the past.
 */
export function nextOccurrence(
  iso: string | null,
  recurrence: Recurrence,
  now: Date = new Date(),
): string {
  const start = iso ?? toISODate(now);
  let count = 1;
  let next = addRecurrence(start, recurrence, count);
  while (daysFromToday(next, now) < 0 && count < 10_000) {
    count += 1;
    next = addRecurrence(start, recurrence, count);
  }
  return next;
}

const UNIT_FORMS: Record<RecurrenceUnit, [string, string, string]> = {
  // [one, few (2-4), many]
  day: ["dzień", "dni", "dni"],
  week: ["tydzień", "tygodnie", "tygodni"],
  month: ["miesiąc", "miesiące", "miesięcy"],
  year: ["rok", "lata", "lat"],
};

const ONE: Record<RecurrenceUnit, string> = {
  day: "Codziennie",
  week: "Co tydzień",
  month: "Co miesiąc",
  year: "Co rok",
};

/** Polish label, e.g. `Codziennie`, `Co 2 tygodnie`, `Co 5 lat`. */
export function formatRecurrence(recurrence: Recurrence | null | undefined) {
  if (!recurrence) return "";
  const { interval: n, unit } = recurrence;
  if (n === 1) return ONE[unit];
  const [, few, many] = UNIT_FORMS[unit];
  const last = n % 10;
  const lastTwo = n % 100;
  const form =
    last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
  return `Co ${n} ${form}`;
}
