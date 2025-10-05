import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { NewsSummaryResponseDTO, NewsEventItemDTO } from "types/api/news";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

// Mock data
const mockEvent: EventSummaryResponseDTO = {
  id: "1",
  hash: "hash1",
  slug: "test-event",
  title: "Sample Event Title",
  type: "FREE",
  url: "https://example.com",
  description: "This is a sample event description for testing purposes.",
  imageUrl: "https://picsum.photos/400/300",
  startDate: "2024-12-25",
  startTime: "10:00",
  endDate: "2024-12-25",
  endTime: "12:00",
  location: "Sample Location, Barcelona",
  visits: 150,
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
  slug: "sample-news",
  title: "Sample News Title",
  description:
    "This is a sample news description for testing purposes. It contains information about local events and activities.",
  imageUrl: "https://picsum.photos/800/450",
  startDate: "2024-12-20",
  endDate: "2024-12-22",
  readingTime: 3,
  visits: 75,
};

const mockNewsEvent: NewsEventItemDTO = {
  id: "1",
  hash: "hash1",
  slug: "sample-news-event",
  title: "Sample News Event Title",
  type: "NEWS",
  url: "https://example.com",
  description:
    "This is a sample news event description for testing purposes. It contains information about local events and activities.",
  imageUrl: "https://picsum.photos/800/450",
  startDate: "2024-12-20",
  endDate: "2024-12-22",
  location: "Sample Location, Barcelona",
  visits: 75,
  origin: "MANUAL",
  categories: [
    { id: 1, name: "Culture", slug: "culture" },
    { id: 2, name: "Events", slug: "events" },
  ],
};

// Basic Card Stories
export const BasicElevated: Story = {
  args: {
    type: "basic",
    variant: "elevated",
    children: "This is a basic elevated card with some content.",
  },
};

export const BasicOutlined: Story = {
  args: {
    type: "basic",
    variant: "outlined",
    children: "This is a basic outlined card with some content.",
  },
};

export const BasicFilled: Story = {
  args: {
    type: "basic",
    variant: "filled",
    children: "This is a basic filled card with some content.",
  },
};

export const BasicSmallPadding: Story = {
  args: {
    type: "basic",
    variant: "elevated",
    padding: "sm",
    children: "This is a basic card with small padding.",
  },
};

export const BasicLargePadding: Story = {
  args: {
    type: "basic",
    variant: "elevated",
    padding: "lg",
    children: "This is a basic card with large padding.",
  },
};

// Event Card Stories
export const EventVertical: Story = {
  args: {
    type: "event",
    variant: "vertical",
    event: mockEvent,
  },
};

export const EventHorizontal: Story = {
  args: {
    type: "event",
    variant: "horizontal",
    event: mockEvent,
  },
};

export const EventCompact: Story = {
  args: {
    type: "event",
    variant: "compact",
    event: mockEvent,
  },
};

export const EventVerticalWithWeather: Story = {
  args: {
    type: "event",
    variant: "vertical",
    event: {
      ...mockEvent,
      weather: {
        temperature: "22°C",
        description: "Sunny",
        icon: "https://openweathermap.org/img/wn/01d@2x.png",
      },
    },
  },
};

export const EventVerticalPriority: Story = {
  args: {
    type: "event",
    variant: "vertical",
    event: mockEvent,
    isPriority: true,
  },
};

// News Card Stories
export const NewsDefault: Story = {
  args: {
    type: "news",
    variant: "default",
    event: mockNews,
    placeSlug: "catalunya",
    placeLabel: "Catalunya",
  },
};

export const NewsHero: Story = {
  args: {
    type: "news",
    variant: "hero",
    event: mockNews,
    placeSlug: "catalunya",
    placeLabel: "Catalunya",
  },
};

export const NewsRich: Story = {
  args: {
    type: "news",
    variant: "rich",
    event: mockNewsEvent,
  },
};

export const NewsRichHorizontal: Story = {
  args: {
    type: "news",
    variant: "horizontal",
    event: mockNewsEvent,
  },
};

export const NewsRichNumbered: Story = {
  args: {
    type: "news",
    variant: "horizontal",
    event: mockNewsEvent,
    numbered: 1,
  },
};

// Other Card Types
export const AdCard: Story = {
  args: {
    type: "ad",
  },
};

export const LoadingCard: Story = {
  args: {
    type: "loading",
  },
};

// Compound Components
export const WithHeaderBodyFooter: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title>Card Title</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          This is the main content of the card. It can contain any React
          elements.
        </Card.Description>
      </Card.Body>
      <Card.Footer>
        <Card.Description>Footer content goes here.</Card.Description>
      </Card.Footer>
    </Card>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Card>
      <Card.Image src="https://picsum.photos/400/200" alt="Sample image" />
      <Card.Body>
        <Card.Title>Card with Image</Card.Title>
        <Card.Description>
          This card demonstrates the Image compound component.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};
