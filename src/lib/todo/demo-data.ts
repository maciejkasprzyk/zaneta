import { toISODate } from "./dates";
import type { Task, TaskList, TodoState } from "./types";

/**
 * Dev-only tools (like demo data) are shown everywhere except the
 * production deployment on Vercel (local dev, CI and preview deployments).
 */
export const devToolsEnabled =
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

interface DemoTask {
  title: string;
  description?: string;
  /** Due date as days from today. */
  due?: number;
  effort?: number;
  starred?: boolean;
  completed?: boolean;
}

const DEMO: { name: string; sortMode?: "date"; tasks: DemoTask[] }[] = [
  {
    name: "Moje zadania",
    tasks: [
      {
        title: "Zapłacić rachunki",
        description: "Prąd, internet i czynsz",
        due: -1,
        effort: 20,
        starred: true,
      },
      {
        title: "Zakupy spożywcze",
        description: "Mleko, chleb, jajka, kawa",
        due: 0,
        effort: 45,
      },
      { title: "Umówić wizytę u dentysty", due: 3, effort: 10 },
      { title: "Przeczytać rozdział książki", effort: 90, starred: true },
      { title: "Oddać paczkę na poczcie", due: -3, completed: true },
    ],
  },
  {
    name: "Praca",
    sortMode: "date",
    tasks: [
      {
        title: "Przygotować prezentację na spotkanie",
        description:
          "Slajdy dla zespołu\nDodać wykresy z Q3\nPodsumowanie ryzyk",
        due: 2,
        effort: 180,
        starred: true,
      },
      { title: "Code review PR kolegi", due: 0, effort: 30 },
      { title: "Napisać raport tygodniowy", due: 4, effort: 60 },
      { title: "Zaktualizować dokumentację API", effort: 120 },
      { title: "Odpisać na maile", due: -2, effort: 15, completed: true },
    ],
  },
  {
    name: "Dom",
    tasks: [
      {
        title: "Naprawić cieknący kran",
        description: "Kupić uszczelkę w markecie",
        due: 6,
        effort: 60,
      },
      { title: "Posprzątać garaż", effort: 240 },
      { title: "Podlać kwiaty", due: 1, effort: 5, starred: true },
      { title: "Wymienić żarówkę w przedpokoju", effort: 10, completed: true },
    ],
  },
  { name: "Pusta lista", tasks: [] },
];

/** Builds a fresh state with a few lists and varied tasks for manual testing. */
export function createDemoState(now: Date = new Date()): TodoState {
  const iso = now.toISOString();
  const lists: TaskList[] = [];
  const tasks: Task[] = [];
  DEMO.forEach((demoList, li) => {
    const listId = `demo-list-${li + 1}`;
    lists.push({
      id: listId,
      name: demoList.name,
      sortMode: demoList.sortMode ?? "custom",
      createdAt: iso,
    });
    demoList.tasks.forEach((t, ti) => {
      let dueDate: string | null = null;
      if (t.due !== undefined) {
        const d = new Date(now);
        d.setDate(d.getDate() + t.due);
        dueDate = toISODate(d);
      }
      // Stagger star times so the starred view has a stable order.
      const starredAt = t.starred
        ? new Date(now.getTime() - (li * 10 + ti) * 60_000).toISOString()
        : null;
      tasks.push({
        id: `demo-task-${li + 1}-${ti + 1}`,
        listId,
        title: t.title,
        description: t.description ?? "",
        dueDate,
        effortMinutes: t.effort ?? null,
        starred: Boolean(t.starred),
        starredAt,
        completed: Boolean(t.completed),
        completedAt: t.completed ? iso : null,
        position: ti,
        createdAt: iso,
        updatedAt: iso,
      });
    });
  });
  return {
    lists,
    tasks,
    settings: { activeView: lists[0].id, starredSortMode: "custom" },
  };
}
