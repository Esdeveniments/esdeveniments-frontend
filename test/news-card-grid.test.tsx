import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NewsCardGrid from "@components/noticies/NewsCardGrid";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { NewsCardProps } from "types/props";

// NewsCard is an async server component; stub it to expose the place it gets.
vi.mock("@components/ui/newsCard", () => ({
  default: ({ event, placeSlug, placeLabel, headingLevel }: NewsCardProps) => (
    <a href={`/noticies/${placeSlug}/${event.slug}`} data-heading={headingLevel ?? "default"}>
      {placeLabel}
    </a>
  ),
}));

const baseNews: NewsSummaryResponseDTO = {
  id: "n1",
  title: "News",
  startDate: "2026-11-01",
  endDate: "2026-11-02",
  description: "",
  imageUrl: "",
  readingTime: 3,
  visits: 0,
  slug: "news-one",
};

describe("NewsCardGrid", () => {
  it("links each card to the article's own city, not the page's place", () => {
    const html = renderToStaticMarkup(
      <NewsCardGrid
        place="barcelones"
        placeLabel="Barcelonès"
        items={[
          {
            ...baseNews,
            city: { id: 1, name: "Sitges", slug: "sitges" } as NewsSummaryResponseDTO["city"],
          },
        ]}
      />,
    );
    expect(html).toContain('href="/noticies/sitges/news-one"');
    expect(html).toContain(">Sitges<");
  });

  it("uses the region when there is no city, and the city over the region", () => {
    const html = renderToStaticMarkup(
      <NewsCardGrid
        place="catalunya"
        placeLabel="Catalunya"
        items={[
          {
            ...baseNews,
            id: "n3",
            slug: "region-only",
            region: { id: 2, name: "Garraf", slug: "garraf" } as NewsSummaryResponseDTO["region"],
          },
          {
            ...baseNews,
            id: "n4",
            slug: "both",
            city: { id: 1, name: "Sitges", slug: "sitges" } as NewsSummaryResponseDTO["city"],
            region: { id: 2, name: "Garraf", slug: "garraf" } as NewsSummaryResponseDTO["region"],
          },
        ]}
      />,
    );
    expect(html).toContain('href="/noticies/garraf/region-only"');
    expect(html).toContain('href="/noticies/sitges/both"');
  });

  it("falls back to the page's place when the article has no city or region", () => {
    const html = renderToStaticMarkup(
      <NewsCardGrid
        place="barcelones"
        placeLabel="Barcelonès"
        items={[{ ...baseNews, id: "n2", slug: "news-two" }]}
      />,
    );
    expect(html).toContain('href="/noticies/barcelones/news-two"');
    expect(html).toContain(">Barcelonès<");
  });

  it("passes the heading level to every card (h2 only under the page h1)", () => {
    const items = [{ ...baseNews, id: "n5", slug: "news-five" }];
    const listHtml = renderToStaticMarkup(
      <NewsCardGrid place="barcelones" placeLabel="Barcelonès" items={items} headingLevel="h2" />,
    );
    expect(listHtml).toContain('data-heading="h2"');
    const sectionHtml = renderToStaticMarkup(
      <NewsCardGrid place="barcelones" placeLabel="Barcelonès" items={items} />,
    );
    expect(sectionHtml).toContain('data-heading="default"');
  });
});
