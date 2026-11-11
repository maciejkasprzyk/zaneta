import { STORAGE_KEY } from "./local-storage-repository";
import type { TodoAction } from "./reducer";
import type { TodoRepository } from "./repository";
import type { TodoState } from "./types";

/** Set once this browser's localStorage tasks were copied to the database. */
export const MIGRATED_KEY = "zaneta:todo:migrated-to-db";

const RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000];

/**
 * Stores todos through `/api/todo`. Changes are sent in order: while one
 * request is in flight new actions are queued and go out together in the
 * next one; failed requests are retried with the same actions.
 */
export class ApiTodoRepository implements TodoRepository {
  private queue: TodoAction[] = [];
  private sending = false;
  private attempt = 0;
  private loading: Promise<TodoState> | null = null;

  constructor(
    private readonly options: {
      baseUrl?: string;
      fetch?: typeof fetch;
      /** Browser storage with tasks from before the database (migrated once). */
      legacyStorage?: Storage | null;
      onUnauthorized?: () => void;
    } = {},
  ) {}

  private get fetch() {
    return this.options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private get url() {
    return `${this.options.baseUrl ?? ""}/api/todo`;
  }

  /** Loads once per instance, so a re-run effect can't migrate twice. */
  load(): Promise<TodoState> {
    this.loading ??= this.fetchState();
    return this.loading;
  }

  private async fetchState(): Promise<TodoState> {
    const response = await this.fetch(this.url, { cache: "no-store" });
    if (response.status === 401) {
      this.options.onUnauthorized?.();
      throw new Error("Nie jesteś zalogowany");
    }
    if (!response.ok) throw new Error(`GET /api/todo: ${response.status}`);
    const state = (await response.json()) as TodoState;
    return this.migrateLegacy(state);
  }

  async apply(action: TodoAction): Promise<void> {
    this.queue.push(action);
    void this.flush();
  }

  /** Resolves when every queued change has been saved. */
  async idle(): Promise<void> {
    while (this.sending || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  private async flush(): Promise<void> {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;
    const batch = this.queue;
    this.queue = [];
    try {
      const response = await this.fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: batch }),
        keepalive: JSON.stringify(batch).length < 60_000,
      });
      if (response.status === 401) {
        this.options.onUnauthorized?.();
        throw new Error("Nie jesteś zalogowany");
      }
      if (!response.ok) throw new Error(`POST /api/todo: ${response.status}`);
      this.attempt = 0;
      this.sending = false;
      void this.flush();
    } catch (error) {
      console.error("Nie udało się zapisać zmian, ponawiam", error);
      // Put the batch back in front of anything queued meanwhile.
      this.queue = [...batch, ...this.queue];
      const delay =
        RETRY_DELAYS_MS[Math.min(this.attempt, RETRY_DELAYS_MS.length - 1)];
      this.attempt += 1;
      setTimeout(() => {
        this.sending = false;
        void this.flush();
      }, delay);
    }
  }

  /**
   * The first time the database is used from a browser that already has
   * tasks in localStorage (and the database has none), copy them over.
   * localStorage itself is left untouched as a backup.
   */
  private migrateLegacy(state: TodoState): TodoState {
    const storage = this.options.legacyStorage;
    if (!storage || state.tasks.length > 0) return state;
    try {
      if (storage.getItem(MIGRATED_KEY)) return state;
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return state;
      const legacy = JSON.parse(raw) as Partial<TodoState>;
      if (!Array.isArray(legacy.tasks) || legacy.tasks.length === 0) {
        return state;
      }
      const migrated: TodoState = {
        lists: Array.isArray(legacy.lists) ? legacy.lists : state.lists,
        tasks: legacy.tasks,
        settings: { ...state.settings, ...legacy.settings },
      };
      storage.setItem(MIGRATED_KEY, new Date().toISOString());
      void this.apply({ type: "stateReplaced", state: migrated });
      return migrated;
    } catch (error) {
      console.error("Nie udało się przenieść zadań z przeglądarki", error);
      return state;
    }
  }
}
