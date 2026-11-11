import { and, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { pushSubscription, reminderSent, todoTask } from "@/db/todo-schema";
import type { TodoDb } from "@/lib/todo/db-repository";

export interface PushPayload {
  title: string;
  body: string;
  /** Page opened when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other. */
  tag?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one push; resolves to "gone" when the subscription no longer exists. */
export type PushSender = (
  subscription: StoredSubscription,
  payload: PushPayload,
) => Promise<"sent" | "gone">;

/** Reminders older than this are not sent anymore (e.g. after downtime). */
export const MAX_REMINDER_DELAY_MS = 12 * 60 * 60 * 1000;

/** Sends `payload` to every device of the user; drops expired devices. */
export async function sendToUser(
  db: TodoDb,
  userId: string,
  payload: PushPayload,
  send: PushSender,
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));
  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    try {
      if ((await send(sub, payload)) === "gone") {
        await db
          .delete(pushSubscription)
          .where(eq(pushSubscription.endpoint, sub.endpoint));
      } else {
        sent += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("Push failed", sub.endpoint, error);
    }
  }
  return { sent, failed };
}

/**
 * Sends every reminder that is due and not sent yet. Each reminder is first
 * recorded in `reminder_sent`, so overlapping or repeated runs never send it
 * twice, and a late run still sends what it missed (up to 12 h back).
 */
export async function sendDueReminders(
  db: TodoDb,
  send: PushSender,
  now: Date = new Date(),
): Promise<{ reminders: number }> {
  const due = await db
    .select({
      userId: todoTask.userId,
      id: todoTask.id,
      title: todoTask.title,
      description: todoTask.description,
      reminderTime: todoTask.reminderTime,
      reminderAt: todoTask.reminderAt,
    })
    .from(todoTask)
    .where(
      and(
        isNotNull(todoTask.reminderAt),
        lte(todoTask.reminderAt, now),
        gt(
          todoTask.reminderAt,
          new Date(now.getTime() - MAX_REMINDER_DELAY_MS),
        ),
        eq(todoTask.completed, false),
        sql`not exists (select 1 from ${reminderSent} where ${reminderSent.userId} = ${todoTask.userId} and ${reminderSent.taskId} = ${todoTask.id} and ${reminderSent.reminderAt} = ${todoTask.reminderAt})`,
      ),
    );

  let reminders = 0;
  for (const task of due) {
    if (!task.reminderAt) continue;
    const claimed = await db
      .insert(reminderSent)
      .values({
        userId: task.userId,
        taskId: task.id,
        reminderAt: task.reminderAt,
      })
      .onConflictDoNothing()
      .returning({ taskId: reminderSent.taskId });
    if (claimed.length === 0) continue;
    const result = await sendToUser(
      db,
      task.userId,
      {
        title: task.title,
        body: [task.reminderTime, task.description.split("\n")[0]]
          .filter(Boolean)
          .join(" · "),
        url: "/",
        tag: `task-${task.id}`,
      },
      send,
    );
    if (result.sent === 0 && result.failed > 0) {
      // Nothing got through (push service down?): let the next run retry.
      await db
        .delete(reminderSent)
        .where(
          and(
            eq(reminderSent.userId, task.userId),
            eq(reminderSent.taskId, task.id),
            eq(reminderSent.reminderAt, task.reminderAt),
          ),
        );
    } else {
      reminders += 1;
    }
  }
  return { reminders };
}
