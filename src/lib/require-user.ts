import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { getStorageMode, type StorageMode } from "./storage-mode";

/**
 * For pages showing tasks: returns where data lives and, when it lives in
 * the database, makes sure someone allowed is signed in (else → /login).
 * Call it inside a <Suspense> boundary, it reads the request.
 */
export async function requireTodoAccess(): Promise<StorageMode> {
  const storage = getStorageMode();
  if (storage === "database" && !(await getCurrentUser())) {
    redirect("/login");
  }
  return storage;
}
