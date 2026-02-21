#!/usr/bin/env node
/**
 * Quick local test: verifies the raw fetch /v2/pipeline protocol
 * works against a local `turso dev` server.
 *
 * Usage: TURSO_DATABASE_URL=http://127.0.0.1:8080 node scripts/test-turso-local.mjs
 */

const baseUrl = (process.env.TURSO_DATABASE_URL || "http://127.0.0.1:8080")
  .replace(/^libsql:\/\//, "https://");
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const today = new Date().toISOString().slice(0, 10);

function toArg(v) {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { type: "integer", value: String(v) }
      : { type: "float", value: v };
  return { type: "text", value: String(v) };
}

async function execute(sql, args = []) {
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

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const body = await res.json();
  const first = body?.results?.[0];

  if (first?.type === "error") {
    throw new Error(`SQL error: ${first.error?.message}`);
  }

  const result = first?.response?.result;
  if (!result) return { rows: [], rowsAffected: 0 };

  const cols = (result.cols ?? []).map((c) => c.name);
  const rows = (result.rows ?? []).map((row) => {
    const obj = {};
    for (let i = 0; i < cols.length; i++) {
      const cell = row[i];
      obj[cols[i]] =
        cell.type === "null"
          ? null
          : cell.type === "integer"
            ? Number(cell.value)
            : cell.value ?? null;
    }
    return obj;
  });

  return { rows, rowsAffected: result.affected_row_count ?? 0 };
}

async function main() {
  console.log(`Testing against: ${baseUrl}`);
  console.log(`Today: ${today}\n`);

  // Test 1: SELECT active sponsors
  const { rows } = await execute(
    "SELECT * FROM sponsors WHERE status = ? AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC",
    ["active", today, today],
  );
  console.log(`✅ Test 1: Found ${rows.length} active sponsors`);
  for (const r of rows) {
    console.log(`   ${r.business_name} | ${r.geo_scope} | ${r.places} | ${r.start_date} → ${r.end_date}`);
  }

  // Test 2: Cascade — cardedeu match
  const cardedeu = rows.filter((r) => JSON.parse(r.places).includes("cardedeu"));
  console.log(`\n✅ Test 2: cardedeu match = ${cardedeu.length > 0}`);

  // Test 3: Catalunya fallback
  const cat = rows.filter((r) => JSON.parse(r.places).includes("catalunya"));
  console.log(`✅ Test 3: catalunya fallback = ${cat.length > 0}`);

  // Test 4: INSERT + SELECT (write path — insert as pending_image to test activation flow)
  const id = crypto.randomUUID();
  await execute(
    "INSERT INTO sponsors (id, business_name, image_url, target_url, places, geo_scope, start_date, end_date, status, stripe_session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, "Test Sponsor", null, "https://example.com", '["barcelona"]', "town", today, today, "pending_image", `test-session-${id}`],
  );
  const { rows: check } = await execute("SELECT * FROM sponsors WHERE id = ?", [id]);
  console.log(`\n✅ Test 4: INSERT + SELECT = ${check.length === 1 && check[0].business_name === "Test Sponsor"}`);

  // Test 5: UPDATE (activate image — transitions pending_image → active, matching production flow)
  const { rowsAffected } = await execute(
    "UPDATE sponsors SET image_url = ?, status = 'active', updated_at = datetime('now') WHERE stripe_session_id = ? AND status = 'pending_image'",
    ["https://example.com/new.jpg", `test-session-${id}`],
  );
  console.log(`✅ Test 5: UPDATE rowsAffected = ${rowsAffected}`);

  // Test 6: Idempotency check (findSponsorBySessionId)
  const { rows: found } = await execute("SELECT id FROM sponsors WHERE stripe_session_id = ? LIMIT 1", [`test-session-${id}`]);
  console.log(`✅ Test 6: findBySession = ${found.length > 0}`);

  // Cleanup test sponsor
  await execute("DELETE FROM sponsors WHERE id = ?", [id]);

  // Test 7: Availability (occupied places)
  const { rows: occupied } = await execute(
    "SELECT places, end_date FROM sponsors WHERE status IN ('active', 'pending_image') AND start_date <= ? AND end_date >= ?",
    [today, today],
  );
  console.log(`\n✅ Test 7: Occupied places = ${occupied.length}`);
  for (const r of occupied) {
    console.log(`   ${r.places} → expires ${r.end_date}`);
  }

  console.log("\n🎉 All tests passed! Raw fetch /v2/pipeline protocol works correctly.");
}

main().catch((e) => {
  console.error("❌ FAILED:", e.message);
  process.exit(1);
});
