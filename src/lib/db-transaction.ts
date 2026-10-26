import "server-only";
import { db } from "./db";

/** Synchronous SQLite writes are committed together across all Next.js workers. */
export function immediateTransaction<T>(operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
