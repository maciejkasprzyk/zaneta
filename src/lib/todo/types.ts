/** How tasks in a view are ordered. */
export type SortMode = "custom" | "date";

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
  starred: boolean;
  /** When the task was last starred; used to order the starred view. */
  starredAt: string | null;
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
  settings: { activeView: null, starredSortMode: "custom" },
});
