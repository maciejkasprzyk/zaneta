import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { RecurrenceUnit, Settings, SortMode } from "@/lib/todo/types";
import { user } from "./auth-schema";

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

/** Per-user state of the lists defined in code (order and sort mode). */
export const todoList = pgTable(
  "todo_list",
  {
    userId: userId(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    sortMode: text("sort_mode").$type<SortMode>().notNull(),
    position: integer("position").notNull(),
    createdAt: instant("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const todoTask = pgTable(
  "todo_task",
  {
    userId: userId(),
    id: text("id").notNull(),
    listId: text("list_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dueDate: date("due_date", { mode: "string" }),
    effortMinutes: integer("effort_minutes"),
    recurrenceInterval: integer("recurrence_interval"),
    recurrenceUnit: text("recurrence_unit").$type<RecurrenceUnit>(),
    starred: boolean("starred").notNull(),
    starredAt: instant("starred_at"),
    starredPosition: doublePrecision("starred_position"),
    completed: boolean("completed").notNull(),
    completedAt: instant("completed_at"),
    position: doublePrecision("position").notNull(),
    createdAt: instant("created_at").notNull(),
    updatedAt: instant("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("todo_task_user_list_idx").on(t.userId, t.listId),
  ],
);

/** UI preferences (last opened view, hidden lists, …) as one JSON value. */
export const todoSettings = pgTable("todo_settings", {
  userId: userId().primaryKey(),
  settings: jsonb("settings").$type<Settings>().notNull(),
});
