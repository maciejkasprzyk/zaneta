"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEffort, sumEffort } from "@/lib/todo/effort";
import { groupByDueDate } from "@/lib/todo/sort";
import { useTodos } from "@/lib/todo/store";
import type { SortMode } from "@/lib/todo/types";
import type { ResolvedView } from "@/lib/todo/views";
import { cn } from "@/lib/utils";
import { SortableTaskItem, TaskItem, type TaskItemProps } from "./task-item";

const pluralTasks = (n: number) => {
  if (n === 1) return "1 zadanie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${n} zadania`;
  }
  return `${n} zadań`;
};

export function TaskView({
  view,
  onAddTask,
  onOpenTask,
  onRenameList,
  onDeleteList,
  canDeleteList,
}: {
  view: ResolvedView;
  onAddTask: () => void;
  onOpenTask: (id: string) => void;
  onRenameList: () => void;
  onDeleteList: () => void;
  canDeleteList: boolean;
}) {
  const store = useTodos();
  const [showCompleted, setShowCompleted] = useState(false);
  const listNames = new Map(store.state.lists.map((l) => [l.id, l.name]));
  const totalEffort = sumEffort(view.active);
  const isStarred = view.kind === "starred";

  const setSortMode = (mode: SortMode) => {
    if (isStarred) store.updateSettings({ starredSortMode: mode });
    else store.setListSortMode(view.id, mode);
  };

  const itemProps = (listId: string) =>
    ({
      onToggleCompleted: store.toggleCompleted,
      onToggleStarred: store.toggleStarred,
      onOpen: onOpenTask,
      listName: isStarred ? listNames.get(listId) : undefined,
    }) satisfies Partial<TaskItemProps>;

  return (
    <section aria-labelledby="view-title" className="flex flex-col gap-2">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1
            id="view-title"
            className="truncate text-xl font-semibold tracking-tight"
          >
            {view.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pluralTasks(view.active.length)}
            {totalEffort > 0 && <> · łącznie {formatEffort(totalEffort)}</>}
          </p>
        </div>
        <Link
          href={`/print?view=${encodeURIComponent(view.id)}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={isStarred ? "Drukuj zadania z gwiazdką" : "Drukuj listę"}
          title={isStarred ? "Drukuj zadania z gwiazdką" : "Drukuj listę"}
        >
          <PrinterIcon />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Opcje listy" />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sortuj według</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={view.sortMode}
                onValueChange={(value) => setSortMode(value as SortMode)}
              >
                <DropdownMenuRadioItem value="custom" closeOnClick>
                  {isStarred ? "Kolejność oznaczenia" : "Moja kolejność"}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date" closeOnClick>
                  Data
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href={`/print?view=${encodeURIComponent(view.id)}`} />
              }
            >
              <PrinterIcon />
              {isStarred ? "Drukuj zadania z gwiazdką" : "Drukuj listę"}
            </DropdownMenuItem>
            {!isStarred && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onRenameList}>
                  <PencilIcon />
                  Zmień nazwę listy
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={view.completed.length === 0}
                  onClick={() => store.clearCompleted(view.id)}
                >
                  <Trash2Icon />
                  Usuń ukończone zadania
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDeleteList}
                  onClick={onDeleteList}
                >
                  <Trash2Icon />
                  Usuń listę
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Button
        variant="ghost"
        className="h-10 justify-start gap-3 px-2 text-blue-700 hover:text-blue-800 dark:text-blue-400"
        onClick={onAddTask}
      >
        <PlusIcon className="size-5" />
        Dodaj zadanie
      </Button>

      {view.active.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          {isStarred
            ? "Brak zadań oznaczonych gwiazdką. Kliknij gwiazdkę przy zadaniu, aby je tu zobaczyć."
            : "Brak zadań. Dodaj pierwsze zadanie."}
        </p>
      )}

      {view.sortMode === "date" ? (
        groupByDueDate(view.active).map((group) => (
          <div key={group.key} className="flex flex-col">
            <h2
              className={cn(
                "px-3 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase",
                group.overdue && "text-red-600 dark:text-red-400",
              )}
            >
              {group.label}
            </h2>
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} {...itemProps(task.listId)} />
            ))}
          </div>
        ))
      ) : isStarred ? (
        <div className="flex flex-col">
          {view.active.map((task) => (
            <TaskItem key={task.id} task={task} {...itemProps(task.listId)} />
          ))}
        </div>
      ) : (
        <SortableTasks
          ids={view.active.map((t) => t.id)}
          onReorder={(ids) => store.reorderTasks(view.id, ids)}
        >
          {view.active.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              {...itemProps(task.listId)}
            />
          ))}
        </SortableTasks>
      )}

      {view.completed.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((s) => !s)}
          >
            {showCompleted ? <ChevronDownIcon /> : <ChevronRightIcon />}
            Ukończone ({view.completed.length})
          </Button>
          {showCompleted &&
            view.completed.map((task) => (
              <TaskItem key={task.id} task={task} {...itemProps(task.listId)} />
            ))}
        </div>
      )}
    </section>
  );
}

function SortableTasks({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Aby przenieść zadanie, naciśnij spację lub Enter, użyj strzałek, a następnie ponownie naciśnij spację lub Enter.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">{children}</div>
      </SortableContext>
    </DndContext>
  );
}
