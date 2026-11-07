import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CompactCard from "@components/ui/common/cardContent/CompactCard";
import type { EventSummaryResponseDTO } from "types/api/event";

// PressableAnchor is an async server component; a plain <a> keeps the props it gets.
vi.mock("@components/ui/common/cardContent/CardLink", () => ({
  default: ({ children, variant, ...props }: Record<string, unknown> & { children: React.ReactNode }) => (
    <a data-variant={String(variant)} {...props}>
      {children}
    </a>
  ),
}));

const event = {
  id: "e1",
  hash: "h",
  slug: "concert-de-nadal",
  title: "Concert de Nadal",
  imageUrl: "https://example.com/c.jpg",
  startDate: "2026-12-20",
  endDate: "2026-12-20",
  startTime: "18:00",
  endTime: null,
  location: "Plaça Major",
  city: { id: 1, name: "Cardedeu", slug: "cardedeu" },
  categories: [],
} as unknown as EventSummaryResponseDTO;

const render = () =>
  renderToStaticMarkup(
    <CompactCard event={event} locale="ca" tCard={(key) => key} index={2} />,
  );

describe("CompactCard (related events)", () => {
  it("is one title link inside the h3, stretched over the card", () => {
    const html = render();
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(
      /<h3 class="order-2[^"]*"><a data-variant="plain" href="\/e\/concert-de-nadal" class="card-event-link"[^>]*>Concert de Nadal<\/a><\/h3>/,
    );
    expect(html).toContain('<article class="card-event relative');
  });

  it("keeps the related-event analytics on the link", () => {
    const html = render();
    expect(html).toContain('data-analytics-event-name="related_event_click"');
    expect(html).toContain('data-analytics-position="3"');
  });

  it("has a decorative image and a <time> for the single-day date", () => {
    const html = render();
    expect(html).toContain('alt=""');
    expect(html).not.toContain('alt="Concert de Nadal"');
    expect(html).toMatch(/<time dateTime="2026-12-20T18:00">[^<]+<\/time>/);
  });
});
