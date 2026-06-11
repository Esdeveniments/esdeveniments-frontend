import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import WhereToEatSection from "../components/ui/restaurantPromotion/WhereToEatSection";
import type { GooglePlace } from "../types/api/restaurant";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt} data-testid="mock-image" />
  ),
}));

// Mock place formatting utilities
vi.mock("../utils/place-format", () => ({
  formatPriceLevelGeneric: vi.fn((price) => (price ? "€€" : null)),
  getOpenLineInfo: vi.fn(() => ({
    hoursText: "9:00 - 22:00",
    openLabel: "Obert",
    toneClass: "text-green-600",
  })),
  formatAddressLines: vi.fn((lines) => lines?.[0] || null),
}));

// Mock SectionHeading
vi.mock("../components/ui/common/SectionHeading", () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

describe("WhereToEatSection", () => {
  const mockPlace: GooglePlace = {
    place_id: "ChIJydShoA-0pBIR2PTUlFO2APY",
    name: "Test Restaurant",
    vicinity: "123 Test Street, Barcelona",
    rating: 4.5,
    price_level: 2,
    types: ["restaurant", "food"],
    geometry: {
      location: {
        lat: 41.3851,
        lng: 2.1734,
      },
    },
    address_lines: ["123 Test Street"],
  };

  it("renders Google Maps links with correct cross-platform URL format", () => {
    render(
      <WhereToEatSection
        places={[mockPlace]}
        attribution="Powered by Google"
      />
    );

    const link = screen.getByLabelText(
      /Obrir Test Restaurant a Google Maps/i
    ) as HTMLAnchorElement;

    expect(link).toBeInTheDocument();
    expect(link.href).toBe(
      "https://www.google.com/maps/search/?api=1&query=Test%20Restaurant&query_place_id=ChIJydShoA-0pBIR2PTUlFO2APY"
    );
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });

  it("correctly interpolates place_id in Google Maps URL", () => {
    const placeWithDifferentId: GooglePlace = {
      ...mockPlace,
      place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      name: "Another Restaurant",
    };

    render(
      <WhereToEatSection
        places={[placeWithDifferentId]}
        attribution="Powered by Google"
      />
    );

    const link = screen.getByLabelText(
      /Obrir Another Restaurant a Google Maps/i
    ) as HTMLAnchorElement;

    expect(link.href).toBe(
      "https://www.google.com/maps/search/?api=1&query=Another%20Restaurant&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
    );
  });

  it("renders multiple places with correct URLs", () => {
    const places: GooglePlace[] = [
      { ...mockPlace, place_id: "PLACE_1", name: "Restaurant 1" },
      { ...mockPlace, place_id: "PLACE_2", name: "Restaurant 2" },
      { ...mockPlace, place_id: "PLACE_3", name: "Restaurant 3" },
    ];

    render(
      <WhereToEatSection places={places} attribution="Powered by Google" />
    );

    const links = screen.getAllByLabelText(/Obrir .* a Google Maps/i);
    expect(links).toHaveLength(3);

    links.forEach((link, index) => {
      const anchor = link as HTMLAnchorElement;
      const encodedName = encodeURIComponent(`Restaurant ${index + 1}`);
      expect(anchor.href).toBe(
        `https://www.google.com/maps/search/?api=1&query=${encodedName}&query_place_id=PLACE_${index + 1}`
      );
    });
  });

  it("returns null when places array is empty", () => {
    const { container } = render(
      <WhereToEatSection places={[]} attribution="Powered by Google" />
    );
    expect(container.firstChild).toBeNull();
  });
});

