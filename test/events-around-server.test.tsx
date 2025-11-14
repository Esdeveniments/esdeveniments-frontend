import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventsAroundServer from "../components/ui/eventsAround/EventsAroundServer";
import type { EventSummaryResponseDTO } from "../types/api/event";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@components/ui/common/image/ImageServer", () => ({
  default: ({ alt }: { alt?: string }) => (
    <span role="img" aria-label={alt || "event"} data-testid="image-server" />
  ),
}));

vi.mock("@components/ui/cardHorizontal/CardHorizontalServer", () => ({
  default: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

vi.mock("@components/ui/common/HorizontalScroll", () => ({
  default: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="horizontal-scroll">{children}</div>,
}));

vi.mock("@components/partials/JsonLdServer", () => ({
  default: () => null,
}));

vi.mock("@utils/helpers", async () => {
  const actual = await vi.importActual<typeof import("@utils/helpers")>(
    "@utils/helpers"
  );
  return {
    ...actual,
    truncateString: (value: string) => value,
    getFormattedDate: () => ({
      formattedStart: "1 gener",
      formattedEnd: "",
      nameDay: "Dilluns",
    }),
  };
});

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash-1",
  slug: "event-one",
  title: "Event One",
  type: "FREE",
  url: "https://example.com/event-one",
  description: "Description",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2099-01-01",
  startTime: "10:00",
  endDate: "2099-01-01",
  endTime: "12:00",
  location: "Barcelona",
  visits: 0,
  origin: "SCRAPE",
  categories: [],
};

describe("EventsAroundServer", () => {
  it("deduplicates events with identical ids before rendering", () => {
    const events = [
      baseEvent,
      { ...baseEvent, title: "Duplicate Event" },
      { ...baseEvent, id: "event-2", slug: "event-two", title: "Event Two" },
    ];

    render(
      <EventsAroundServer events={events} layout="horizontal" showJsonLd={false} />
    );

    const cards = screen.getAllByTestId("event-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Event One");
    expect(cards[1]).toHaveTextContent("Event Two");
  });

  it("uses the slug as fallback when ids are missing", () => {
    const events = [
      { ...baseEvent, id: undefined as unknown as string, slug: "shared-slug" },
      {
        ...baseEvent,
        id: undefined as unknown as string,
        slug: "shared-slug",
        title: "Duplicate slug",
      },
      {
        ...baseEvent,
        id: undefined as unknown as string,
        slug: "unique-slug",
        title: "Unique slug",
      },
    ];

    render(
      <EventsAroundServer events={events} layout="horizontal" showJsonLd={false} />
    );

    const cards = screen.getAllByTestId("event-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Event One");
    expect(cards[1]).toHaveTextContent("Unique slug");
  });
});

