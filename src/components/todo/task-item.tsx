"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  GripVerticalIcon,
  StarIcon,
} from "lucide-react";
import { formatDueDate, isOverdue } from "@/lib/todo/dates";
import { formatEffort } from "@/lib/todo/effort";
import type { Task } from "@/lib/todo/types";
import { cn } from "@/lib/utils";

export interface TaskItemProps {
  task: Task;
  /** Shown as a small label, e.g. in the starred view. */
  listName?: string;
  onToggleCompleted: (id: string) => void;
  onToggleStarred: (id: string) => void;
  onOpen: (id: string) => void;
  dragHandle?: {
    ref: (element: HTMLElement | null) => void;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  };
  dragging?: boolean;
}

export function TaskItem({
  task,
  listName,
  onToggleCompleted,
  onToggleStarred,
  onOpen,
  dragHandle,
  dragging,
}: TaskItemProps) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  return (
    <div
      data-testid="task-item"
      className={cn(
        "group relative flex items-start gap-1 rounded-lg py-2 pr-2 pl-1 transition-colors hover:bg-muted/60",
        dragging && "z-10 bg-background shadow-lg ring-1 ring-foreground/10",
      )}
    >
      {dragHandle ? (
        <button
          type="button"
          aria-label={`Przeciągnij zadanie ${task.title}`}
          className="mt-0.5 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground opacity-40 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          ref={dragHandle.ref}
          {...dragHandle.attributes}
          {...dragHandle.listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <button
        type="button"
        aria-pressed={task.completed}
        aria-label={
          task.completed
            ? `Oznacz jako nieukończone: ${task.title}`
            : `Oznacz jako ukończone: ${task.title}`
        }
        onClick={() => onToggleCompleted(task.id)}
        className={cn(
          "group/check mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/60 text-primary-foreground transition-colors hover:border-blue-600",
          task.completed && "border-blue-600 bg-blue-600",
        )}
      >
        <CheckIcon
          className={cn(
            "size-3 stroke-3",
            task.completed
              ? "opacity-100"
              : "text-blue-600 opacity-0 group-hover/check:opacity-100",
          )}
        />
      </button>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="min-w-0 flex-1 rounded-md px-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "block text-sm leading-6 break-words",
            task.completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {task.description && (
          <span className="line-clamp-2 block text-xs break-words whitespace-pre-line text-muted-foreground">
            {task.description}
          </span>
        )}
        {(task.dueDate || task.effortMinutes || listName) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  overdue
                    ? "border-red-200 text-red-600 dark:border-red-900 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.effortMinutes ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {formatEffort(task.effortMinutes)}
              </span>
            ) : null}
            {listName && (
              <span className="text-xs text-muted-foreground">{listName}</span>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-pressed={task.starred}
        aria-label={
          task.starred
            ? `Usuń gwiazdkę: ${task.title}`
            : `Oznacz gwiazdką: ${task.title}`
        }
        onClick={() => onToggleStarred(task.id)}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-opacity hover:bg-muted",
          task.starred
            ? "text-amber-500"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-60",
        )}
      >
        <StarIcon
          className="size-4"
          fill={task.starred ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}

export function SortableTaskItem(props: Omit<TaskItemProps, "dragHandle">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10")}
    >
      <TaskItem
        {...props}
        dragging={isDragging}
        dragHandle={{ ref: setActivatorNodeRef, attributes, listeners }}
      />
    </div>
  );
}
