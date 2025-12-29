import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ServerEventsCategorizedContent } from "../components/ui/serverEventsCategorized";
import type { CategorySummaryResponseDTO } from "../types/api/category";
import type {
  EventSummaryResponseDTO,
  ListEvent,
} from "../types/api/event";

// Mock modules that aren't relevant for these tests
vi.mock("@components/ui/locationDiscoveryWidget", () => ({
  default: () => <div data-testid="location-discovery-widget" />,
}));

vi.mock("@components/ui/search", () => ({
  default: () => <div data-testid="search-component" />,
}));

vi.mock("@components/ui/eventsAround/EventsAroundServer", () => ({
  default: ({ events }: { events: ListEvent[] }) => (
    <div data-testid="events-around" data-count={events.length}>
      {events.length} events
    </div>
  ),
}));

vi.mock("@components/ui/common/badge", () => ({
  default: ({
    href,
    children,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    "aria-label"?: string;
  }) => (
    <a href={href} aria-label={ariaLabel} data-testid="badge-link">
      {children}
    </a>
  ),
}));

vi.mock("@components/ui/adArticle", () => ({
  default: () => <div data-testid="ad-slot" />,
}));

vi.mock("@components/ui/primitives/PressableAnchor", () => ({
  default: ({
    href,
    children,
    prefetch, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@heroicons/react/24/solid", () => ({
  ChevronRightIcon: () => <svg data-testid="chevron-icon" />,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  MegaphoneIcon: () => <svg data-testid="speakerphone-icon" />,
  SparklesIcon: () => <svg data-testid="sparkles-icon" />,
  ShoppingBagIcon: () => <svg data-testid="shoppingbag-icon" />,
  FaceSmileIcon: () => <svg data-testid="emojihappy-icon" />,
  MusicalNoteIcon: () => <svg data-testid="musicnote-icon" />,
  TicketIcon: () => <svg data-testid="ticket-icon" />,
  PhotoIcon: () => <svg data-testid="photograph-icon" />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@utils/event-status", () => ({
  computeTemporalStatus: () => ({ state: "upcoming" }),
}));

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash-1",
  slug: "event-slug",
  title: "Sample Event",
  type: "FREE",
  url: "https://example.com/event",
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

describe("ServerEventsCategorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = async (
    categorizedEvents: Record<string, ListEvent[]>,
    categories?: CategorySummaryResponseDTO[]
  ) => {
    const jsx = await ServerEventsCategorizedContent({
      categorizedEventsPromise: Promise.resolve(categorizedEvents),
      categoriesPromise: Promise.resolve(categories ?? []),
    });
    render(jsx);
  };

  it("uses the matching event category slug when the category key differs from the first event category", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      "Patrimoni Cultural": [
        {
          ...baseEvent,
          categories: [
            {
              id: 4,
              slug: "tallers-i-formacio",
              name: "Tallers i Formació",
            },
            {
              id: 8,
              slug: "patrimoni-cultural",
              name: "Patrimoni Cultural",
            },
          ],
        },
      ],
    };

    await renderComponent(categorizedEvents);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/patrimoni-cultural");

    const avuiLink = await screen.findByRole("link", { name: "Avui" });
    expect(avuiLink).toHaveAttribute(
      "href",
      "/catalunya/avui/patrimoni-cultural"
    );
  });

  it("falls back to dynamic categories when event has no categories", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      Literatura: [
        {
          ...baseEvent,
          id: "event-2",
          slug: "literatura-event",
          categories: [],
        },
      ],
    };

    const categories: CategorySummaryResponseDTO[] = [
      { id: 1, name: "Literatura", slug: "literatura" },
    ];

    await renderComponent(categorizedEvents, categories);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/literatura");
  });

  it("matches category by name (case-insensitive) when slug doesn't match", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      "CONCERTS": [
        {
          ...baseEvent,
          categories: [
            {
              id: 1,
              slug: "concerts",
              name: "Concerts",
            },
          ],
        },
      ],
    };

    await renderComponent(categorizedEvents);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/concerts");
  });

  it("matches category by slug (case-insensitive) when name doesn't match", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      "festivals": [
        {
          ...baseEvent,
          categories: [
            {
              id: 2,
              slug: "festivals",
              name: "Festivals i Música",
            },
          ],
        },
      ],
    };

    await renderComponent(categorizedEvents);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/festivals");
  });

  it("falls back to first valid category when no match is found", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      "Unknown Category": [
        {
          ...baseEvent,
          categories: [
            {
              id: 1,
              slug: "concerts",
              name: "Concerts",
            },
          ],
        },
      ],
    };

    await renderComponent(categorizedEvents);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/concerts");
  });

  it("falls back to categoryKey when no categories are available", async () => {
    const categorizedEvents: Record<string, ListEvent[]> = {
      "custom-category": [
        {
          ...baseEvent,
          categories: [],
        },
      ],
    };

    await renderComponent(categorizedEvents);

    const seeMoreLink = await screen.findByRole("link", { name: /Veure més/i });
    expect(seeMoreLink).toHaveAttribute("href", "/catalunya/custom-category");
  });
});
