"use client";

import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  type SortingStrategy,
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
import { useId, useState } from "react";
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
import { dndAccessibility, useInBoardDnd, useTaskSensors } from "./board-dnd";
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
  headingLevel = 1,
}: {
  view: ResolvedView;
  onAddTask: () => void;
  onOpenTask: (id: string) => void;
  onRenameList: () => void;
  onDeleteList: () => void;
  canDeleteList: boolean;
  /** 1 when the view fills the page, 2 for a column on the desktop board. */
  headingLevel?: 1 | 2;
}) {
  const store = useTodos();
  const titleId = useId();
  // On the desktop board one drag context spans all columns.
  const inBoard = useInBoardDnd() && view.kind === "list";
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const GroupHeading = headingLevel === 1 ? "h2" : "h3";
  const [showCompleted, setShowCompleted] = useState(false);
  const listNames = new Map(store.state.lists.map((l) => [l.id, l.name]));
  const totalEffort = sumEffort(view.active);
  const isStarred = view.kind === "starred";

  const setSortMode = (mode: SortMode) => {
    if (isStarred) store.updateSettings({ starredSortMode: mode });
    else store.setListSortMode(view.id, mode);
  };

  const groupHeading = (label: string, overdue?: boolean) => (
    <GroupHeading
      className={cn(
        "px-3 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        overdue && "text-red-600 dark:text-red-400",
      )}
    >
      {label}
    </GroupHeading>
  );

  const itemProps = (listId: string) =>
    ({
      onToggleCompleted: store.toggleCompleted,
      onToggleStarred: store.toggleStarred,
      onOpen: onOpenTask,
      listName: isStarred ? listNames.get(listId) : undefined,
    }) satisfies Partial<TaskItemProps>;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Heading
            id={titleId}
            className="truncate text-xl font-semibold tracking-tight"
          >
            {view.title}
          </Heading>
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
                  Moja kolejność
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

      {inBoard ? (
        <SortableContext
          items={view.active.map((t) => t.id)}
          strategy={
            view.sortMode === "date"
              ? noShiftStrategy
              : verticalListSortingStrategy
          }
        >
          <div className="flex min-h-12 flex-col">
            {view.sortMode === "date"
              ? groupByDueDate(view.active).map((group) => (
                  <div key={group.key} className="flex flex-col">
                    {groupHeading(group.label, group.overdue)}
                    {group.tasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        ghost
                        task={task}
                        {...itemProps(task.listId)}
                      />
                    ))}
                  </div>
                ))
              : view.active.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    ghost
                    task={task}
                    {...itemProps(task.listId)}
                  />
                ))}
          </div>
        </SortableContext>
      ) : view.sortMode === "date" ? (
        groupByDueDate(view.active).map((group) => (
          <div key={group.key} className="flex flex-col">
            {groupHeading(group.label, group.overdue)}
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} {...itemProps(task.listId)} />
            ))}
          </div>
        ))
      ) : (
        <SortableTasks
          ids={view.active.map((t) => t.id)}
          onReorder={(ids) =>
            isStarred
              ? store.reorderStarred(ids)
              : store.reorderTasks(view.id, ids)
          }
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
  const sensors = useTaskSensors();
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
      accessibility={dndAccessibility}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

/** Date-sorted columns keep their order while something is dragged over. */
const noShiftStrategy: SortingStrategy = () => null;
