import { describe, it, expect, vi } from "vitest";
import { getExpiredFestaActTown } from "@lib/api/events-proxy";

const { fetchEventBySlug } = vi.hoisted(() => ({ fetchEventBySlug: vi.fn() }));
vi.mock("@lib/api/events-external", () => ({ fetchEventBySlug }));
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  isApiUrlConfigured: () => true,
}));

const lastWeek = new Date(Date.now() - 7 * 86_400_000)
  .toISOString()
  .slice(0, 10);

describe("getExpiredFestaActTown", () => {
  it.each([
    ["an old act with no end date", { title: "Festa Major Cardedeu 2025", startDate: "2025-08-13" }, "cardedeu"],
    ["an act that ended last week", { title: "Festa major: correfoc", startDate: "2025-08-13", endDate: lastWeek }, null],
    ["an old event that isn't festa major", { title: "Concert", startDate: "2025-08-13" }, null],
    ["a deleted event", null, null],
  ])("%s", async (name, event, town) => {
    fetchEventBySlug.mockResolvedValue(
      event && { ...event, city: { slug: "cardedeu" } },
    );
    // One slug per case: results are cached by slug.
    expect(await getExpiredFestaActTown(name)).toBe(town);
  });

  it("serves the event page as before when the backend fails", async () => {
    fetchEventBySlug.mockRejectedValue(
      Object.assign(new Error("timed out"), { status: 504 }),
    );
    expect(await getExpiredFestaActTown("backend-down")).toBeNull();
  });
});
