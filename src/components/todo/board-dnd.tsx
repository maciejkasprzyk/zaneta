"use client";

import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createContext, type ReactNode, useContext, useState } from "react";
import { useTodos } from "@/lib/todo/store";
import { resolveView } from "@/lib/todo/views";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";

/** Data attached to draggable tasks and to list columns. */
export type DropData = { type: "task" | "column"; listId: string };

export const dndAccessibility = {
  screenReaderInstructions: {
    draggable:
      "Aby przenieść zadanie, naciśnij spację lub Enter, użyj strzałek, a następnie ponownie naciśnij spację lub Enter.",
  },
};

export function useTaskSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

/** Prefer the task under the pointer; fall back to the column. */
const boardCollision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const hits = pointer.length > 0 ? pointer : rectIntersection(args);
  const taskIds = new Set(
    hits
      .filter((hit) => {
        const container = args.droppableContainers.find((c) => c.id === hit.id);
        return (container?.data.current as DropData)?.type === "task";
      })
      .map((hit) => hit.id),
  );
  if (taskIds.size === 0) return hits;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) =>
      taskIds.has(c.id),
    ),
  });
};

const BoardDndContext = createContext<{ overListId: string | null } | null>(
  null,
);

/** True inside the desktop board, where one drag context spans all lists. */
export function useInBoardDnd() {
  return useContext(BoardDndContext) !== null;
}

/**
 * One drag-and-drop context for every column of the desktop board, so tasks
 * can be reordered within a list and dragged to another list.
 */
export function BoardDndProvider({ children }: { children: ReactNode }) {
  const store = useTodos();
  const sensors = useTaskSensors();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overListId, setOverListId] = useState<string | null>(null);
  const activeTask = store.state.tasks.find((t) => t.id === activeId);

  const reset = () => {
    setActiveId(null);
    setOverListId(null);
  };

  const onDragStart = ({ active }: DragStartEvent) =>
    setActiveId(String(active.id));

  const onDragOver = ({ over }: DragOverEvent) =>
    setOverListId((over?.data.current as DropData | undefined)?.listId ?? null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    reset();
    const task = store.state.tasks.find((t) => t.id === active.id);
    const data = over?.data.current as DropData | undefined;
    if (!task || !over || !data) return;
    const target = resolveView(store.state, data.listId);
    if (!target) return;
    const ids = target.active.map((t) => t.id);

    if (data.listId === task.listId) {
      if (target.sortMode !== "custom" || data.type !== "task") return;
      const from = ids.indexOf(task.id);
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0 || from === to) return;
      store.reorderTasks(task.listId, arrayMove(ids, from, to));
      return;
    }

    // Moving to another list: drop before the task under the pointer, or
    // at the end when dropped on the column itself.
    const index = data.type === "task" ? ids.indexOf(String(over.id)) : -1;
    ids.splice(index < 0 ? ids.length : index, 0, task.id);
    store.moveTask(task.id, data.listId, ids);
  };

  return (
    <BoardDndContext.Provider value={{ overListId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={boardCollision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={reset}
        accessibility={dndAccessibility}
      >
        {children}
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-lg bg-card shadow-xl ring-1 ring-foreground/15">
              <TaskItem
                task={activeTask}
                onToggleCompleted={() => {}}
                onToggleStarred={() => {}}
                onOpen={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </BoardDndContext.Provider>
  );
}

/** A board column that accepts tasks dragged from other lists. */
export function ListColumn({
  listId,
  className,
  children,
}: {
  listId: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `column:${listId}`,
    data: { type: "column", listId } satisfies DropData,
  });
  const board = useContext(BoardDndContext);
  return (
    <div
      ref={setNodeRef}
      data-list-column={listId}
      className={cn(
        className,
        "transition-shadow",
        board?.overListId === listId && "ring-2 ring-blue-500/60",
      )}
    >
      {children}
    </div>
  );
}
