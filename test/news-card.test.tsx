import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NewsCard from "@components/ui/newsCard";
import type { NewsSummaryResponseDTO } from "types/api/news";

// PressableAnchor is an async server component; a plain <a> keeps the props it gets.
vi.mock("@components/ui/common/cardContent/CardLink", () => ({
  default: ({ children, variant, ...props }: Record<string, unknown> & { children: React.ReactNode }) => (
    <a data-variant={String(variant)} {...props}>
      {children}
    </a>
  ),
}));

// Shape of a production /api/news item (2026-11-07).
const news: NewsSummaryResponseDTO = {
  id: "9e72ae9d-edf7-4047-a4db-b27e3ed1e64b",
  title: "Què fer el cap de setmana del 7 al 8 de novembre del 2026 a Tarragona",
  startDate: "2026-11-07",
  endDate: "2026-11-08",
  description: "<p>Troba plans de cap de setmana per a qui vulgui gaudir de Tarragona.</p>",
  imageUrl: "https://www.tarragona.cat/agenda/foto.jpg",
  readingTime: 12,
  visits: 52,
  slug: "que-fer-el-cap-de-setmana-a-tarragona",
};

const render = async (props: Partial<Parameters<typeof NewsCard>[0]> = {}) =>
  renderToStaticMarkup(
    await NewsCard({ event: news, placeSlug: "tarragona", placeLabel: "Tarragona", ...props }),
  );

describe("NewsCard on the shared card layout", () => {
  it("is one title link to the article, with news analytics", async () => {
    const html = await render();
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(
      /<h3 class="order-2[^"]*"><a data-variant="plain" href="\/noticies\/tarragona\/que-fer-el-cap-de-setmana-a-tarragona"[^>]*>Què fer el cap de setmana/,
    );
    expect(html).toContain('data-analytics-event-name="select_news"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("<button");
    expect(html).toContain('alt=""');
  });

  it("featured list card: h2 under the page h1, side by side, with its summary", async () => {
    const html = await render({ variant: "featured", priority: true, headingLevel: "h2" });
    expect(html).toMatch(/<h2 class="order-2[^"]*"><a /);
    expect(html).toContain("card-event-split");
    expect(html).toContain("Troba plans de cap de setmana");
    expect(html).not.toContain("<p>Troba");
  });
});
