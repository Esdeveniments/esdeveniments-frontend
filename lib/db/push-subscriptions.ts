import "server-only";

import { captureException } from "@sentry/nextjs";
import { isDbConfigured, execute } from "./turso";
import { PUSH_SUBSCRIPTIONS_SCHEMA, PUSH_SUBSCRIPTIONS_INDEXES } from "./push-schema";
import type { PushSubscriptionRow } from "types/push";

let schemaInitialized = false;
let schemaPromise: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await execute(PUSH_SUBSCRIPTIONS_SCHEMA);
        for (const idx of PUSH_SUBSCRIPTIONS_INDEXES) {
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

/**
 * Upsert a push subscription. If the endpoint already exists, refreshes keys
 * (browsers rotate keys on resubscription) and updated_at.
 */
export async function upsertSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  if (!isDbConfigured()) {
    throw new Error("Turso DB not configured");
  }
  await ensureSchema();
  await execute(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
     VALUES (?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       updated_at = datetime('now')`,
    [endpoint, p256dh, auth],
  );
}

/**
 * Remove a push subscription by endpoint.
 */
export async function deleteSubscription(endpoint: string): Promise<void> {
  if (!isDbConfigured()) {
    throw new Error("Turso DB not configured");
  }
  await ensureSchema();
  await execute(
    "DELETE FROM push_subscriptions WHERE endpoint = ?",
    [endpoint],
  );
}

/**
 * Batch-delete push subscriptions by endpoint (chunked IN clauses).
 * Used by the send route to clean up expired (404/410) subscriptions
 * without issuing N concurrent single-row deletes.
 */
export async function deleteSubscriptions(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return;
  if (!isDbConfigured()) {
    throw new Error("Turso DB not configured");
  }
  await ensureSchema();

  const CHUNK_SIZE = 100;
  for (let i = 0; i < endpoints.length; i += CHUNK_SIZE) {
    const chunk = endpoints.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => "?").join(",");
    await execute(
      `DELETE FROM push_subscriptions WHERE endpoint IN (${placeholders})`,
      chunk,
    );
  }
}

/**
 * Fetch all stored subscriptions for fan-out sending.
 * Returns an empty array if the DB is not configured.
 */
export async function getAllSubscriptions(): Promise<PushSubscriptionRow[]> {
  if (!isDbConfigured()) return [];
  try {
    await ensureSchema();
    const result = await execute(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions",
    );
    return result.rows as unknown as PushSubscriptionRow[];
  } catch (err) {
    captureException(err, { tags: { feature: "push", action: "getAll" } });
    return [];
  }
}
