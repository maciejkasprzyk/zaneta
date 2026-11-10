import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintView } from "@/components/todo/print-view";
import { TodoProvider } from "@/lib/todo/store";

export const metadata: Metadata = { title: "Wydruk – Żaneta" };

// Tasks live in the browser, so the whole page renders on the client;
// the view to print comes from `?view=<listId|starred>`.
export default function PrintPage() {
  return (
    <Suspense>
      <TodoProvider>
        <PrintView />
      </TodoProvider>
    </Suspense>
  );
}
