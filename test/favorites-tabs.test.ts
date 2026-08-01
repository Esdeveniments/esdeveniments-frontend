import { describe, it, expect } from "vitest";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import type { ProfileTranslator } from "types/props";

const stubTranslator = ((key: string) =>
  key === "tabUpcoming" ? "Propers" : "Passats") as ProfileTranslator;

describe("buildFavoritesTabItems", () => {
  it("builds tabs pointing at /preferits and /preferits/passats", () => {
    const items = buildFavoritesTabItems({}, stubTranslator);

    expect(items).toEqual([
      { id: "upcoming", href: "/preferits", label: "Propers", count: undefined },
      { id: "past", href: "/preferits/passats", label: "Passats", count: undefined },
    ]);
  });

  it("passes through counts when present", () => {
    const items = buildFavoritesTabItems(
      { activeCount: 5, pastCount: 12 },
      stubTranslator,
    );

    expect(items[0].count).toBe(5);
    expect(items[1].count).toBe(12);
  });
});
