import { Suspense } from "react";
import { TodoApp } from "@/components/todo/todo-app";
import { requireTodoAccess } from "@/lib/require-user";
import { TodoProvider } from "@/lib/todo/store";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Wczytywanie…
        </div>
      }
    >
      <TodoPage />
    </Suspense>
  );
}

async function TodoPage() {
  const storage = await requireTodoAccess();
  return (
    <TodoProvider storage={storage}>
      <TodoApp />
    </TodoProvider>
  );
}
