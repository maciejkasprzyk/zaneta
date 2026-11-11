import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintView } from "@/components/todo/print-view";
import { requireTodoAccess } from "@/lib/require-user";
import { TodoProvider } from "@/lib/todo/store";

export const metadata: Metadata = { title: "Wydruk – Żaneta" };

// Tasks are loaded in the browser, so the view renders on the client;
// the view to print comes from `?view=<listId|starred>`.
export default function PrintPage() {
  return (
    <Suspense>
      <PrintPageContent />
    </Suspense>
  );
}

async function PrintPageContent() {
  const storage = await requireTodoAccess();
  return (
    <TodoProvider storage={storage}>
      <PrintView />
    </TodoProvider>
  );
}
