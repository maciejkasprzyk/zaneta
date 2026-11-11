import { DEFAULT_LIST_ID, LIST_DEFINITIONS } from "./list-registry";
import type { TaskList, TodoState } from "./types";

/**
 * Aligns stored data with the lists defined in code: keeps the user's list
 * order and per-list settings, adds new lists at the end, drops lists that
 * no longer exist and moves their tasks to the default list.
 */
export function reconcileLists(
  state: TodoState,
  definitions = LIST_DEFINITIONS,
): TodoState {
  const defined = new Map(definitions.map((d) => [d.id, d]));
  const stored = new Map(state.lists.map((l) => [l.id, l]));
  const order = [
    ...state.lists.map((l) => l.id).filter((id) => defined.has(id)),
    ...definitions.map((d) => d.id).filter((id) => !stored.has(id)),
  ];
  const lists: TaskList[] = order.map((id) => ({
    id,
    name: defined.get(id)?.name ?? id,
    sortMode: stored.get(id)?.sortMode ?? "custom",
    createdAt: stored.get(id)?.createdAt ?? new Date(0).toISOString(),
  }));
  const fallback = defined.has(DEFAULT_LIST_ID)
    ? DEFAULT_LIST_ID
    : (order[0] ?? DEFAULT_LIST_ID);
  const tasks = state.tasks.map((t) =>
    defined.has(t.listId) ? t : { ...t, listId: fallback },
  );
  const activeView = state.settings.activeView;
  return {
    lists,
    tasks,
    settings: {
      ...state.settings,
      activeView:
        activeView === "starred" || (activeView && defined.has(activeView))
          ? activeView
          : null,
      hiddenListIds: (state.settings.hiddenListIds ?? []).filter((id) =>
        defined.has(id),
      ),
    },
  };
}

/** True when reconciling would change anything (so it needs saving). */
export function needsReconcile(state: TodoState, next: TodoState): boolean {
  return JSON.stringify(state) !== JSON.stringify(next);
}
