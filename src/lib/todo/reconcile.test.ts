import { describe, expect, it } from "vitest";
import { reconcileLists } from "./reconcile";
import { makeTask } from "./test-utils";
import { emptyState, type TodoState } from "./types";

const defs = [
  { id: "inbox", name: "Inbox", icon: () => null },
  { id: "work", name: "Praca", icon: () => null },
  { id: "home", name: "Dom", icon: () => null },
] as never;

describe("reconcileLists", () => {
  it("creates all defined lists for a fresh state", () => {
    const state = reconcileLists(emptyState(), defs);
    expect(state.lists.map((l) => l.name)).toEqual(["Inbox", "Praca", "Dom"]);
  });

  it("keeps the stored order and sort mode, appends new lists", () => {
    const stored: TodoState = {
      ...emptyState(),
      lists: [
        { id: "home", name: "Old name", sortMode: "date", createdAt: "" },
        { id: "inbox", name: "Inbox", sortMode: "custom", createdAt: "" },
      ],
    };
    const state = reconcileLists(stored, defs);
    expect(state.lists.map((l) => l.id)).toEqual(["home", "inbox", "work"]);
    expect(state.lists[0]).toMatchObject({ name: "Dom", sortMode: "date" });
  });

  it("moves tasks of removed lists to the inbox", () => {
    const stored: TodoState = {
      ...emptyState(),
      lists: [{ id: "old", name: "Stara", sortMode: "custom", createdAt: "" }],
      tasks: [makeTask({ id: "t", listId: "old" })],
      settings: {
        activeView: "old",
        starredSortMode: "custom",
        hiddenListIds: ["old", "home"],
      },
    };
    const state = reconcileLists(stored, defs);
    expect(state.lists.some((l) => l.id === "old")).toBe(false);
    expect(state.tasks[0].listId).toBe("inbox");
    expect(state.settings.activeView).toBeNull();
    expect(state.settings.hiddenListIds).toEqual(["home"]);
  });
});
