import { daysFromToday, formatDateHeading } from "./dates";
import type { SortMode, Task } from "./types";

const byPosition = (a: Task, b: Task) =>
  a.position - b.position || a.createdAt.localeCompare(b.createdAt);

/** Starred view custom order; tasks starred before it existed fall back to star time. */
const byStarredPosition = (a: Task, b: Task) =>
  (a.starredPosition ?? 0) - (b.starredPosition ?? 0) ||
  (b.starredAt ?? "").localeCompare(a.starredAt ?? "");

/** Tasks without a date go last; ties keep the custom order. */
const byDueDate = (a: Task, b: Task) => {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate == null) return 1;
    if (b.dueDate == null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return byPosition(a, b);
};

/**
 * Sorts active tasks for display. The starred view has its own custom
 * order, separate from the order inside each list.
 */
export function sortTasks(
  tasks: Task[],
  mode: SortMode,
  { starredView = false } = {},
): Task[] {
  const compare =
    mode === "date" ? byDueDate : starredView ? byStarredPosition : byPosition;
  return [...tasks].sort(compare);
}

export function sortCompleted(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );
}

export interface DateGroup {
  key: string;
  label: string;
  overdue?: boolean;
  tasks: Task[];
}

/** Groups tasks (already sorted by date) into headed sections. */
export function groupByDueDate(
  tasks: Task[],
  now: Date = new Date(),
): DateGroup[] {
  const groups: DateGroup[] = [];
  const push = (key: string, label: string, task: Task, overdue = false) => {
    const last = groups.at(-1);
    if (last?.key === key) last.tasks.push(task);
    else groups.push({ key, label, overdue, tasks: [task] });
  };
  for (const task of sortTasks(tasks, "date")) {
    if (task.dueDate == null) {
      push("none", "Bez terminu", task);
      continue;
    }
    const diff = daysFromToday(task.dueDate, now);
    if (diff < 0) push("overdue", "Zaległe", task, true);
    else if (diff === 0) push("today", "Dzisiaj", task);
    else if (diff === 1) push("tomorrow", "Jutro", task);
    else push(task.dueDate, formatDateHeading(task.dueDate, now), task);
  }
  return groups;
}

/** Newly starred tasks go to the top of the starred view. */
export function topStarredPosition(tasks: Task[]): number {
  const positions = tasks
    .filter((t) => t.starred)
    .map((t) => t.starredPosition ?? 0);
  return positions.length > 0 ? Math.min(...positions) - 1 : 0;
}

/** New tasks go to the top of a list, like in Google Tasks. */
export function topPosition(tasks: Task[], listId: string): number {
  const positions = tasks
    .filter((t) => t.listId === listId)
    .map((t) => t.position);
  return positions.length > 0 ? Math.min(...positions) - 1 : 0;
}
