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
  | { type: "taskCreated"; task: Task }
  | { type: "taskUpdated"; id: string; patch: TaskPatch }
  | { type: "taskDeleted"; id: string }
  | { type: "tasksReordered"; listId: string; orderedIds: string[] }
  | { type: "completedCleared"; listId: string }
  | { type: "settingsUpdated"; patch: Partial<Settings> }
  | { type: "stateReplaced"; state: TodoState };

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
