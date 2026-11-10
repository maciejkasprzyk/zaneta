"use client";

import { StarIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type EffortUnit, splitEffort, toMinutes } from "@/lib/todo/effort";
import { formatRecurrence } from "@/lib/todo/recurrence";
import type { TaskInput } from "@/lib/todo/store";
import type { RecurrenceUnit, Task, TaskList } from "@/lib/todo/types";
import { cn } from "@/lib/utils";

export const nativeSelectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Task to edit; when absent the dialog creates a new task. */
  task?: Task;
  lists: TaskList[];
  defaultListId: string;
  defaultStarred?: boolean;
  onSubmit: (input: TaskInput) => void;
  onDelete?: () => void;
}

export function TaskDialog(props: TaskDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Remount the form whenever a different task is opened. */}
        {props.open && <TaskForm key={props.task?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  lists,
  defaultListId,
  defaultStarred = false,
  onSubmit,
  onDelete,
  onOpenChange,
}: TaskDialogProps) {
  const id = useId();
  const initialEffort = splitEffort(task?.effortMinutes ?? null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [effortValue, setEffortValue] = useState(initialEffort.value);
  const [effortUnit, setEffortUnit] = useState<EffortUnit>(initialEffort.unit);
  const [listId, setListId] = useState(task?.listId ?? defaultListId);
  const [starred, setStarred] = useState(task?.starred ?? defaultStarred);
  const [repeatUnit, setRepeatUnit] = useState<RecurrenceUnit | "none">(
    task?.recurrence?.unit ?? "none",
  );
  const [repeatInterval, setRepeatInterval] = useState(
    String(task?.recurrence?.interval ?? 1),
  );
  const interval = Math.max(1, Math.round(Number(repeatInterval) || 1));
  const recurrence =
    repeatUnit === "none" ? null : { interval, unit: repeatUnit };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title,
      description: description.trim(),
      dueDate: dueDate || null,
      effortMinutes: effortValue
        ? toMinutes(Number(effortValue.replace(",", ".")), effortUnit)
        : null,
      recurrence,
      listId,
      starred,
    });
    onOpenChange(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{task ? "Edytuj zadanie" : "Nowe zadanie"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-title`}>Tytuł</Label>
        <Input
          id={`${id}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Co jest do zrobienia?"
          required
          autoFocus
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-description`}>Opis</Label>
        <Textarea
          id={`${id}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Szczegóły"
          rows={4}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-date`}>Termin</Label>
          <div className="flex gap-1">
            <Input
              id={`${id}-date`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Usuń termin"
                onClick={() => setDueDate("")}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-effort`}>Nakład pracy</Label>
          <div className="flex gap-1">
            <Input
              id={`${id}-effort`}
              type="number"
              inputMode="decimal"
              min={0}
              step={effortUnit === "h" ? 0.25 : 5}
              value={effortValue}
              onChange={(e) => setEffortValue(e.target.value)}
              placeholder="np. 30"
            />
            <select
              aria-label="Jednostka nakładu pracy"
              className={nativeSelectClass}
              value={effortUnit}
              onChange={(e) => setEffortUnit(e.target.value as EffortUnit)}
            >
              <option value="min">min</option>
              <option value="h">godz.</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-repeat`}>Powtarzanie</Label>
        <div className="flex flex-wrap items-center gap-2">
          {recurrence && (
            <>
              <span className="text-sm">Co</span>
              <Input
                aria-label="Co ile powtarzać"
                type="number"
                min={1}
                step={1}
                className="w-20"
                value={repeatInterval}
                onChange={(e) => setRepeatInterval(e.target.value)}
              />
            </>
          )}
          <select
            id={`${id}-repeat`}
            className={nativeSelectClass}
            value={repeatUnit}
            onChange={(e) =>
              setRepeatUnit(e.target.value as RecurrenceUnit | "none")
            }
          >
            <option value="none">Nie powtarzaj</option>
            <option value="day">dni</option>
            <option value="week">tygodnie</option>
            <option value="month">miesiące</option>
            <option value="year">lata</option>
          </select>
          {recurrence && (
            <span className="text-xs text-muted-foreground">
              {formatRecurrence(recurrence)}, licząc od terminu
              {dueDate ? "" : " (dzisiaj)"}. Po ukończeniu pojawi się kolejne
              zadanie.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={`${id}-list`}>Lista</Label>
          <select
            id={`${id}-list`}
            className={cn(nativeSelectClass, "w-full")}
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-pressed={starred}
          onClick={() => setStarred((s) => !s)}
          className={cn(starred && "text-amber-600")}
        >
          <StarIcon fill={starred ? "currentColor" : "none"} />
          {starred ? "Oznaczone gwiazdką" : "Oznacz gwiazdką"}
        </Button>
      </div>

      <DialogFooter className="items-center sm:justify-between">
        {task && onDelete ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
          >
            <Trash2Icon />
            Usuń
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            {task ? "Zapisz" : "Dodaj"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
