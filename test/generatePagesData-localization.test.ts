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

  describe("listing meta descriptions stay within 120-156 chars and date-consistent", () => {
    const categories = [
      "literatura",
      "fires-i-mercats",
      "festes-populars",
      "tallers-i-formacio",
      "dansa",
      "salut-i-benestar",
      "esport",
      "patrimoni-cultural",
      "serveis-municipals",
      "gent-gran",
      "familia-i-infants",
      "exposicions",
      "cinema",
      "musica",
      "teatre",
      "altres",
    ] as const;

    const places = [
      { place: "bot", placeTypeLabel: { type: "town", label: "Bot" } },
      { place: "barcelona", placeTypeLabel: { type: "town", label: "Barcelona" } },
      {
        place: "el-pont-de-vilomara-i-rocafort",
        placeTypeLabel: { type: "town", label: "El Pont de Vilomara i Rocafort" },
      },
    ] as const;

    const dates = ["", "avui", "dema", "setmana", "cap-de-setmana"] as const;
    const locales = ["ca", "es", "en"] as const;

    it("keeps all category, date, and place combinations between 120 and 156 chars without today-leakage", async () => {
      for (const locale of locales) {
        for (const { place, placeTypeLabel } of places) {
          for (const byDate of dates) {
            const plain = await generatePagesData({
              currentYear: 2026,
              place,
              byDate,
              placeTypeLabel,
              locale,
            });
            expect(
              plain.metaDescription.length,
              `${locale}/${place}/${byDate}: "${plain.metaDescription}"`,
            ).toBeGreaterThanOrEqual(120);
            expect(
              plain.metaDescription.length,
              `${locale}/${place}/${byDate}: "${plain.metaDescription}"`,
            ).toBeLessThanOrEqual(156);
            if (byDate !== "avui") {
              expect(
                plain.metaDescription.toLowerCase(),
                `${locale}/${place}/${byDate}`,
              ).not.toMatch(/\b(avui|hoy|today)\b/);
            }

            for (const category of categories) {
              const res = await generatePagesData({
                currentYear: 2026,
                place,
                byDate,
                placeTypeLabel,
                category,
                locale,
              });
              expect(
                res.metaDescription.length,
                `${locale}/${place}/${byDate}/${category}: "${res.metaDescription}"`,
              ).toBeGreaterThanOrEqual(120);
              expect(
                res.metaDescription.length,
                `${locale}/${place}/${byDate}/${category}: "${res.metaDescription}"`,
              ).toBeLessThanOrEqual(156);
              if (byDate !== "avui") {
                expect(
                  res.metaDescription.toLowerCase(),
                  `${locale}/${place}/${byDate}/${category}`,
                ).not.toMatch(/\b(avui|hoy|today)\b/);
              }
            }
          }
        }
      }
    });
  });
});
