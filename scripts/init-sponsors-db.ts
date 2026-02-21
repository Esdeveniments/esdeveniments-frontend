#!/usr/bin/env tsx
/**
 * Database initialization and seed script for the sponsors table.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://your-db.turso.io TURSO_AUTH_TOKEN=your-token npx tsx scripts/init-sponsors-db.ts
 *
 * Options:
 *   --seed    Seed with example data (use for initial migration from static config)
 *   --reset   Drop and recreate the table (DESTRUCTIVE)
 *
 * @see lib/db/turso.ts for schema definition
 */

import { SPONSORS_SCHEMA, SPONSORS_INDEXES } from "../lib/db/sponsors-schema";

const rawUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!rawUrl) {
  console.error("❌ TURSO_DATABASE_URL is required");
  process.exit(1);
}

const baseUrl = rawUrl.replace(/^libsql:\/\//, "https://");

/** Minimal Turso HTTP execute — same protocol as lib/db/turso.ts */
async function dbExecute(
  sql: string,
  args: unknown[] = [],
): Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }> {
  function toArg(v: unknown) {
    if (v === null || v === undefined) return { type: "null" };
    if (typeof v === "number")
      return Number.isInteger(v)
        ? { type: "integer", value: String(v) }
        : { type: "float", value: v };
    return { type: "text", value: String(v) };
  }

  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toArg) } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);

  const body = await res.json();
  const first = body?.results?.[0];
  if (first?.type === "error")
    throw new Error(`SQL error: ${first.error?.message}`);

  const result = first?.response?.result;
  if (!result) return { rows: [], rowsAffected: 0 };

  const cols: string[] = (result.cols ?? []).map(
    (c: { name: string }) => c.name,
  );
  const rows = (result.rows ?? []).map(
    (row: Array<{ type: string; value?: string | number }>) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) {
        const cell = row[i] as { type: string; value?: string | number };
        obj[cols[i] as string] =
          cell.type === "null"
            ? null
            : cell.type === "integer"
              ? Number(cell.value)
              : cell.value ?? null;
      }
      return obj;
    },
  );

  return { rows, rowsAffected: result.affected_row_count ?? 0 };
}

const args = process.argv.slice(2);
const shouldSeed = args.includes("--seed");
const shouldReset = args.includes("--reset");

async function initSchema() {
  console.log("📦 Initializing sponsors table...");

  if (shouldReset) {
    console.log("⚠️  Dropping existing table...");
    await dbExecute("DROP TABLE IF EXISTS sponsors");
  }

  await dbExecute(SPONSORS_SCHEMA);

  for (const idx of SPONSORS_INDEXES) {
    await dbExecute(idx);
  }

  console.log("✅ Schema initialized");
}

async function seedData() {
  console.log("🌱 Seeding example sponsor data...");

  // Example: Tastautors sponsor (previously in static config)
  // Uses dynamic dates so seed always produces visible banners
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const sponsors = [
    {
      id: crypto.randomUUID(),
      businessName: "Tastautors",
      imageUrl:
        "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
      targetUrl: "https://www.tastautors.cat/",
      places: JSON.stringify(["catalunya"]),
      geoScope: "country",
      startDate,
      endDate,
    },
    {
      id: crypto.randomUUID(),
      businessName: "Tastautors",
      imageUrl:
        "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
      targetUrl: "https://www.tastautors.cat/",
      places: JSON.stringify(["valles-oriental"]),
      geoScope: "region",
      startDate,
      endDate,
    },
    {
      id: crypto.randomUUID(),
      businessName: "Tastautors",
      imageUrl:
        "https://i.ibb.co/DfXFVNXr/Cartell-Tastautors-5-scaled-1-1.webp",
      targetUrl: "https://www.tastautors.cat/",
      places: JSON.stringify(["cardedeu"]),
      geoScope: "town",
      startDate,
      endDate,
    },
  ];

  for (const s of sponsors) {
    await dbExecute(
      `INSERT OR IGNORE INTO sponsors (id, business_name, image_url, target_url, places, geo_scope, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        s.id,
        s.businessName,
        s.imageUrl,
        s.targetUrl,
        s.places,
        s.geoScope,
        s.startDate,
        s.endDate,
      ],
    );
    console.log(`  ✅ ${s.businessName} (${s.geoScope}: ${s.places})`);
  }

  console.log("✅ Seed data inserted");
}

async function showStatus() {
  const result = await dbExecute(
    "SELECT COUNT(*) as count FROM sponsors",
  );
  const count = result.rows[0]?.count ?? 0;
  console.log(`\n📊 Total sponsors in database: ${String(count)}`);

  const active = await dbExecute(
    "SELECT business_name, geo_scope, places, start_date, end_date, status FROM sponsors ORDER BY created_at DESC LIMIT 10",
  );
  if (active.rows.length > 0) {
    console.log("\nRecent sponsors:");
    for (const row of active.rows) {
      console.log(
        `  ${String(row.status).padEnd(14)} | ${String(row.business_name).padEnd(20)} | ${String(row.geo_scope).padEnd(7)} | ${String(row.places)} | ${String(row.start_date)} → ${String(row.end_date)}`,
      );
    }
  }
}

async function main() {
  try {
    await initSchema();
    if (shouldSeed) {
      await seedData();
    }
    await showStatus();
    console.log("\n🎉 Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
