import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageTodoRepository } from "@/lib/todo/local-storage-repository";
import { TodoProvider } from "@/lib/todo/store";
import { TodoApp } from "./todo-app";

async function renderApp() {
  const repository = new LocalStorageTodoRepository(localStorage);
  render(
    <TodoProvider repository={repository}>
      <TodoApp />
    </TodoProvider>,
  );
  return {
    repository,
    heading: await screen.findByRole("heading", { level: 1 }),
  };
}

// jsdom has no matchMedia; render the phone (single list) layout.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

describe("TodoApp", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("opens the inbox on first visit", async () => {
    const { heading } = await renderApp();
    expect(heading.textContent).toBe("Inbox");
  });

  it("adds a task with details and stars it", async () => {
    const { repository } = await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Dodaj zadanie" }));
    fireEvent.change(await screen.findByLabelText("Tytuł"), {
      target: { value: "Kupić mleko" },
    });
    fireEvent.change(screen.getByLabelText("Opis"), {
      target: { value: "2 litry" },
    });
    fireEvent.change(screen.getByLabelText("Termin"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText("Nakład pracy"), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText("Jednostka nakładu pracy"), {
      target: { value: "h" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj" }));

    expect(await screen.findByText("Kupić mleko")).toBeDefined();
    expect(screen.getByText("1 h 30 min")).toBeDefined();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Oznacz gwiazdką: Kupić mleko" }),
      );
    });

    const stored = await repository.load();
    expect(stored.tasks).toHaveLength(1);
    expect(stored.tasks[0]).toMatchObject({
      title: "Kupić mleko",
      description: "2 litry",
      dueDate: "2026-11-20",
      effortMinutes: 90,
      starred: true,
    });
  });
});
