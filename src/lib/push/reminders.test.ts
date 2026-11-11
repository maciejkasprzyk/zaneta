// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { applyTodoActions, type TodoDb } from "@/lib/todo/db-repository";
import { makeTask } from "@/lib/todo/test-utils";
import type { Task } from "@/lib/todo/types";
import {
  type PushPayload,
  type PushSender,
  type StoredSubscription,
  sendDueReminders,
} from "./reminders";

let db: TodoDb;
let sent: { endpoint: string; payload: PushPayload }[];
let goneEndpoints: Set<string>;
const sender: PushSender = async (sub: StoredSubscription, payload) => {
  if (goneEndpoints.has(sub.endpoint)) return "gone";
  sent.push({ endpoint: sub.endpoint, payload });
  return "sent";
};

const NOW = new Date("2026-11-11T08:00:00.000Z");
const minutesAgo = (m: number) =>
  new Date(NOW.getTime() - m * 60_000).toISOString();

async function addTask(overrides: Partial<Task>) {
  const task = makeTask({
    recurrence: null,
    reminderTime: "09:00",
    ...overrides,
  });
  await applyTodoActions(db, "u1", [{ type: "taskCreated", task }]);
  return task;
}

beforeEach(async () => {
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as TodoDb;
  sent = [];
  goneEndpoints = new Set();
  await db.insert(schema.user).values({
    id: "u1",
    name: "u1",
    email: "u1@example.com",
    updatedAt: new Date(),
  });
  await db.insert(schema.pushSubscription).values([
    { endpoint: "https://push/phone", userId: "u1", p256dh: "k", auth: "a" },
    { endpoint: "https://push/old", userId: "u1", p256dh: "k", auth: "a" },
  ]);
  goneEndpoints.add("https://push/old");
});

describe("sendDueReminders", () => {
  it("sends due reminders once, to every device, and drops gone devices", async () => {
    const task = await addTask({
      title: "Zadzwoń",
      description: "do mamy\ndrugi wiersz",
      reminderAt: minutesAgo(3),
    });
    await addTask({ reminderAt: minutesAgo(-10) }); // not yet
    await addTask({ reminderAt: minutesAgo(5), completed: true }); // done
    await addTask({ reminderAt: minutesAgo(13 * 60) }); // too old

    expect(await sendDueReminders(db, sender, NOW)).toEqual({ reminders: 1 });
    expect(sent).toEqual([
      {
        endpoint: "https://push/phone",
        payload: {
          title: "Zadzwoń",
          body: "09:00 · do mamy",
          url: "/",
          tag: `task-${task.id}`,
        },
      },
    ]);
    const subs = await db.select().from(schema.pushSubscription);
    expect(subs.map((s) => s.endpoint)).toEqual(["https://push/phone"]);

    // A second run (or an overlapping one) doesn't repeat it.
    expect(await sendDueReminders(db, sender, NOW)).toEqual({ reminders: 0 });
    expect(sent).toHaveLength(1);
  });

  it("retries later when no device could be reached", async () => {
    await addTask({ reminderAt: minutesAgo(1) });
    const failing: PushSender = async () => {
      throw new Error("push service down");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendDueReminders(db, failing, NOW)).toEqual({ reminders: 0 });
    expect(await sendDueReminders(db, sender, NOW)).toEqual({ reminders: 1 });
    expect(sent).toHaveLength(1);
  });

  it("reminds again when the reminder is moved to a new time", async () => {
    const task = await addTask({ reminderAt: minutesAgo(10) });
    await sendDueReminders(db, sender, NOW);
    await applyTodoActions(db, "u1", [
      {
        type: "taskUpdated",
        id: task.id,
        patch: { reminderTime: "09:55", reminderAt: minutesAgo(5) },
      },
    ]);
    expect(await sendDueReminders(db, sender, NOW)).toEqual({ reminders: 1 });
    expect(sent).toHaveLength(2);
  });
});
