import type { Task } from "./types";

let counter = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  return {
    id: `task-${counter}`,
    listId: "list-1",
    title: `Zadanie ${counter}`,
    description: "",
    dueDate: null,
    effortMinutes: null,
    recurrence: null,
    reminderTime: null,
    reminderAt: null,
    starred: false,
    starredAt: null,
    starredPosition: null,
    completed: false,
    completedAt: null,
    position: counter,
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z",
    ...overrides,
  };
}
