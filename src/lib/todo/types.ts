/** How tasks in a view are ordered. */
export type SortMode = "custom" | "date";

export type RecurrenceUnit = "day" | "week" | "month" | "year";

/** Repeats every `interval` units, counted from the due date. */
export interface Recurrence {
  interval: number;
  unit: RecurrenceUnit;
}

export interface TaskList {
  id: string;
  name: string;
  sortMode: SortMode;
  createdAt: string;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description: string;
  /** Due date as a local calendar date, `YYYY-MM-DD`. */
  dueDate: string | null;
  /** Estimated effort in minutes. */
  effortMinutes: number | null;
  /** Repeat rule; completing the task creates the next occurrence. */
  recurrence?: Recurrence | null;
  starred: boolean;
  /** When the task was last starred. */
  starredAt: string | null;
  /** Position in the starred view's custom order (ascending). */
  starredPosition?: number | null;
  completed: boolean;
  completedAt: string | null;
  /** Position in the list's custom order (ascending). */
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Special view id for the "starred" view; any other id is a list id. */
export const STARRED_VIEW = "starred";

export interface Settings {
  /** Last opened view: a list id or `STARRED_VIEW`. */
  activeView: string | null;
  starredSortMode: SortMode;
  /** Lists hidden from the desktop board (all-lists view). */
  hiddenListIds: string[];
}

export interface TodoState {
  lists: TaskList[];
  tasks: Task[];
  settings: Settings;
}

export type ListPatch = Partial<Pick<TaskList, "name" | "sortMode">>;

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>;

export const emptyState = (): TodoState => ({
  lists: [],
  tasks: [],
  settings: { activeView: null, starredSortMode: "custom", hiddenListIds: [] },
});
