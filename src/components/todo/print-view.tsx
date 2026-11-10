"use client";

import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateShort } from "@/lib/todo/dates";
import { formatEffort, sumEffort } from "@/lib/todo/effort";
import { formatRecurrence } from "@/lib/todo/recurrence";
import { groupByDueDate } from "@/lib/todo/sort";
import { useTodos } from "@/lib/todo/store";
import type { Task } from "@/lib/todo/types";
import { resolveView } from "@/lib/todo/views";
import { cn } from "@/lib/utils";

export function PrintView() {
  const viewId = useSearchParams().get("view");
  const { state, ready } = useTodos();
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const checkboxId = useId();

  if (!ready) {
    return <p className="p-8 text-sm text-muted-foreground">Wczytywanie…</p>;
  }
  const view = resolveView(state, viewId);
  if (!view) {
    return (
      <div className="p-8">
        <p className="mb-4">Nie znaleziono listy do wydruku.</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Wróć do zadań
        </Link>
      </div>
    );
  }

  const listNames = new Map(state.lists.map((l) => [l.id, l.name]));
  const showListName = view.kind === "starred";
  const totalEffort = sumEffort(view.active);
  const printedAt = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const renderTasks = (tasks: Task[]) => (
    <ul className="divide-y divide-neutral-300">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex break-inside-avoid gap-3 py-2.5"
          data-testid="print-task"
        >
          <span
            aria-hidden
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center border border-neutral-700 text-[10px] leading-none"
          >
            {task.completed ? "✓" : ""}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-medium",
                  task.completed && "text-neutral-500 line-through",
                )}
              >
                {task.title}
              </span>
              {task.starred && !showListName && (
                <span title="Oznaczone gwiazdką">★</span>
              )}
            </div>
            {(task.dueDate ||
              task.effortMinutes ||
              task.recurrence ||
              showListName) && (
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-neutral-600">
                {task.dueDate && (
                  <span>Termin: {formatDateShort(task.dueDate)}</span>
                )}
                {task.effortMinutes ? (
                  <span>Nakład: {formatEffort(task.effortMinutes)}</span>
                ) : null}
                {task.recurrence ? (
                  <span>
                    Powtarza się:{" "}
                    {formatRecurrence(task.recurrence).toLowerCase()}
                  </span>
                ) : null}
                {showListName && (
                  <span>Lista: {listNames.get(task.listId)}</span>
                )}
              </div>
            )}
            {task.description && (
              <p className="mt-1 text-sm whitespace-pre-line text-neutral-700">
                {task.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    // The printout is always light, even though the app uses a dark theme.
    <div className="light flex-1 bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-3xl p-6 print:max-w-none print:p-0">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-neutral-50 p-3 print:hidden">
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Wróć
          </Link>
          <label
            htmlFor={checkboxId}
            className="flex flex-1 items-center gap-2 text-sm"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
            />
            Uwzględnij ukończone ({view.completed.length})
          </label>
          <Button onClick={() => window.print()}>
            <PrinterIcon />
            Drukuj
          </Button>
        </div>

        <header className="mb-4 border-b-2 border-neutral-900 pb-2">
          <h1 className="text-2xl font-semibold">{view.title}</h1>
          <p className="text-sm text-neutral-600">
            {printedAt} · zadania do zrobienia: {view.active.length}
            {totalEffort > 0 && (
              <> · łączny nakład: {formatEffort(totalEffort)}</>
            )}
          </p>
        </header>

        {view.active.length === 0 && (
          <p className="py-4 text-sm text-neutral-600">
            Brak zadań do zrobienia.
          </p>
        )}

        {view.sortMode === "date"
          ? groupByDueDate(view.active).map((group) => (
              <section key={group.key} className="mb-3">
                <h2 className="mt-3 text-sm font-semibold tracking-wide uppercase">
                  {group.label}
                </h2>
                {renderTasks(group.tasks)}
              </section>
            ))
          : renderTasks(view.active)}

        {includeCompleted && view.completed.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Ukończone
            </h2>
            {renderTasks(view.completed)}
          </section>
        )}
      </div>
    </div>
  );
}
