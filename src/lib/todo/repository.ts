import type { TodoAction } from "./reducer";
import type { TodoState } from "./types";

/**
 * Persistence boundary for the todo app. The UI only talks to this
 * interface, so the localStorage implementation can later be swapped
 * for one backed by a database / API without touching components.
 */
export interface TodoRepository {
  load(): Promise<TodoState>;
  /** Persist a single change (see `TodoAction`). */
  apply(action: TodoAction): Promise<void>;
}
