// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { applyTodoActions, loadTodoState, type TodoDb } from "./db-repository";
import { makeTask } from "./test-utils";
import { emptyState, type TodoState } from "./types";

let db: TodoDb;

async function addUser(id: string) {
  await db.insert(schema.user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    updatedAt: new Date(),
  });
}

beforeEach(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as TodoDb;
  await addUser("u1");
  await addUser("u2");
});

const lists = [
  {
    id: "inbox",
    name: "Inbox",
    sortMode: "custom" as const,
    createdAt: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "zadania",
    name: "Zadania",
    sortMode: "date" as const,
    createdAt: "1970-01-01T00:00:00.000Z",
  },
];

describe("database todo repository", () => {
  it("starts empty", async () => {
    expect(await loadTodoState(db, "u1")).toEqual(emptyState());
  });

  it("round-trips a replaced state", async () => {
    const state: TodoState = {
      lists,
      tasks: [
        makeTask({ listId: "inbox", recurrence: null }),
        makeTask({
          listId: "zadania",
          dueDate: "2026-11-12",
          effortMinutes: 90,
          recurrence: { interval: 2, unit: "week" },
          starred: true,
          starredAt: "2026-11-11T09:00:00.000Z",
          starredPosition: -1,
          position: -3,
        }),
      ],
      settings: {
        activeView: "zadania",
        starredSortMode: "date",
        hiddenListIds: ["inbox"],
      },
    };
    await applyTodoActions(db, "u1", [{ type: "stateReplaced", state }]);
    const loaded = await loadTodoState(db, "u1");
    expect(loaded.lists).toEqual(lists);
    expect(loaded.settings).toEqual(state.settings);
    expect(loaded.tasks.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      state.tasks.sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("applies a batch of actions in order", async () => {
    const task = makeTask({ listId: "inbox", recurrence: null });
    const other = makeTask({ listId: "inbox", recurrence: null });
    await applyTodoActions(db, "u1", [
      { type: "stateReplaced", state: { ...emptyState(), lists } },
      { type: "taskCreated", task },
      { type: "taskCreated", task: other },
      { type: "taskUpdated", id: task.id, patch: { title: "Nowy tytuł" } },
      { type: "taskDeleted", id: other.id },
      { type: "listsReordered", orderedIds: ["zadania", "inbox"] },
      { type: "settingsUpdated", patch: { activeView: "inbox" } },
    ]);
    const loaded = await loadTodoState(db, "u1");
    expect(loaded.tasks).toEqual([{ ...task, title: "Nowy tytuł" }]);
    expect(loaded.lists.map((l) => l.id)).toEqual(["zadania", "inbox"]);
    expect(loaded.settings.activeView).toBe("inbox");
  });

  it("keeps users' data separate, even with the same task ids", async () => {
    const task = makeTask({ recurrence: null });
    await applyTodoActions(db, "u1", [{ type: "taskCreated", task }]);
    await applyTodoActions(db, "u2", [
      { type: "taskCreated", task: { ...task, title: "Cudze" } },
    ]);
    await applyTodoActions(db, "u2", [{ type: "taskDeleted", id: task.id }]);
    expect((await loadTodoState(db, "u1")).tasks).toEqual([task]);
    expect((await loadTodoState(db, "u2")).tasks).toEqual([]);
  });

  it("rolls back the whole batch when one change fails", async () => {
    const task = makeTask({ recurrence: null });
    await expect(
      applyTodoActions(db, "u1", [
        { type: "taskCreated", task },
        {
          type: "taskCreated",
          task: makeTask({ title: null as unknown as string }),
        },
      ]),
    ).rejects.toThrow();
    expect((await loadTodoState(db, "u1")).tasks).toEqual([]);
  });
});
