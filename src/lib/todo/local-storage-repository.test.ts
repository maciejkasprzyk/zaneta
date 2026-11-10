import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalStorageTodoRepository,
  STORAGE_KEY,
} from "./local-storage-repository";
import { makeTask } from "./test-utils";

describe("LocalStorageTodoRepository", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", async () => {
    const repo = new LocalStorageTodoRepository(localStorage);
    const state = await repo.load();
    expect(state.lists).toEqual([]);
    expect(state.tasks).toEqual([]);
  });

  it("persists changes across instances", async () => {
    const repo = new LocalStorageTodoRepository(localStorage);
    await repo.apply({
      type: "listCreated",
      list: { id: "l1", name: "Dom", sortMode: "custom", createdAt: "" },
    });
    const task = makeTask({ id: "t1", listId: "l1" });
    await repo.apply({ type: "taskCreated", task });
    await repo.apply({
      type: "taskUpdated",
      id: "t1",
      patch: { starred: true },
    });

    const state = await new LocalStorageTodoRepository(localStorage).load();
    expect(state.lists.map((l) => l.name)).toEqual(["Dom"]);
    expect(state.tasks[0]).toMatchObject({ id: "t1", starred: true });
  });

  it("deletes a list together with its tasks", async () => {
    const repo = new LocalStorageTodoRepository(localStorage);
    await repo.apply({
      type: "listCreated",
      list: { id: "l1", name: "Dom", sortMode: "custom", createdAt: "" },
    });
    await repo.apply({ type: "taskCreated", task: makeTask({ listId: "l1" }) });
    await repo.apply({ type: "listDeleted", id: "l1" });
    expect((await repo.load()).tasks).toEqual([]);
  });

  it("recovers from corrupted data", async () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const state = await new LocalStorageTodoRepository(localStorage).load();
    expect(state.tasks).toEqual([]);
  });
});
