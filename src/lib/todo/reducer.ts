import type {
  ListPatch,
  Settings,
  Task,
  TaskList,
  TaskPatch,
  TodoState,
} from "./types";

/**
 * Every change to the todo data is expressed as one of these actions.
 * The same reducer drives the in-memory UI state and the localStorage
 * repository, so both always agree on what a change means.
 */
export type TodoAction =
  | { type: "listCreated"; list: TaskList }
  | { type: "listUpdated"; id: string; patch: ListPatch }
  | { type: "listDeleted"; id: string }
  | { type: "listsReordered"; orderedIds: string[] }
  | { type: "taskCreated"; task: Task }
  | { type: "taskUpdated"; id: string; patch: TaskPatch }
  | { type: "taskDeleted"; id: string }
  | { type: "tasksReordered"; listId: string; orderedIds: string[] }
  | { type: "starredReordered"; orderedIds: string[] }
  | { type: "completedCleared"; listId: string }
  | { type: "settingsUpdated"; patch: Partial<Settings> }
  | { type: "stateReplaced"; state: TodoState };

const ACTION_TYPES = new Set<TodoAction["type"]>([
  "listCreated",
  "listUpdated",
  "listDeleted",
  "listsReordered",
  "taskCreated",
  "taskUpdated",
  "taskDeleted",
  "tasksReordered",
  "starredReordered",
  "completedCleared",
  "settingsUpdated",
  "stateReplaced",
]);

/** Shallow check for actions arriving over the network. */
export function isTodoAction(value: unknown): value is TodoAction {
  return (
    typeof value === "object" &&
    value !== null &&
    ACTION_TYPES.has((value as { type: TodoAction["type"] }).type)
  );
}

export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "listCreated":
      return { ...state, lists: [...state.lists, action.list] };
    case "listUpdated":
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.id ? { ...l, ...action.patch } : l,
        ),
      };
    case "listDeleted":
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== action.id),
        tasks: state.tasks.filter((t) => t.listId !== action.id),
      };
    case "listsReordered": {
      const index = new Map(action.orderedIds.map((id, i) => [id, i]));
      const rank = (id: string) => index.get(id) ?? Number.MAX_SAFE_INTEGER;
      return {
        ...state,
        lists: [...state.lists].sort((a, b) => rank(a.id) - rank(b.id)),
      };
    }
    case "taskCreated":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "taskUpdated":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };
    case "taskDeleted":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
      };
    case "tasksReordered": {
      const index = new Map(action.orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          const position = index.get(t.id);
          return t.listId === action.listId && position !== undefined
            ? { ...t, position }
            : t;
        }),
      };
    }
    case "starredReordered": {
      const index = new Map(action.orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          const starredPosition = index.get(t.id);
          return starredPosition !== undefined ? { ...t, starredPosition } : t;
        }),
      };
    }
    case "completedCleared":
      return {
        ...state,
        tasks: state.tasks.filter(
          (t) => !(t.listId === action.listId && t.completed),
        ),
      };
    case "settingsUpdated":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "stateReplaced":
      return action.state;
  }
}
