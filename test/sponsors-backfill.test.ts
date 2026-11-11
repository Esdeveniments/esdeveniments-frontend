import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbSponsorRow } from "types/sponsor";

const execute = vi.fn();
vi.mock("@lib/db/turso", () => ({
  isDbConfigured: () => true,
  execute: (...args: unknown[]) => execute(...args),
}));
vi.mock("@lib/db/turso-schema", () => ({ ensureSchema: async () => {} }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

function row(overrides: Partial<DbSponsorRow>): Partial<DbSponsorRow> {
  return {
    business_name: "Biz",
    image_url: "https://img.example/a.png",
    target_url: "https://example.com",
    places: '["cardedeu"]',
    geo_scope: "town",
    start_date: today,
    end_date: nextMonth,
    status: "active",
    ...overrides,
  };
}

async function loadModule(rows: Partial<DbSponsorRow>[]) {
  vi.resetModules();
  execute.mockReset();
  execute.mockResolvedValue({ rows, rowsAffected: 0 });
  return import("@lib/db/sponsors");
}

describe("backfill sponsors", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("shows a backfill banner where nobody has paid", async () => {
    const { getActiveSponsorForPlace } = await loadModule([
      row({ business_name: "El Temps Avui", kind: "backfill", places: '["cardedeu","maresme"]' }),
    ]);
    const result = await getActiveSponsorForPlace("cardedeu");
    expect(result?.sponsor.businessName).toBe("El Temps Avui");
  });

  it("puts a paid sponsor anywhere in the cascade before a backfill banner", async () => {
    const { getActiveSponsorForPlace } = await loadModule([
      row({ business_name: "El Temps Avui", kind: "backfill", places: '["cardedeu","valles-oriental"]' }),
      row({ business_name: "Paid comarca", kind: "paid", places: '["valles-oriental"]' }),
    ]);
    const result = await getActiveSponsorForPlace("cardedeu", ["valles-oriental"]);
    expect(result).toMatchObject({ sponsor: { businessName: "Paid comarca" }, matchedPlace: "valles-oriental" });
  });

  it("treats rows from before the migration (no kind) as paid", async () => {
    const { getActiveSponsorForPlace, getOccupiedPlaceStatus } = await loadModule([
      row({ business_name: "Old paid", places: '["cardedeu"]' }),
      row({ business_name: "El Temps Avui", kind: "backfill", places: '["cardedeu"]' }),
    ]);
    expect((await getActiveSponsorForPlace("cardedeu"))?.sponsor.businessName).toBe("Old paid");
    expect((await getOccupiedPlaceStatus()).has("cardedeu")).toBe(true);
  });

  it("never marks a place as occupied by a backfill banner", async () => {
    const { getOccupiedPlaceStatus } = await loadModule([
      row({ business_name: "El Temps Avui", kind: "backfill", places: '["cardedeu","maresme"]' }),
      row({ business_name: "Paid", kind: "paid", places: '["barcelona"]' }),
    ]);
    const occupied = await getOccupiedPlaceStatus();
    expect([...occupied.keys()]).toEqual(["barcelona"]);
  });
});
