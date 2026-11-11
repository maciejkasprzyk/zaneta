import { describe, expect, it, vi } from "vitest";
import { ApiTodoRepository, MIGRATED_KEY } from "./api-repository";
import { STORAGE_KEY } from "./local-storage-repository";
import type { TodoAction } from "./reducer";
import { makeTask } from "./test-utils";
import { emptyState } from "./types";

function fakeServer(options: { failFirstPost?: boolean } = {}) {
  const posted: TodoAction[][] = [];
  let failNext = options.failFirstPost ?? false;
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (failNext) {
        failNext = false;
        return new Response(null, { status: 500 });
      }
      posted.push(JSON.parse(String(init.body)).actions);
      return new Response(null, { status: 204 });
    }
    return Response.json(emptyState());
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, posted };
}

const action = (id: string): TodoAction => ({ type: "taskDeleted", id });

describe("ApiTodoRepository", () => {
  it("sends every change, in order", async () => {
    const server = fakeServer();
    const repo = new ApiTodoRepository({ fetch: server.fetch });
    await repo.apply(action("a"));
    await repo.apply(action("b"));
    await repo.apply(action("c"));
    await repo.idle();
    expect(server.posted.flat()).toEqual([
      action("a"),
      action("b"),
      action("c"),
    ]);
  });

  it("retries a failed save with the same changes first", async () => {
    vi.useFakeTimers();
    const server = fakeServer({ failFirstPost: true });
    const repo = new ApiTodoRepository({ fetch: server.fetch });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await repo.apply(action("a"));
    await vi.advanceTimersByTimeAsync(10);
    await repo.apply(action("b"));
    await vi.advanceTimersByTimeAsync(1_100);
    vi.useRealTimers();
    await repo.idle();
    expect(server.posted).toEqual([[action("a"), action("b")]]);
  });

  it("copies tasks from localStorage once when the database is empty", async () => {
    const server = fakeServer();
    const task = makeTask();
    localStorage.clear();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, ...emptyState(), tasks: [task] }),
    );
    const repo = new ApiTodoRepository({
      fetch: server.fetch,
      legacyStorage: localStorage,
    });
    const state = await repo.load();
    expect(state.tasks).toEqual([task]);
    await repo.idle();
    expect(server.posted).toHaveLength(1);
    expect(server.posted[0][0].type).toBe("stateReplaced");
    expect(localStorage.getItem(MIGRATED_KEY)).not.toBeNull();

    const again = new ApiTodoRepository({
      fetch: server.fetch,
      legacyStorage: localStorage,
    });
    expect((await again.load()).tasks).toEqual([]);
    expect(server.posted).toHaveLength(1);
  });

  it("reports a missing session", async () => {
    const onUnauthorized = vi.fn();
    const repo = new ApiTodoRepository({
      fetch: (async () =>
        new Response(null, { status: 401 })) as unknown as typeof fetch,
      onUnauthorized,
    });
    await expect(repo.load()).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
