import { describe, expect, it } from "vitest";
import { createDemoState } from "./demo-data";

describe("createDemoState", () => {
  it("creates several lists with varied tasks", () => {
    const state = createDemoState(new Date(2026, 10, 10));
    expect(state.lists.length).toBeGreaterThanOrEqual(3);
    expect(state.tasks.some((t) => t.starred)).toBe(true);
    expect(state.tasks.some((t) => t.completed)).toBe(true);
    expect(state.tasks.some((t) => t.dueDate === null)).toBe(true);
    expect(state.tasks.some((t) => t.dueDate === "2026-11-09")).toBe(true);
    expect(state.settings.activeView).toBe(state.lists[0].id);
    for (const task of state.tasks) {
      expect(state.lists.some((l) => l.id === task.listId)).toBe(true);
    }
  });
});
