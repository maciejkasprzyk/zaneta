import { and, eq, getTableColumns, inArray, type SQL, sql } from "drizzle-orm";
import type {
  PgDatabase,
  PgQueryResultHKT,
  PgTable,
} from "drizzle-orm/pg-core";
import { todoList, todoSettings, todoTask } from "@/db/todo-schema";
import { type TodoAction, todoReducer } from "./reducer";
import { emptyState, type Task, type TaskList, type TodoState } from "./types";

/**
 * Server side of the database storage. The state is kept in normal tables
 * (one row per task / list) so a plain `pg_dump` is a full export, while
 * changes still go through the same `todoReducer` as in the browser: load the
 * user's rows, apply the actions, write back only the rows that changed.
 */
// biome-ignore lint/suspicious/noExplicitAny: works with any drizzle Postgres driver (node-postgres in the app, PGlite in tests).
export type TodoDb = PgDatabase<PgQueryResultHKT, any>;

type TaskRow = typeof todoTask.$inferInsert;
type ListRow = typeof todoList.$inferInsert;

const iso = (value: Date | null | undefined) =>
  value ? value.toISOString() : null;
const toDate = (value: string | null | undefined) =>
  value ? new Date(value) : null;

function taskFromRow(row: typeof todoTask.$inferSelect): Task {
  return {
    id: row.id,
    listId: row.listId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    effortMinutes: row.effortMinutes,
    recurrence:
      row.recurrenceInterval && row.recurrenceUnit
        ? { interval: row.recurrenceInterval, unit: row.recurrenceUnit }
        : null,
    reminderTime: row.reminderTime,
    reminderAt: iso(row.reminderAt),
    starred: row.starred,
    starredAt: iso(row.starredAt),
    starredPosition: row.starredPosition,
    completed: row.completed,
    completedAt: iso(row.completedAt),
    position: row.position,
    createdAt: iso(row.createdAt) ?? "",
    updatedAt: iso(row.updatedAt) ?? "",
  };
}

function taskToRow(userId: string, task: Task): TaskRow {
  return {
    userId,
    id: task.id,
    listId: task.listId,
    title: task.title,
    description: task.description ?? "",
    dueDate: task.dueDate ?? null,
    effortMinutes: task.effortMinutes ?? null,
    recurrenceInterval: task.recurrence?.interval ?? null,
    recurrenceUnit: task.recurrence?.unit ?? null,
    reminderTime: task.reminderTime ?? null,
    reminderAt: toDate(task.reminderAt),
    starred: task.starred,
    starredAt: toDate(task.starredAt),
    starredPosition: task.starredPosition ?? null,
    completed: task.completed,
    completedAt: toDate(task.completedAt),
    position: task.position,
    createdAt: toDate(task.createdAt) ?? new Date(),
    updatedAt: toDate(task.updatedAt) ?? new Date(),
  };
}

function listToRow(userId: string, list: TaskList, position: number): ListRow {
  return {
    userId,
    id: list.id,
    name: list.name,
    sortMode: list.sortMode,
    position,
    createdAt: toDate(list.createdAt) ?? new Date(0),
  };
}

export async function loadTodoState(
  db: TodoDb,
  userId: string,
): Promise<TodoState> {
  const [lists, tasks, settings] = await Promise.all([
    db
      .select()
      .from(todoList)
      .where(eq(todoList.userId, userId))
      .orderBy(todoList.position),
    db.select().from(todoTask).where(eq(todoTask.userId, userId)),
    db.select().from(todoSettings).where(eq(todoSettings.userId, userId)),
  ]);
  const base = emptyState();
  return {
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      sortMode: l.sortMode,
      createdAt: iso(l.createdAt) ?? "",
    })),
    tasks: tasks.map(taskFromRow),
    settings: { ...base.settings, ...settings[0]?.settings },
  };
}

/** `ON CONFLICT DO UPDATE SET col = excluded.col` for every column. */
function setFromExcluded(table: PgTable): Record<string, SQL> {
  return Object.fromEntries(
    Object.entries(getTableColumns(table)).map(([key, column]) => [
      key,
      sql.raw(`excluded."${column.name}"`),
    ]),
  );
}

/** Rows of `next` that are new or differ from `prev`, and ids that are gone. */
function diffRows<T extends { id: string }>(prev: T[], next: T[]) {
  const before = new Map(prev.map((row) => [row.id, JSON.stringify(row)]));
  const nextIds = new Set(next.map((row) => row.id));
  return {
    upserts: next.filter((row) => before.get(row.id) !== JSON.stringify(row)),
    deletedIds: prev.map((row) => row.id).filter((id) => !nextIds.has(id)),
  };
}

/**
 * Applies the actions in one transaction. The user's settings row is locked
 * first, so two devices saving at once are applied one after the other.
 */
export async function applyTodoActions(
  db: TodoDb,
  userId: string,
  actions: TodoAction[],
): Promise<void> {
  if (actions.length === 0) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(todoSettings)
      .values({ userId, settings: emptyState().settings })
      .onConflictDoNothing();
    await tx
      .select({ userId: todoSettings.userId })
      .from(todoSettings)
      .where(eq(todoSettings.userId, userId))
      .for("update");

    const prev = await loadTodoState(tx, userId);
    const next = actions.reduce(todoReducer, prev);

    const tasks = diffRows(
      prev.tasks.map((t) => taskToRow(userId, t)),
      next.tasks.map((t) => taskToRow(userId, t)),
    );
    if (tasks.deletedIds.length > 0) {
      await tx
        .delete(todoTask)
        .where(
          and(
            eq(todoTask.userId, userId),
            inArray(todoTask.id, tasks.deletedIds),
          ),
        );
    }
    if (tasks.upserts.length > 0) {
      await tx
        .insert(todoTask)
        .values(tasks.upserts)
        .onConflictDoUpdate({
          target: [todoTask.userId, todoTask.id],
          set: setFromExcluded(todoTask),
        });
    }

    const lists = diffRows(
      prev.lists.map((l, i) => listToRow(userId, l, i)),
      next.lists.map((l, i) => listToRow(userId, l, i)),
    );
    if (lists.deletedIds.length > 0) {
      await tx
        .delete(todoList)
        .where(
          and(
            eq(todoList.userId, userId),
            inArray(todoList.id, lists.deletedIds),
          ),
        );
    }
    if (lists.upserts.length > 0) {
      await tx
        .insert(todoList)
        .values(lists.upserts)
        .onConflictDoUpdate({
          target: [todoList.userId, todoList.id],
          set: setFromExcluded(todoList),
        });
    }

    if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
      await tx
        .update(todoSettings)
        .set({ settings: next.settings })
        .where(eq(todoSettings.userId, userId));
    }
  });
}
