"use client";

import { ListTodoIcon, PlusIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { useTodos } from "@/lib/todo/store";
import { STARRED_VIEW } from "@/lib/todo/types";
import { resolveView, STARRED_TITLE } from "@/lib/todo/views";
import { cn } from "@/lib/utils";
import { ConfirmDialog, ListNameDialog } from "./list-dialogs";
import { TaskDialog } from "./task-dialog";
import { TaskView } from "./task-view";

type TaskDialogState = { mode: "create" } | { mode: "edit"; taskId: string };

export function TodoApp() {
  const store = useTodos();
  const { state, ready } = store;
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [listDialog, setListDialog] = useState<"create" | "rename" | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fallbackId = state.lists[0]?.id ?? null;
  const view =
    resolveView(state, state.settings.activeView) ??
    resolveView(state, fallbackId);

  if (!ready || !view) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Wczytywanie…
      </div>
    );
  }

  const selectView = (id: string) => store.updateSettings({ activeView: id });
  const editedTask =
    taskDialog?.mode === "edit"
      ? state.tasks.find((t) => t.id === taskDialog.taskId)
      : undefined;
  const defaultListId = view.list?.id ?? fallbackId ?? "";

  const navItems = [
    {
      id: STARRED_VIEW,
      label: STARRED_TITLE,
      icon: StarIcon,
      count: state.tasks.filter((t) => t.starred && !t.completed).length,
    },
    ...state.lists.map((list) => ({
      id: list.id,
      label: list.name,
      icon: ListTodoIcon,
      count: state.tasks.filter((t) => t.listId === list.id && !t.completed)
        .length,
    })),
  ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-muted/30 md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-3 md:py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ListTodoIcon className="size-5" />
          </span>
          <span className="text-lg font-semibold">Żaneta</span>
        </div>
        <nav
          aria-label="Listy zadań"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible"
        >
          {navItems.map((item, i) => (
            <div key={item.id} className="contents">
              {i === 1 && (
                <div className="hidden px-3 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase md:block">
                  Listy
                </div>
              )}
              <button
                type="button"
                onClick={() => selectView(item.id)}
                aria-current={view.id === item.id ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted md:rounded-r-full md:rounded-l-md",
                  view.id === item.id &&
                    "bg-blue-100 font-medium text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-100",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0",
                    item.id === STARRED_VIEW && "text-amber-500",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-left">
                  {item.label}
                </span>
                {item.count > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setListDialog("create")}
            className="flex shrink-0 items-center gap-3 rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted md:rounded-l-md"
          >
            <PlusIcon className="size-4" />
            Nowa lista
          </button>
        </nav>
      </aside>

      <main className="flex flex-1 justify-center px-3 py-4 md:px-8 md:py-8">
        <div className="w-full max-w-2xl rounded-xl border bg-card p-3 shadow-sm md:p-4">
          <TaskView
            key={view.id}
            view={view}
            onAddTask={() => setTaskDialog({ mode: "create" })}
            onOpenTask={(taskId) => setTaskDialog({ mode: "edit", taskId })}
            onRenameList={() => setListDialog("rename")}
            onDeleteList={() => setConfirmDelete(true)}
            canDeleteList={state.lists.length > 1}
          />
        </div>
      </main>

      <TaskDialog
        open={taskDialog !== null}
        onOpenChange={(open) => !open && setTaskDialog(null)}
        task={editedTask}
        lists={state.lists}
        defaultListId={defaultListId}
        defaultStarred={view.kind === "starred"}
        onSubmit={(input) => {
          if (editedTask) store.updateTask(editedTask.id, input);
          else store.createTask(input);
        }}
        onDelete={
          editedTask ? () => store.deleteTask(editedTask.id) : undefined
        }
      />

      <ListNameDialog
        open={listDialog !== null}
        onOpenChange={(open) => !open && setListDialog(null)}
        title={listDialog === "rename" ? "Zmień nazwę listy" : "Nowa lista"}
        submitLabel={listDialog === "rename" ? "Zapisz" : "Utwórz"}
        initialName={listDialog === "rename" ? (view.list?.name ?? "") : ""}
        onSubmit={(name) => {
          if (listDialog === "rename" && view.list) {
            store.renameList(view.list.id, name);
          } else {
            selectView(store.createList(name));
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Usunąć listę „${view.title}”?`}
        description="Wszystkie zadania z tej listy zostaną trwale usunięte."
        confirmLabel="Usuń listę"
        onConfirm={() => {
          if (view.list) store.deleteList(view.list.id);
          store.updateSettings({ activeView: null });
        }}
      />
    </div>
  );
}
