const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses `YYYY-MM-DD` as local midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** `YYYY-MM-DD` + local `HH:MM` → ISO instant, or null when either is missing. */
export function reminderInstant(
  dueDate: string | null | undefined,
  time: string | null | undefined,
): string | null {
  if (!dueDate || !time) return null;
  const [h, m] = time.split(":").map(Number);
  const date = parseISODate(dueDate);
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toISOString();
}

/** Whole days from `now`'s date to `iso` (negative = in the past). */
export function daysFromToday(iso: string, now: Date = new Date()): number {
  const today = parseISODate(toISODate(now));
  return Math.round(
    (parseISODate(iso).getTime() - today.getTime()) / 86_400_000,
  );
}

export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  return iso != null && daysFromToday(iso, now) < 0;
}

/** Short label for a due date chip, e.g. `Dzisiaj`, `Jutro`, `pt., 14 lis`. */
export function formatDueDate(iso: string, now: Date = new Date()): string {
  const diff = daysFromToday(iso, now);
  if (diff === 0) return "Dzisiaj";
  if (diff === 1) return "Jutro";
  if (diff === -1) return "Wczoraj";
  return formatDateShort(iso, now);
}

/** Absolute short date, e.g. `pt., 14 lis` (year added if not current). */
export function formatDateShort(iso: string, now: Date = new Date()): string {
  const date = parseISODate(iso);
  return date.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Long label for a group heading, e.g. `piątek, 14 listopada`. */
export function formatDateHeading(iso: string, now: Date = new Date()): string {
  const date = parseISODate(iso);
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
