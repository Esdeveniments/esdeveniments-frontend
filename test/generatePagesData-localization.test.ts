import { describe, it, expect } from "vitest";

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
});
