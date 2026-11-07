import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: async () => "ca",
}));

vi.mock("@components/ui/common/badge", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const regions: RegionsGroupedByCitiesResponseDTO[] = [
  {
    id: 1,
    name: "Maresme",
    slug: "maresme",
    cities: [
      { id: 10, value: "arenys-de-munt", label: "Arenys de Munt", latitude: 0, longitude: 0 },
      { id: 11, value: "mataro", label: "Mataró", latitude: 0, longitude: 0 },
    ],
  },
];

vi.mock("@lib/api/regions", () => ({
  fetchRegionsWithCities: async () => regions,
}));

import ExploreNearby from "@components/ui/exploreNearby/ExploreNearby";

describe("ExploreNearby", () => {
  it("links a town to its region's weekend page", async () => {
    render(await ExploreNearby({ place: "arenys-de-munt", placeType: "town" }));

    const link = screen.getByText(/^Aquest cap de setmana/);
    expect(link).toHaveAttribute("href", "/maresme/cap-de-setmana");
    expect(link).toHaveTextContent("Maresme");
  });

  it("does not add a weekend link on region pages", async () => {
    render(await ExploreNearby({ place: "maresme", placeType: "region" }));

    expect(screen.queryByText(/^Aquest cap de setmana/)).not.toBeInTheDocument();
  });
});
