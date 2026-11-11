import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { getStorageMode } from "@/lib/storage-mode";

/** The signed-in user for /api routes, or an error response. */
export async function userFromRequest(request: Request) {
  if (getStorageMode() !== "database") {
    return { error: Response.json({ error: "no_database" }, { status: 404 }) };
  }
  const user = await getCurrentUser(request.headers);
  if (!user) {
    return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user };
}
