import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { NewsSummaryResponseDTO } from "types/api/news";

const fetchNews = vi.fn();

vi.mock("@lib/api/news", () => ({ fetchNews: (...args: unknown[]) => fetchNews(...args) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@utils/i18n-seo", () => ({ getLocaleSafely: async () => "ca" }));
vi.mock("@components/noticies/NewsCardGrid", () => ({
  default: ({ items }: { items: unknown[] }) => <div data-testid="grid">{items.length}</div>,
}));
vi.mock("@components/ui/primitives/PressableAnchor", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import LatestNewsSection from "../app/[locale]/e/[eventId]/components/LatestNewsSection";

const news: NewsSummaryResponseDTO = {
  id: "n1",
  title: "News",
  startDate: "2099-01-01",
  endDate: "2099-01-02",
  description: "",
  imageUrl: "",
  readingTime: 3,
  visits: 0,
  slug: "news-one",
};

const props = {
  placeSlug: "sitges",
  placeLabel: "Sitges",
  placeType: "town" as const,
  newsHref: "/noticies/sitges",
};

describe("LatestNewsSection", () => {
  beforeEach(() => fetchNews.mockReset());

  it("renders nothing when the place has no news", async () => {
    fetchNews.mockResolvedValue({ content: [] });
    expect(await LatestNewsSection(props)).toBeNull();
  });

  it("tags the block as event_news with the source event", async () => {
    fetchNews.mockResolvedValue({ content: [news] });
    const html = renderToStaticMarkup(
      await LatestNewsSection({ ...props, sourceEventId: "42", sourceEventSlug: "concert" }),
    );
    expect(html).toContain('data-analytics-container="true"');
    expect(html).toContain('data-analytics-context="event_news"');
    expect(html).toContain('data-analytics-source-event-id="42"');
    expect(html).toContain('data-analytics-source-event-slug="concert"');
  });

  it("omits the source attributes when the event is unknown", async () => {
    fetchNews.mockResolvedValue({ content: [news] });
    const html = renderToStaticMarkup(await LatestNewsSection(props));
    expect(html).not.toContain("data-analytics-source-event");
  });
});
