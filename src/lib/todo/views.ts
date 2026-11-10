import { sortCompleted, sortTasks } from "./sort";
import {
  type SortMode,
  STARRED_VIEW,
  type Task,
  type TaskList,
  type TodoState,
} from "./types";

export interface ResolvedView {
  id: string;
  kind: "list" | "starred";
  title: string;
  sortMode: SortMode;
  list: TaskList | null;
  /** Active tasks, already sorted for display. */
  active: Task[];
  /** Completed tasks, most recently completed first. */
  completed: Task[];
}

export const STARRED_TITLE = "Oznaczone gwiazdką";

/** Resolves a view id (list id or `STARRED_VIEW`) to its title and tasks. */
export function resolveView(
  state: TodoState,
  viewId: string | null,
): ResolvedView | null {
  if (viewId === STARRED_VIEW) {
    const tasks = state.tasks.filter((t) => t.starred);
    const sortMode = state.settings.starredSortMode;
    return {
      id: STARRED_VIEW,
      kind: "starred",
      title: STARRED_TITLE,
      sortMode,
      list: null,
      active: sortTasks(
        tasks.filter((t) => !t.completed),
        sortMode,
        { starredView: true },
      ),
      completed: sortCompleted(tasks.filter((t) => t.completed)),
    };
  }
  const list = state.lists.find((l) => l.id === viewId);
  if (!list) return null;
  const tasks = state.tasks.filter((t) => t.listId === list.id);
  return {
    id: list.id,
    kind: "list",
    title: list.name,
    sortMode: list.sortMode,
    list,
    active: sortTasks(
      tasks.filter((t) => !t.completed),
      list.sortMode,
    ),
    completed: sortCompleted(tasks.filter((t) => t.completed)),
  };
}
