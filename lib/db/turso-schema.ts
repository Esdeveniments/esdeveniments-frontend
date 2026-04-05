import "server-only";

/**
 * Schema management for the Turso database.
 *
 * Separated from turso.ts so that read-only paths (e.g., sponsor
 * lookups on page renders) don't pull in DDL constants and schema
 * initialization code.  Only write-path callers (API routes) import
 * this module.
 */
import { execute } from "./turso";
import { SPONSORS_SCHEMA, SPONSORS_INDEXES } from "./sponsors-schema";

let schemaInitialized = false;
let schemaPromise: Promise<void> | null = null;

/**
 * Ensure the sponsors table and indexes exist.
 * Call on write paths only (webhook, image-upload, seed script).
 * Read paths skip this — the table already exists after first setup.
 *
 * Uses a shared promise to deduplicate concurrent calls in the same process.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await execute(SPONSORS_SCHEMA);
        for (const idx of SPONSORS_INDEXES) {
          await execute(idx);
        }
        schemaInitialized = true;
      } catch (err) {
        schemaPromise = null;
        throw err;
      }
    })();
  }
  return schemaPromise;
}
