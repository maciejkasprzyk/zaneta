import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

function createDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 5 });
  // On Vercel (Fluid compute) idle connections are closed before the
  // function is suspended; elsewhere this is a no-op.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

let db: Database | undefined;

/** The app's database. Only call it when `isDatabaseConfigured()`. */
export function getDb(): Database {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db = createDb(url);
  }
  return db;
}
