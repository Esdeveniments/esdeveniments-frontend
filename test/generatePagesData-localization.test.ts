import { describe, it, expect, vi, afterEach } from "vitest";

import { generatePagesData } from "@components/partials/generatePagesData";
import type { GeneratePagesDataProps, PlaceTypeAndLabel } from "types/common";

const baseParams = {
  currentYear: 2025,
  place: "barcelona",
  byDate: "",
  placeTypeLabel: { type: "town", label: "Barcelona" },
} satisfies GeneratePagesDataProps & { placeTypeLabel: PlaceTypeAndLabel };

describe("generatePagesData localization", () => {
  it("does not leak Catalan categoryName into English metaTitle", async () => {
    const result = await generatePagesData({
      ...baseParams,
      category: "literatura",
      categoryName: "Literatura",
      locale: "en",
    });

    expect(result.metaTitle).toContain("Literature");
    expect(result.metaTitle).not.toContain("Literatura");
  });

  describe("byDate meta titles include the covered dates", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("adds the weekend range on a Wednesday", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-04T10:00:00Z"));

      const ca = await generatePagesData({
        ...baseParams,
        byDate: "cap-de-setmana",
        locale: "ca",
      });
      const en = await generatePagesData({
        ...baseParams,
        byDate: "cap-de-setmana",
        locale: "en",
      });

      expect(ca.metaTitle).toContain("(6–8 de novembre)");
      expect(en.metaTitle).toMatch(/\(November 6\s–\s8\)$/);
    });

    it("uses the Madrid day for today, not the UTC day", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      // 23:30 UTC on Oct 31 is already Nov 1 in Madrid.
      vi.setSystemTime(new Date("2026-10-31T23:30:00Z"));

      const result = await generatePagesData({
        ...baseParams,
        place: "",
        byDate: "avui",
        placeTypeLabel: { type: "", label: "Catalunya" },
        locale: "ca",
      });

      expect(result.metaTitle).toContain("(1 de novembre)");
    });
  });
});
