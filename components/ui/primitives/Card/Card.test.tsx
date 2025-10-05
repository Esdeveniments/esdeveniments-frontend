import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import { Card } from "./Card";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { NewsSummaryResponseDTO, NewsEventItemDTO } from "types/api/news";

// Mock dependencies
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

vi.mock("@components/ui/primitives", () => ({
  ImageServer: ({ alt, title, ...props }: any) => (
    <img alt={alt} title={title} {...props} />
  ),
  ViewCounter: ({ visits }: any) => <div>ViewCounter {visits}</div>,
  Skeleton: ({ variant }: any) => (
    <div
      data-testid={`skeleton-${variant}`}
      className="animate-fast-pulse rounded-lg bg-darkCorp"
    />
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock("@components/ui/card/AdCardClient", () => ({
  default: () => (
    <div>
      <div>Contingut patrocinat</div>
    </div>
  ),
}));

vi.mock("@utils/helpers", () => ({
  truncateString: (str: string, maxLength: number) => str.slice(0, maxLength),
  getFormattedDate: () => ({
    formattedStart: "2024-01-01",
    formattedEnd: "2024-01-02",
    nameDay: "Monday",
  }),
}));

vi.mock("@heroicons/react/outline", () => ({
  ClockIcon: () => <svg data-testid="clock-icon" />,
  LocationMarkerIcon: () => <svg data-testid="location-icon" />,
  CalendarIcon: () => <svg data-testid="calendar-icon" />,
}));

vi.mock("isomorphic-dompurify", () => ({
  default: {
    sanitize: (str: string) => str,
  },
}));

// Mock data
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

const mockNews: NewsSummaryResponseDTO = {
  id: "1",
  slug: "test-news",
  title: "Test News",
  description: "Test news description",
  imageUrl: "https://example.com/news-image.jpg",
  startDate: "2024-01-01",
  endDate: "2024-01-02",
  readingTime: 5,
  visits: 50,
};

const mockNewsEvent: NewsEventItemDTO = {
  id: "1",
  hash: "hash1",
  slug: "test-news-event",
  title: "Test News Event",
  type: "NEWS",
  url: "https://example.com",
  description: "Test news event description",
  imageUrl: "https://example.com/news-image.jpg",
  startDate: "2024-01-01",
  endDate: "2024-01-02",
  location: "Test Location",
  visits: 50,
  origin: "MANUAL",
  categories: [{ id: 1, name: "Sports", slug: "sports" }],
};

describe("Card", () => {
  describe("basic type", () => {
    it("renders children", () => {
      render(<Card type="basic">Test content</Card>);
      expect(screen.getByText("Test content")).toBeVisible();
    });

    it("applies variant classes", () => {
      const { container } = render(
        <Card type="basic" variant="outlined">
          Test
        </Card>,
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("border-bColor");
    });

    it("applies padding classes", () => {
      const { container } = render(
        <Card type="basic" padding="lg">
          Test
        </Card>,
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("p-component-lg");
    });
  });

  describe("compound components", () => {
    it("renders Header", () => {
      render(
        <Card>
          <Card.Header>Header content</Card.Header>
        </Card>,
      );
      expect(screen.getByText("Header content")).toBeVisible();
    });

    it("renders Body", () => {
      render(
        <Card>
          <Card.Body>Body content</Card.Body>
        </Card>,
      );
      expect(screen.getByText("Body content")).toBeVisible();
    });

    it("renders Footer", () => {
      render(
        <Card>
          <Card.Footer>Footer content</Card.Footer>
        </Card>,
      );
      expect(screen.getByText("Footer content")).toBeVisible();
    });

    it("renders Title", () => {
      render(<Card.Title>Title content</Card.Title>);
      expect(screen.getByText("Title content")).toBeVisible();
    });

    it("renders Description", () => {
      render(<Card.Description>Description content</Card.Description>);
      expect(screen.getByText("Description content")).toBeVisible();
    });

    it("renders Image", () => {
      render(<Card.Image src="test.jpg" alt="Test image" />);
      const img = screen.getByAltText("Test image");
      expect(img).toBeInTheDocument();
    });
  });

  describe("loading type", () => {
    it("renders skeleton", () => {
      render(<Card type="loading" />);
      expect(screen.getByTestId("skeleton-card")).toBeVisible();
    });
  });

  describe("ad type", () => {
    it("renders ad content", () => {
      render(<Card type="ad" />);
      expect(screen.getByText("Contingut patrocinat")).toBeVisible();
    });
  });

  describe("event type", () => {
    describe("vertical variant", () => {
      it("renders event title", () => {
        render(<Card type="event" variant="vertical" event={mockEvent} />);
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      it("renders event location", () => {
        render(<Card type="event" variant="vertical" event={mockEvent} />);
        expect(screen.getByText("Test Location")).toBeInTheDocument();
      });

      it("renders event date", () => {
        render(<Card type="event" variant="vertical" event={mockEvent} />);
        expect(
          screen.getByText("Del 2024-01-01 al 2024-01-02"),
        ).toBeInTheDocument();
      });

      it("renders event time", () => {
        render(<Card type="event" variant="vertical" event={mockEvent} />);
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
        render(
          <Card type="event" variant="vertical" event={eventWithWeather} />,
        );
        expect(screen.getByAltText("Sunny")).toBeInTheDocument();
      });

      it("links to event page", () => {
        render(<Card type="event" variant="vertical" event={mockEvent} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/e/test-event");
      });
    });

    describe("horizontal variant", () => {
      it("renders event title", () => {
        render(<Card type="event" variant="horizontal" event={mockEvent} />);
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      it("renders event location", () => {
        render(<Card type="event" variant="horizontal" event={mockEvent} />);
        expect(screen.getByText("Test Location")).toBeInTheDocument();
      });

      it("renders event date", () => {
        render(<Card type="event" variant="horizontal" event={mockEvent} />);
        expect(
          screen.getByText("Del 2024-01-01 al 2024-01-02"),
        ).toBeInTheDocument();
      });

      it("links to event page", () => {
        render(<Card type="event" variant="horizontal" event={mockEvent} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/e/test-event");
      });

      it("renders view counter", () => {
        render(<Card type="event" variant="horizontal" event={mockEvent} />);
        expect(screen.getByText("ViewCounter 100")).toBeInTheDocument();
      });
    });

    describe("compact variant", () => {
      it("renders event title", () => {
        render(<Card type="event" variant="compact" event={mockEvent} />);
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      it("renders event location", () => {
        render(<Card type="event" variant="compact" event={mockEvent} />);
        expect(screen.getByText("Test Location")).toBeInTheDocument();
      });

      it("renders event date", () => {
        render(<Card type="event" variant="compact" event={mockEvent} />);
        expect(
          screen.getByText("Del 2024-01-01 al 2024-01-02"),
        ).toBeInTheDocument();
      });

      it("links to event page", () => {
        render(<Card type="event" variant="compact" event={mockEvent} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/e/test-event");
      });
    });
  });

  describe("news type", () => {
    describe("default variant", () => {
      it("renders news title", () => {
        render(
          <Card
            type="news"
            variant="default"
            event={mockNews}
            placeSlug="catalunya"
          />,
        );
        expect(screen.getByText("Test News")).toBeInTheDocument();
      });

      it("renders news description", () => {
        render(
          <Card
            type="news"
            variant="default"
            event={mockNews}
            placeSlug="catalunya"
          />,
        );
        expect(screen.getByText("Test news description")).toBeInTheDocument();
      });

      it("links to news page", () => {
        render(
          <Card
            type="news"
            variant="default"
            event={mockNews}
            placeSlug="catalunya"
          />,
        );
        const links = screen.getAllByRole("link");
        expect(links[0]).toHaveAttribute(
          "href",
          "/noticies/catalunya/test-news",
        );
      });
    });

    describe("hero variant", () => {
      it("renders news title", () => {
        render(
          <Card
            type="news"
            variant="hero"
            event={mockNews}
            placeSlug="catalunya"
          />,
        );
        expect(screen.getByText("Test News")).toBeInTheDocument();
      });

      it("links to news page", () => {
        render(
          <Card
            type="news"
            variant="hero"
            event={mockNews}
            placeSlug="catalunya"
          />,
        );
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/noticies/catalunya/test-news");
      });
    });

    describe("rich variant", () => {
      it("renders news title", () => {
        render(<Card type="news" variant="rich" event={mockNewsEvent} />);
        expect(screen.getByText("Test News Event")).toBeInTheDocument();
      });

      it("renders news description", () => {
        render(<Card type="news" variant="rich" event={mockNewsEvent} />);
        expect(
          screen.getByText("Test news event description"),
        ).toBeInTheDocument();
      });

      it("renders category", () => {
        render(<Card type="news" variant="rich" event={mockNewsEvent} />);
        expect(screen.getByText("Sports")).toBeInTheDocument();
      });

      it("renders location", () => {
        render(<Card type="news" variant="rich" event={mockNewsEvent} />);
        expect(screen.getByText("📍 Test Location")).toBeInTheDocument();
      });

      it("links to news page", () => {
        render(<Card type="news" variant="rich" event={mockNewsEvent} />);
        const links = screen.getAllByRole("link");
        const eventLink = links.find(
          (link) => link.getAttribute("href") === "/e/test-news-event",
        );
        expect(eventLink).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("passes axe-core checks for basic card", async () => {
      const { container } = render(<Card type="basic">Test</Card>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core checks for compound components", async () => {
      const { container } = render(
        <Card>
          <Card.Header>Header</Card.Header>
          <Card.Body>Body</Card.Body>
          <Card.Footer>Footer</Card.Footer>
        </Card>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
