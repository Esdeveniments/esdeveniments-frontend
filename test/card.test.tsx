import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../components/ui/primitives/Card/Card";
import type { EventSummaryResponseDTO } from "types/api/event";

// Mock Next.js components
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock internal components
vi.mock("@components/ui/common/image/ImageServer", () => ({
  default: ({ alt, title }: any) => <img alt={alt} title={title} />,
}));

vi.mock("@components/ui/viewCounter", () => ({
  default: ({ visits }: any) => <span>{visits} visits</span>,
}));

vi.mock("@components/ui/primitives", () => ({
  Skeleton: ({ variant }: any) => (
    <div
      data-testid={`skeleton-${variant}`}
      className="animate-fast-pulse rounded-lg bg-darkCorp"
    />
  ),
  ImageServer: ({ alt, title }: any) => <img alt={alt} title={title} />,
  Text: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>
      {children}
    </span>
  ),
}));

// Mock Heroicons
vi.mock("@heroicons/react/outline", () => ({
  ClockIcon: () => <svg data-testid="clock-icon" />,
  LocationMarkerIcon: () => <svg data-testid="location-icon" />,
  CalendarIcon: () => <svg data-testid="calendar-icon" />,
}));

// Mock utils
vi.mock("@utils/helpers", () => ({
  truncateString: (str: string, maxLength: number) => str.slice(0, maxLength),
  getFormattedDate: () => ({
    formattedStart: "2024-01-01",
    formattedEnd: "2024-01-02",
    nameDay: "Monday",
  }),
  env: "test",
}));

const mockEvent: EventSummaryResponseDTO = {
  id: "1",
  hash: "hash1",
  slug: "test-event",
  title: "Test Event",
  type: "FREE",
  url: "https://example.com",
  description: "Test description",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2024-01-01",
  startTime: "10:00",
  endDate: "2024-01-02",
  endTime: "12:00",
  location: "Test Location",
  visits: 100,
  origin: "MANUAL",
  city: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
    latitude: 41.3851,
    longitude: 2.1734,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  },
  region: { id: 1, name: "Catalonia", slug: "catalonia" },
  province: { id: 1, name: "Barcelona", slug: "barcelona" },
  categories: [],
};

describe("Card", () => {
  describe("basic type", () => {
    it("renders children content", () => {
      render(
        <Card type="basic">
          <div>Test content</div>
        </Card>,
      );
      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("applies variant classes", () => {
      const { container } = render(
        <Card type="basic" variant="elevated">
          <div>Content</div>
        </Card>,
      );
      expect(container.firstChild).toHaveClass("shadow-md");
    });

    it("applies padding classes", () => {
      const { container } = render(
        <Card type="basic" padding="lg">
          <div>Content</div>
        </Card>,
      );
      expect(container.firstChild).toHaveClass("p-component-lg");
    });

    it("renders with custom className", () => {
      const { container } = render(
        <Card type="basic" className="custom-class">
          <div>Content</div>
        </Card>,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("event-vertical type", () => {
    it("renders event title", () => {
      render(<Card type="event-vertical" event={mockEvent} />);
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    it("renders event location", () => {
      render(<Card type="event-vertical" event={mockEvent} />);
      expect(screen.getByText("Test Location")).toBeInTheDocument();
    });

    it("renders event date", () => {
      render(<Card type="event-vertical" event={mockEvent} />);
      expect(
        screen.getByText("Del 2024-01-01 al 2024-01-02"),
      ).toBeInTheDocument();
    });

    it("renders event time", () => {
      render(<Card type="event-vertical" event={mockEvent} />);
      expect(screen.getByText("10:00 - 12:00")).toBeInTheDocument();
    });

    it("renders weather icon when available", () => {
      const eventWithWeather = {
        ...mockEvent,
        weather: {
          temperature: "20°C",
          description: "Sunny",
          icon: "sunny.png",
        },
      };
      render(<Card type="event-vertical" event={eventWithWeather} />);
      expect(screen.getByAltText("Sunny")).toBeInTheDocument();
    });

    it("links to event page", () => {
      render(<Card type="event-vertical" event={mockEvent} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/e/test-event");
    });
  });

  describe("loading type", () => {
    it("renders skeleton", () => {
      render(<Card type="loading" />);
      const skeleton = document.querySelector(".animate-fast-pulse");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("bg-darkCorp", "rounded-lg");
    });
  });
});
