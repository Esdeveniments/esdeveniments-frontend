import { describe, it, expect, vi } from "vitest";

vi.mock("@utils/i18n-seo", async () => {
  const actual =
    await vi.importActual<typeof import("@utils/i18n-seo")>("@utils/i18n-seo");

  return {
    ...actual,
    getLocaleSafely: async () => "en",
  };
});

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
    });

    expect(result.metaTitle).toContain("Literature");
    expect(result.metaTitle).not.toContain("Literatura");
  });
});
