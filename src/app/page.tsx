import { TodoApp } from "@/components/todo/todo-app";
import { TodoProvider } from "@/lib/todo/store";

export default function Home() {
  return (
    <TodoProvider>
      <TodoApp />
    </TodoProvider>
  );
}
