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
import { toISODate } from "./dates";
import { LocalStorageTodoRepository } from "./local-storage-repository";
import { needsReconcile, reconcileLists } from "./reconcile";
import { nextOccurrence } from "./recurrence";
import { type TodoAction, todoReducer } from "./reducer";
import type { TodoRepository } from "./repository";
import { topPosition, topStarredPosition } from "./sort";
import {
  emptyState,
  type Recurrence,
  type Settings,
  type SortMode,
  type Task,
  type TodoState,
} from "./types";

/** Editable fields of a task, as entered in the task form. */
export interface TaskInput {
  listId: string;
  title: string;
  description: string;
  dueDate: string | null;
  effortMinutes: number | null;
  recurrence: Recurrence | null;
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

  useEffect(() => {
    if (!repository) return;
    let cancelled = false;
    repository.load().then((loaded) => {
      if (cancelled) return;
      // Lists come from code; align stored data with them and save if needed.
      const reconciled = reconcileLists(loaded);
      stateRef.current = loaded;
      if (needsReconcile(loaded, reconciled)) {
        commit({ type: "stateReplaced", state: reconciled });
      } else {
        setState(loaded);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repository, commit]);

  const actions = useMemo(
    () => ({
      setListSortMode: (id: string, sortMode: SortMode) =>
        commit({ type: "listUpdated", id, patch: { sortMode } }),
      reorderLists: (orderedIds: string[]) =>
        commit({ type: "listsReordered", orderedIds }),

      createTask: (input: TaskInput): string => {
        const now = nowIso();
        const task: Task = {
          id: newId(),
          ...input,
          // A repeating task always has a date to count from.
          dueDate:
            input.recurrence && !input.dueDate
              ? toISODate(new Date())
              : input.dueDate,
          title: input.title.trim(),
          starredAt: input.starred ? now : null,
          starredPosition: input.starred
            ? topStarredPosition(stateRef.current.tasks)
            : null,
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
        const recurrence = input.recurrence ?? task.recurrence;
        if (recurrence && !(input.dueDate ?? task.dueDate)) {
          patch.dueDate = toISODate(new Date());
        }
        if (input.starred !== undefined && input.starred !== task.starred) {
          patch.starredAt = input.starred ? now : null;
          patch.starredPosition = input.starred
            ? topStarredPosition(stateRef.current.tasks)
            : null;
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
        // Completing a repeating task schedules the next occurrence, like
        // in Google Tasks; the completed copy no longer repeats.
        if (completed && task.recurrence) {
          const next: Task = {
            ...task,
            id: newId(),
            dueDate: nextOccurrence(task.dueDate, task.recurrence),
            position: topPosition(stateRef.current.tasks, task.listId),
            starredPosition: task.starred ? task.starredPosition : null,
            createdAt: now,
            updatedAt: now,
          };
          commit({ type: "taskCreated", task: next });
          commit({
            type: "taskUpdated",
            id,
            patch: {
              completed: true,
              completedAt: now,
              recurrence: null,
              updatedAt: now,
            },
          });
          return;
        }
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
            starredPosition: task.starred
              ? null
              : topStarredPosition(stateRef.current.tasks),
            updatedAt: now,
          },
        });
      },
      deleteTask: (id: string) => commit({ type: "taskDeleted", id }),
      reorderTasks: (listId: string, orderedIds: string[]) =>
        commit({ type: "tasksReordered", listId, orderedIds }),
      /** Moves a task to another list, at the given order of that list. */
      moveTask: (id: string, listId: string, orderedIds: string[]) => {
        commit({
          type: "taskUpdated",
          id,
          patch: { listId, updatedAt: nowIso() },
        });
        commit({ type: "tasksReordered", listId, orderedIds });
      },
      reorderStarred: (orderedIds: string[]) =>
        commit({ type: "starredReordered", orderedIds }),
      setListHidden: (listId: string, hidden: boolean) => {
        const current = stateRef.current.settings.hiddenListIds ?? [];
        const hiddenListIds = hidden
          ? [...new Set([...current, listId])]
          : current.filter((id) => id !== listId);
        commit({ type: "settingsUpdated", patch: { hiddenListIds } });
      },
      clearCompleted: (listId: string) =>
        commit({ type: "completedCleared", listId }),
      updateSettings: (patch: Partial<Settings>) =>
        commit({ type: "settingsUpdated", patch }),
      replaceState: (next: TodoState) =>
        commit({ type: "stateReplaced", state: reconcileLists(next) }),
    }),
    [commit],
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
