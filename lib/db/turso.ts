import "server-only";

/**
 * Minimal Turso HTTP client using raw fetch().
 *
 * Replaces @libsql/client (25 MB with native bindings) with ~50 lines
 * of fetch() to Turso's pipeline HTTP API. Node 22 has fetch() built in.
 *
 * Uses environment variables:
 * - TURSO_DATABASE_URL: Database URL (libsql:// or https://)
 * - TURSO_AUTH_TOKEN: Authentication token from Turso dashboard
 *
 * Free tier (2026): 100 databases, 5 GB storage, 500M reads, 10M writes/month.
 * @see https://docs.turso.tech/sdk/http/reference
 */

/** Convert libsql:// scheme to https:// for the HTTP API. */
function resolveUrl(raw: string): string {
  if (raw.startsWith("libsql://")) return raw.replace("libsql://", "https://");
  return raw;
}

/** Convert a JS value to Turso's hrana wire format. */
function toWireArg(
  v: unknown,
):
  | { type: "null" }
  | { type: "integer" | "text"; value: string }
  | { type: "float"; value: number } {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { type: "integer", value: String(v) }
      : { type: "float", value: v };
  return { type: "text", value: String(v) };
}

/** Extract a plain JS value from a hrana wire cell. */
function fromWireCell(cell: {
  type: string;
  value?: string | number;
}): unknown {
  if (cell.type === "null") return null;
  if (cell.type === "integer") return Number(cell.value);
  return cell.value ?? null;
}

let baseUrl: string | null = null;
let authToken: string | undefined;

/** @returns true if TURSO_DATABASE_URL is set (safe for build phase). */
export function isDbConfigured(): boolean {
  if (baseUrl !== null) return true;
  const raw = process.env.TURSO_DATABASE_URL;
  if (!raw) return false;
  baseUrl = resolveUrl(raw);
  authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return true;
}

/**
 * Execute a single SQL statement against Turso via HTTP.
 * Returns `{ rows, rowsAffected }`. Throws on network or DB errors.
 */
export async function execute(
  sql: string,
  args: unknown[] = [],
): Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }> {
  if (!isDbConfigured() || !baseUrl) {
    throw new Error("Turso DB not configured");
  }

  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toWireArg) } },
        { type: "close" },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);

  const body = await res.json();
  const first = body?.results?.[0];

  if (first?.type === "error") {
    throw new Error(`Turso SQL error: ${first.error?.message ?? "unknown"}`);
  }

  const result = first?.response?.result;
  if (!result) return { rows: [], rowsAffected: 0 };

  const cols: string[] = (result.cols ?? []).map(
    (c: { name: string }) => c.name,
  );

  const rows: Record<string, unknown>[] = (result.rows ?? []).map(
    (row: Array<{ type: string; value?: string | number }>) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) {
        obj[cols[i] as string] = fromWireCell(
          row[i] as { type: string; value?: string | number },
        );
      }
      return obj;
    },
  );

  return { rows, rowsAffected: result.affected_row_count ?? 0 };
}

// ── Schema management ────────────────────────────────────────────

export { SPONSORS_SCHEMA, SPONSORS_INDEXES } from "./sponsors-schema";
import { SPONSORS_SCHEMA, SPONSORS_INDEXES } from "./sponsors-schema";

let schemaInitialized = false;
let schemaPromise: Promise<void> | null = null;

/**
 * Ensure the sponsors table and indexes exist.
 * Call on write paths only (webhook, image-upload, seed script).
 * Read paths skip this — the table already exists after first setup.
 *
 * Uses a shared promise to deduplicate concurrent calls on the same Lambda.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await execute(SPONSORS_SCHEMA);
      for (const idx of SPONSORS_INDEXES) {
        await execute(idx);
      }
      schemaInitialized = true;
    })();
  }
  return schemaPromise;
}
