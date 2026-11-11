"use client";

import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  ListTodoIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getListDefinition } from "@/lib/todo/list-registry";
import type { TaskList } from "@/lib/todo/types";
import { cn } from "@/lib/utils";
import { dndAccessibility, useTaskSensors } from "./board-dnd";

export function ListIcon({
  listId,
  className,
}: {
  listId: string;
  className?: string;
}) {
  const Icon = getListDefinition(listId)?.icon ?? ListTodoIcon;
  return <Icon className={cn("size-4 shrink-0", className)} />;
}

/** Drag-and-drop context for reordering lists (sidebar and dialog). */
export function SortableLists({
  lists,
  onReorder,
  children,
}: {
  lists: TaskList[];
  onReorder: (ids: string[]) => void;
  children: ReactNode;
}) {
  const sensors = useTaskSensors();
  const ids = lists.map((l) => l.id);
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
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** A sortable row; `children` gets the drag handle props to place it. */
export function SortableListRow({
  id,
  name,
  className,
  children,
}: {
  id: string;
  name: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Przeciągnij listę ${name}`}
      className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        className,
        isDragging &&
          "relative z-10 bg-card shadow-lg ring-1 ring-foreground/10",
      )}
    >
      {children(handle)}
    </div>
  );
}

/** Dialog for reordering lists; works the same on phones and desktop. */
export function ListOrderDialog({
  open,
  onOpenChange,
  lists,
  onReorder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: TaskList[];
  onReorder: (ids: string[]) => void;
}) {
  const ids = lists.map((l) => l.id);
  const move = (index: number, delta: number) =>
    onReorder(arrayMove(ids, index, index + delta));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kolejność list</DialogTitle>
          <DialogDescription>
            Przeciągnij za uchwyt albo użyj strzałek.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
          <SortableLists lists={lists} onReorder={onReorder}>
            <ol className="flex flex-col gap-1" aria-label="Listy">
              {lists.map((list, index) => (
                <li key={list.id} data-testid="list-order-item">
                  <SortableListRow
                    id={list.id}
                    name={list.name}
                    className="flex items-center gap-2 rounded-lg border bg-background py-1 pr-1 pl-1"
                  >
                    {(handle) => (
                      <>
                        {handle}
                        <ListIcon
                          listId={list.id}
                          className="text-muted-foreground"
                        />
                        <span className="flex-1 truncate text-sm">
                          {list.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Przenieś wyżej: ${list.name}`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ChevronUpIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Przenieś niżej: ${list.name}`}
                          disabled={index === lists.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ChevronDownIcon />
                        </Button>
                      </>
                    )}
                  </SortableListRow>
                </li>
              ))}
            </ol>
          </SortableLists>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Gotowe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
