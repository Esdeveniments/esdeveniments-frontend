import type { APIRequestContext } from "@playwright/test";

/**
 * One SQL statement against the test Turso database, for payment specs that
 * check or clean up what the app wrote. `lib/db/turso.ts` is `server-only`,
 * so Playwright can't import it; this uses the same HTTP pipeline API.
 */
export async function tursoExecute(
  request: APIRequestContext,
  sql: string,
  args: string[] = [],
): Promise<Record<string, unknown>[]> {
  const url = process.env.TURSO_DATABASE_URL!.replace(/^libsql:\/\//, "https://");
  const response = await request.post(`${url}/v2/pipeline`, {
    headers: { Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN}` },
    data: {
      requests: [
        { type: "execute", stmt: { sql, args: args.map((value) => ({ type: "text", value })) } },
        { type: "close" },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Turso HTTP ${response.status()}`);
  const first = (await response.json()).results?.[0];
  if (first?.type === "error") throw new Error(`Turso: ${first.error?.message}`);
  const result = first?.response?.result ?? { cols: [], rows: [] };
  const cols: string[] = result.cols.map((c: { name: string }) => c.name);
  return result.rows.map((row: { value?: unknown }[]) =>
    Object.fromEntries(cols.map((name, i) => [name, row[i]?.value ?? null])),
  );
}
