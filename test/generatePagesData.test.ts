import { describe, it, expect } from "vitest";
import { generatePagesData } from "@components/partials/generatePagesData";
import type {
  GeneratePagesDataProps,
  PlaceTypeAndLabel,
} from "types/common";

const baseParams = {
  currentYear: 2024,
  place: "",
  byDate: "",
  placeTypeLabel: { type: "region", label: "Catalunya" },
} satisfies GeneratePagesDataProps & { placeTypeLabel: PlaceTypeAndLabel };

describe("generatePagesData search-aware notFound copy", () => {
  it("appends the search query to the primary notFound sentence", async () => {
    const result = await generatePagesData({
      ...baseParams,
      search: "castellers",
    });

    expect(result.notFoundTitle).toBe(
      `Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment per a la cerca "castellers".`
    );
    expect(result.notFoundDescription).toBe(
      `Mira altres dates o localitats properes a la nostra agenda cultural, on segur que hi trobaràs plans que t’agradaran.`
    );
  });

  it("trims the search and replaces double quotes inside the snippet", async () => {
    const result = await generatePagesData({
      ...baseParams,
      search: '  castellers "nit"  ',
    });

    expect(result.notFoundTitle).toBe(
      `Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment per a la cerca "castellers &#39;nit&#39;".`
    );
    expect(result.notFoundDescription).toBe(
      `Mira altres dates o localitats properes a la nostra agenda cultural, on segur que hi trobaràs plans que t’agradaran.`
    );
  });

  it("keeps the original copy when the search query is blank", async () => {
    const result = await generatePagesData({
      ...baseParams,
      search: "   ",
    });

    expect(result.notFoundTitle).toBe(
      `Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment.`
    );
    expect(result.notFoundDescription).toBe(
      `Mira altres dates o localitats properes a la nostra agenda cultural, on segur que hi trobaràs plans que t’agradaran.`
    );
  });
});
