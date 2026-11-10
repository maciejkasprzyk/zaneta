export type EffortUnit = "min" | "h";

/** Converts a value in the given unit to whole minutes; `null` if empty/invalid. */
export function toMinutes(value: number, unit: EffortUnit): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const minutes = Math.round(unit === "h" ? value * 60 : value);
  return minutes > 0 ? minutes : null;
}

/** Picks a friendly unit for editing an existing effort value. */
export function splitEffort(minutes: number | null): {
  value: string;
  unit: EffortUnit;
} {
  if (minutes == null) return { value: "", unit: "min" };
  if (minutes >= 60 && minutes % 15 === 0) {
    return { value: String(minutes / 60), unit: "h" };
  }
  return { value: String(minutes), unit: "min" };
}

/** Formats minutes as e.g. `45 min`, `2 h`, `1 h 30 min`. */
export function formatEffort(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function sumEffort(tasks: { effortMinutes: number | null }[]): number {
  return tasks.reduce((sum, t) => sum + (t.effortMinutes ?? 0), 0);
}
