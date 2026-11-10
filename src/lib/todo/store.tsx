"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocalStorageTodoRepository } from "./local-storage-repository";
import { type TodoAction, todoReducer } from "./reducer";
import type { TodoRepository } from "./repository";
import { topPosition } from "./sort";
import {
  emptyState,
  type Settings,
  type SortMode,
  type Task,
  type TaskList,
  type TodoState,
} from "./types";

export const DEFAULT_LIST_NAME = "Moje zadania";

/** Editable fields of a task, as entered in the task form. */
export interface TaskInput {
  listId: string;
  title: string;
  description: string;
  dueDate: string | null;
  effortMinutes: number | null;
  starred: boolean;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const nowIso = () => new Date().toISOString();

function useTodoStoreValue(repository: TodoRepository | null) {
  const [state, setState] = useState<TodoState>(emptyState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);

  const commit = useCallback(
    (action: TodoAction) => {
      stateRef.current = todoReducer(stateRef.current, action);
      setState(stateRef.current);
      repository?.apply(action).catch((error) => {
        console.error("Nie udało się zapisać zmian", error);
      });
    },
    [repository],
  );

  const createList = useCallback(
    (name: string): string => {
      const list: TaskList = {
        id: newId(),
        name: name.trim() || DEFAULT_LIST_NAME,
        sortMode: "custom",
        createdAt: nowIso(),
      };
      commit({ type: "listCreated", list });
      return list.id;
    },
    [commit],
  );

  useEffect(() => {
    if (!repository) return;
    let cancelled = false;
    repository.load().then((loaded) => {
      if (cancelled) return;
      stateRef.current = loaded;
      setState(loaded);
      if (loaded.lists.length === 0) createList(DEFAULT_LIST_NAME);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, createList]);

  const actions = useMemo(
    () => ({
      createList,
      renameList: (id: string, name: string) => {
        const trimmed = name.trim();
        if (trimmed)
          commit({ type: "listUpdated", id, patch: { name: trimmed } });
      },
      setListSortMode: (id: string, sortMode: SortMode) =>
        commit({ type: "listUpdated", id, patch: { sortMode } }),
      deleteList: (id: string) => commit({ type: "listDeleted", id }),

      createTask: (input: TaskInput): string => {
        const now = nowIso();
        const task: Task = {
          id: newId(),
          ...input,
          title: input.title.trim(),
          starredAt: input.starred ? now : null,
          completed: false,
          completedAt: null,
          position: topPosition(stateRef.current.tasks, input.listId),
          createdAt: now,
          updatedAt: now,
        };
        commit({ type: "taskCreated", task });
        return task.id;
      },
      updateTask: (id: string, input: Partial<TaskInput>) => {
        const task = stateRef.current.tasks.find((t) => t.id === id);
        if (!task) return;
        const now = nowIso();
        const patch: Partial<Task> = { ...input, updatedAt: now };
        if (input.title !== undefined) patch.title = input.title.trim();
        if (input.starred !== undefined && input.starred !== task.starred) {
          patch.starredAt = input.starred ? now : null;
        }
        if (input.listId !== undefined && input.listId !== task.listId) {
          patch.position = topPosition(stateRef.current.tasks, input.listId);
        }
        commit({ type: "taskUpdated", id, patch });
      },
      toggleCompleted: (id: string) => {
        const task = stateRef.current.tasks.find((t) => t.id === id);
        if (!task) return;
        const now = nowIso();
        const completed = !task.completed;
        commit({
          type: "taskUpdated",
          id,
          patch: {
            completed,
            completedAt: completed ? now : null,
            // Restored tasks go back to the top, like in Google Tasks.
            ...(completed
              ? {}
              : { position: topPosition(stateRef.current.tasks, task.listId) }),
            updatedAt: now,
          },
        });
      },
      toggleStarred: (id: string) => {
        const task = stateRef.current.tasks.find((t) => t.id === id);
        if (!task) return;
        const now = nowIso();
        commit({
          type: "taskUpdated",
          id,
          patch: {
            starred: !task.starred,
            starredAt: task.starred ? null : now,
            updatedAt: now,
          },
        });
      },
      deleteTask: (id: string) => commit({ type: "taskDeleted", id }),
      reorderTasks: (listId: string, orderedIds: string[]) =>
        commit({ type: "tasksReordered", listId, orderedIds }),
      clearCompleted: (listId: string) =>
        commit({ type: "completedCleared", listId }),
      updateSettings: (patch: Partial<Settings>) =>
        commit({ type: "settingsUpdated", patch }),
    }),
    [commit, createList],
  );

  return { state, ready, ...actions };
}

export type TodoStore = ReturnType<typeof useTodoStoreValue>;

const TodoContext = createContext<TodoStore | null>(null);

export function TodoProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: TodoRepository;
}) {
  // localStorage only exists in the browser; on the server we render the
  // loading state and the repository is created during hydration.
  const [repo] = useState<TodoRepository | null>(
    () =>
      repository ??
      (typeof window === "undefined"
        ? null
        : new LocalStorageTodoRepository(window.localStorage)),
  );
  const store = useTodoStoreValue(repo);
  return <TodoContext.Provider value={store}>{children}</TodoContext.Provider>;
}

export function useTodos(): TodoStore {
  const store = useContext(TodoContext);
  if (!store) throw new Error("useTodos must be used inside <TodoProvider>");
  return store;
}
