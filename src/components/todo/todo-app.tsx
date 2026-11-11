"use client";

import {
  ArrowUpDownIcon,
  FlaskConicalIcon,
  LayoutGridIcon,
  ListTodoIcon,
  StarIcon,
} from "lucide-react";
import { type TouchEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { createDemoState, devToolsEnabled } from "@/lib/todo/demo-data";
import { useTodos } from "@/lib/todo/store";
import { STARRED_VIEW } from "@/lib/todo/types";
import {
  type ResolvedView,
  resolveView,
  STARRED_TITLE,
} from "@/lib/todo/views";
import { cn } from "@/lib/utils";
import { BoardDndProvider, ListColumn } from "./board-dnd";
import { ConfirmDialog } from "./confirm-dialog";
import {
  ListIcon,
  ListOrderDialog,
  SortableListRow,
  SortableLists,
} from "./list-order";
import { TaskDialog } from "./task-dialog";
import { TaskView } from "./task-view";

type TaskDialogState =
  | { mode: "create"; listId: string; starred: boolean }
  | { mode: "edit"; taskId: string };

const navButtonClass = (active: boolean) =>
  cn(
    "flex shrink-0 items-center gap-3 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted md:rounded-r-full md:rounded-l-md",
    active &&
      "bg-blue-100 font-medium text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-100",
  );

export function TodoApp() {
  const store = useTodos();
  const { state, ready } = store;
  // Desktop shows every list side by side (like Google Tasks); phones show
  // one list at a time and switch with swipes.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [listOrderOpen, setListOrderOpen] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [slideFrom, setSlideFrom] = useState<"left" | "right" | null>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const navRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLElement>(null);

  const fallbackId = state.lists[0]?.id ?? null;
  const view =
    resolveView(state, state.settings.activeView) ??
    resolveView(state, fallbackId);
  const hiddenListIds = state.settings.hiddenListIds ?? [];
  const showBoard = isDesktop && view?.kind === "list";

  // Keep the active list visible: in the scrolling mobile nav, and as a
  // column on the desktop board.
  const activeId = view?.id;
  useEffect(() => {
    if (!activeId) return;
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    boardRef.current
      ?.querySelector(`[data-list-column="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  if (!ready || !view) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Wczytywanie…
      </div>
    );
  }

  const selectView = (id: string) => {
    setSlideFrom(null);
    store.updateSettings({ activeView: id });
  };
  const showList = (id: string) => {
    store.setListHidden(id, false);
    selectView(id);
  };
  const editedTask =
    taskDialog?.mode === "edit"
      ? state.tasks.find((t) => t.id === taskDialog.taskId)
      : undefined;
  const openCount = (listId: string) =>
    state.tasks.filter((t) => t.listId === listId && !t.completed).length;
  const starredCount = state.tasks.filter(
    (t) => t.starred && !t.completed,
  ).length;

  const renderView = (v: ResolvedView, headingLevel: 1 | 2) => (
    <TaskView
      view={v}
      headingLevel={headingLevel}
      onAddTask={() =>
        setTaskDialog({
          mode: "create",
          listId: v.list?.id ?? fallbackId ?? "",
          starred: v.kind === "starred",
        })
      }
      onOpenTask={(taskId) => setTaskDialog({ mode: "edit", taskId })}
      onReorderLists={() => setListOrderOpen(true)}
    />
  );

  // Mobile: swipe left/right switches to the next/previous view.
  const viewIds = [STARRED_VIEW, ...state.lists.map((l) => l.id)];
  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    if (
      isDesktop ||
      event.touches.length !== 1 ||
      target.closest("[data-no-swipe]")
    ) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const quick = Date.now() - start.time < 800;
    if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      return;
    }
    const index = viewIds.indexOf(view.id);
    const next = viewIds[index + (dx < 0 ? 1 : -1)];
    if (!next) return;
    setSlideFrom(dx < 0 ? "right" : "left");
    store.updateSettings({ activeView: next });
  };

  const visibleLists = state.lists.filter((l) => !hiddenListIds.includes(l.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="border-b bg-muted/30 md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-3 md:py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ListTodoIcon className="size-5" />
          </span>
          <span className="flex-1 text-lg font-semibold">Żaneta</span>
          {devToolsEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDemo(true)}
              title="Tylko w wersji deweloperskiej"
            >
              <FlaskConicalIcon />
              Dane testowe
            </Button>
          )}
        </div>
        <nav
          ref={navRef}
          aria-label="Listy zadań"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible"
        >
          {isDesktop && (
            <button
              type="button"
              onClick={() =>
                selectView(visibleLists[0]?.id ?? fallbackId ?? "")
              }
              aria-current={showBoard ? "page" : undefined}
              className={navButtonClass(showBoard)}
            >
              <LayoutGridIcon className="size-4 shrink-0" />
              <span className="flex-1 text-left">Wszystkie listy</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => selectView(STARRED_VIEW)}
            aria-current={view.kind === "starred" ? "page" : undefined}
            className={navButtonClass(view.kind === "starred")}
          >
            <StarIcon className="size-4 shrink-0 text-amber-500" />
            {/* Phones show just the star icon to save room in the list bar. */}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !isDesktop && "sr-only",
              )}
            >
              {STARRED_TITLE}
            </span>
            {starredCount > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {starredCount}
              </span>
            )}
          </button>
          {isDesktop && (
            <div className="flex items-center justify-between pt-4 pb-1 pl-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Listy
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Zmień kolejność list"
                title="Zmień kolejność list"
                onClick={() => setListOrderOpen(true)}
              >
                <ArrowUpDownIcon />
              </Button>
            </div>
          )}
          {isDesktop ? (
            <SortableLists lists={state.lists} onReorder={store.reorderLists}>
              {state.lists.map((list) => (
                <SortableListRow
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  className="group/row flex items-center gap-1.5 rounded-md hover:bg-muted"
                >
                  {(handle) => (
                    <>
                      <span className="opacity-0 group-hover/row:opacity-100 focus-within:opacity-100">
                        {handle}
                      </span>
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-blue-600"
                        checked={!hiddenListIds.includes(list.id)}
                        onChange={(e) =>
                          store.setListHidden(list.id, !e.target.checked)
                        }
                        aria-label={`Pokaż listę ${list.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => showList(list.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-3 text-left text-sm"
                      >
                        <ListIcon
                          listId={list.id}
                          className="text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {list.name}
                        </span>
                        {openCount(list.id) > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {openCount(list.id)}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </SortableListRow>
              ))}
            </SortableLists>
          ) : (
            state.lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => selectView(list.id)}
                aria-current={view.id === list.id ? "page" : undefined}
                className={navButtonClass(view.id === list.id)}
              >
                <ListIcon listId={list.id} />
                <span className="min-w-0 flex-1 truncate text-left">
                  {list.name}
                </span>
                {openCount(list.id) > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {openCount(list.id)}
                  </span>
                )}
              </button>
            ))
          )}
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setListOrderOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted"
            >
              <ArrowUpDownIcon className="size-4" />
              Kolejność list
            </button>
          )}
        </nav>
      </aside>

      {showBoard ? (
        <main
          ref={boardRef}
          className="flex min-w-0 flex-1 items-start gap-4 overflow-x-auto p-6"
        >
          {visibleLists.length === 0 && (
            <p className="m-auto text-sm text-muted-foreground">
              Wszystkie listy są ukryte. Zaznacz listę w panelu po lewej.
            </p>
          )}
          <BoardDndProvider>
            {visibleLists.map((list) => {
              const listView = resolveView(state, list.id);
              if (!listView) return null;
              return (
                <ListColumn
                  key={list.id}
                  listId={list.id}
                  className="w-[22rem] shrink-0 rounded-xl border bg-card p-3 shadow-sm"
                >
                  {renderView(listView, 2)}
                </ListColumn>
              );
            })}
          </BoardDndProvider>
        </main>
      ) : (
        <main
          className="flex flex-1 touch-pan-y justify-center overflow-x-hidden px-3 py-4 md:px-8 md:py-8"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            key={view.id}
            className={cn(
              "h-fit w-full max-w-2xl rounded-xl border bg-card p-3 shadow-sm md:p-4",
              slideFrom && "animate-in duration-200 fade-in-0",
              slideFrom === "right" && "slide-in-from-right-12",
              slideFrom === "left" && "slide-in-from-left-12",
            )}
          >
            {renderView(view, 1)}
          </div>
        </main>
      )}

      <TaskDialog
        open={taskDialog !== null}
        onOpenChange={(open) => !open && setTaskDialog(null)}
        task={editedTask}
        lists={state.lists}
        defaultListId={
          taskDialog?.mode === "create" ? taskDialog.listId : (fallbackId ?? "")
        }
        defaultStarred={taskDialog?.mode === "create" && taskDialog.starred}
        onSubmit={(input) => {
          if (editedTask) store.updateTask(editedTask.id, input);
          else store.createTask(input);
        }}
        onDelete={
          editedTask ? () => store.deleteTask(editedTask.id) : undefined
        }
      />

      <ListOrderDialog
        open={listOrderOpen}
        onOpenChange={setListOrderOpen}
        lists={state.lists}
        onReorder={store.reorderLists}
      />

      {devToolsEnabled && (
        <ConfirmDialog
          open={confirmDemo}
          onOpenChange={setConfirmDemo}
          title="Wczytać dane testowe?"
          description="Wszystkie obecne listy i zadania zostaną usunięte i zastąpione przykładowymi danymi."
          confirmLabel="Wczytaj dane testowe"
          onConfirm={() => {
            setSlideFrom(null);
            store.replaceState(createDemoState());
          }}
        />
      )}
    </div>
  );
}
