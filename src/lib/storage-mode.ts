/**
 * Where tasks are stored. With `DATABASE_URL` set the app uses Postgres and
 * requires signing in; without it (local development, tests) tasks stay in
 * the browser's localStorage and there is no login.
 */
export type StorageMode = "database" | "local";

export function getStorageMode(): StorageMode {
  return process.env.DATABASE_URL ? "database" : "local";
}
