import { describe, expect, it } from "vitest";
import { groupByDueDate, sortTasks, topPosition } from "./sort";
import { makeTask } from "./test-utils";

const now = new Date(2026, 10, 10, 12);

describe("sortTasks", () => {
  const a = makeTask({ title: "a", position: 2, dueDate: "2026-11-20" });
  const b = makeTask({ title: "b", position: 0, dueDate: null });
  const c = makeTask({ title: "c", position: 1, dueDate: "2026-11-12" });

  it("sorts by custom order", () => {
    expect(sortTasks([a, b, c], "custom").map((t) => t.title)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("sorts by date with undated tasks last", () => {
    expect(sortTasks([a, b, c], "date").map((t) => t.title)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("orders the starred view by its own custom order", () => {
    const x = makeTask({ title: "x", position: 0, starredPosition: 2 });
    const y = makeTask({ title: "y", position: 1, starredPosition: -1 });
    expect(
      sortTasks([x, y], "custom", { starredView: true }).map((t) => t.title),
    ).toEqual(["y", "x"]);
  });

  it("falls back to star time for tasks without a starred position", () => {
    const x = makeTask({ title: "x", starredAt: "2026-11-01T00:00:00Z" });
    const y = makeTask({ title: "y", starredAt: "2026-11-05T00:00:00Z" });
    expect(
      sortTasks([x, y], "custom", { starredView: true }).map((t) => t.title),
    ).toEqual(["y", "x"]);
  });
});

describe("groupByDueDate", () => {
  it("groups into overdue, today, tomorrow, later dates and no date", () => {
    const tasks = [
      makeTask({ dueDate: "2026-11-01" }),
      makeTask({ dueDate: "2026-11-10" }),
      makeTask({ dueDate: "2026-11-11" }),
      makeTask({ dueDate: "2026-11-20" }),
      makeTask({ dueDate: null }),
    ];
    expect(groupByDueDate(tasks, now).map((g) => g.key)).toEqual([
      "overdue",
      "today",
      "tomorrow",
      "2026-11-20",
      "none",
    ]);
  });
});

describe("topPosition", () => {
  it("returns a position above every task in the list", () => {
    const tasks = [
      makeTask({ listId: "l", position: 3 }),
      makeTask({ listId: "l", position: -2 }),
      makeTask({ listId: "other", position: -10 }),
    ];
    expect(topPosition(tasks, "l")).toBe(-3);
    expect(topPosition([], "l")).toBe(0);
  });
});
