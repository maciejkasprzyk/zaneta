import { type TodoAction, todoReducer } from "./reducer";
import type { TodoRepository } from "./repository";
import { emptyState, type TodoState } from "./types";

export const STORAGE_KEY = "zaneta:todo:v1";

interface StoredDocument extends TodoState {
  version: 1;
}

/** Stores the whole todo state as one JSON document in `localStorage`. */
export class LocalStorageTodoRepository implements TodoRepository {
  constructor(
    private readonly storage: Storage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  async load(): Promise<TodoState> {
    return this.read();
  }

  async apply(action: TodoAction): Promise<void> {
    this.write(todoReducer(this.read(), action));
  }

  private read(): TodoState {
    const raw = this.storage.getItem(this.key);
    if (!raw) return emptyState();
    try {
      const doc = JSON.parse(raw) as Partial<StoredDocument>;
      const base = emptyState();
      return {
        lists: Array.isArray(doc.lists) ? doc.lists : base.lists,
        tasks: Array.isArray(doc.tasks) ? doc.tasks : base.tasks,
        settings: { ...base.settings, ...doc.settings },
      };
    } catch {
      return emptyState();
    }
  }

  private write(state: TodoState) {
    const doc: StoredDocument = { version: 1, ...state };
    this.storage.setItem(this.key, JSON.stringify(doc));
  }
}
