import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorageMode } from "@/lib/storage-mode";
import { applyTodoActions, loadTodoState } from "@/lib/todo/db-repository";
import { isTodoAction } from "@/lib/todo/reducer";

async function authorize(request: Request) {
  if (getStorageMode() !== "database") {
    return { error: Response.json({ error: "no_database" }, { status: 404 }) };
  }
  const user = await getCurrentUser(request.headers);
  if (!user) {
    return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/** The signed-in user's whole todo state. */
export async function GET(request: Request) {
  const { user, error } = await authorize(request);
  if (error) return error;
  const state = await loadTodoState(getDb(), user.id);
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}

/** Applies `{ actions: TodoAction[] }` in order, all or nothing. */
export async function POST(request: Request) {
  const { user, error } = await authorize(request);
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    actions?: unknown;
  } | null;
  const actions = body?.actions;
  if (!Array.isArray(actions) || !actions.every(isTodoAction)) {
    return Response.json({ error: "invalid_actions" }, { status: 400 });
  }
  await applyTodoActions(getDb(), user.id, actions);
  return new Response(null, { status: 204 });
}
