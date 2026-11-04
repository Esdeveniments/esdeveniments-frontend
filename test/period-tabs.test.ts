import { describe, it, expect } from "vitest";
import { buildPeriodTabItems } from "@components/partials/period-tabs";

describe("buildPeriodTabItems", () => {
  it("builds upcoming and past tabs with the given hrefs and labels", () => {
    const items = buildPeriodTabItems({
      activeHref: "/preferits",
      pastHref: "/preferits/passats",
      activeLabel: "Propers",
      pastLabel: "Passats",
    });

    expect(items).toEqual([
      { id: "upcoming", href: "/preferits", label: "Propers", count: undefined },
      { id: "past", href: "/preferits/passats", label: "Passats", count: undefined },
    ]);
  });

  it("passes through counts when present", () => {
    const items = buildPeriodTabItems({
      activeHref: "/preferits",
      pastHref: "/preferits/passats",
      activeLabel: "Propers",
      pastLabel: "Passats",
      activeCount: 5,
      pastCount: 12,
    });

    expect(items[0].count).toBe(5);
    expect(items[1].count).toBe(12);
  });
});
