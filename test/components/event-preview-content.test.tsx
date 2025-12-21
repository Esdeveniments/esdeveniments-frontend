import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewContent from "@components/ui/EventForm/preview/PreviewContent";
import type { EventDetailResponseDTO } from "types/api/event";

const previewEvent: EventDetailResponseDTO = {
  id: "preview",
  hash: "preview",
  slug: "sample-event",
  title: "Sample Event",
  type: "FREE",
  url: "",
  description: "",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2025-05-01",
  startTime: "10:00",
  endDate: "2025-05-01",
  endTime: "12:00",
  location: "Plaça Major",
  visits: 0,
  origin: "MANUAL",
  city: {
    id: 2,
    name: "Barcelona",
    slug: "barcelona",
    latitude: 41.38,
    longitude: 2.17,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  },
  region: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
  },
  province: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
  },
  categories: [
    {
      id: 1,
      name: "Música",
      slug: "musica",
    },
  ],
};

describe("PreviewContent", () => {
  it("renders core event fields", () => {
    render(<PreviewContent event={previewEvent} />);

    expect(screen.getByText("Sample Event")).toBeInTheDocument();
    expect(screen.getByText("Plaça Major")).toBeInTheDocument();
    expect(screen.getByText("Música")).toBeInTheDocument();
  });

  it("shows inline warning when URL is missing", () => {
    render(<PreviewContent event={previewEvent} />);

    const warnings = screen.getAllByText(
      /Afegeix un enllaç perquè la gent pugui veure'n més detalls./i
    );

    expect(warnings.length).toBeGreaterThan(0);
  });
});



