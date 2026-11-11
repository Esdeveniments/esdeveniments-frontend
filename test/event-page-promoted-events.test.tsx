import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { PromotedEventsQuery } from "types/api/promotion";

const fetchPromotedEvents = vi.fn<(query: PromotedEventsQuery) => Promise<EventSummaryResponseDTO[]>>();

vi.mock("@lib/api/promotions", () => ({
  fetchPromotedEvents: (query: PromotedEventsQuery) => fetchPromotedEvents(query),
}));
vi.mock("@utils/i18n-seo", () => ({ getLocaleSafely: async () => "ca" }));
vi.mock("@components/ui/eventsAround/EventsAroundServer", () => ({
  default: ({ events }: { events: EventSummaryResponseDTO[] }) => (
    <ol>{events.map((e) => <li key={e.id}>{e.id}</li>)}</ol>
  ),
}));

import EventPagePromotedEvents from "@components/ui/promotedEvents/EventPagePromotedEvents";

const ev = (id: string) => ({ id }) as EventSummaryResponseDTO;

describe("EventPagePromotedEvents", () => {
  beforeEach(() => {
    fetchPromotedEvents.mockReset();
  });

  it("renders nothing when the town and comarca have no promotions", async () => {
    fetchPromotedEvents.mockResolvedValue([]);
    expect(await EventPagePromotedEvents({ eventId: "self", cityId: 1, regionId: 2 })).toBeNull();
  });

  it("lists the town's promotions first, without the viewed event, and tags clicks and views", async () => {
    fetchPromotedEvents.mockImplementation(async (query) =>
      query.placement === "CITY" ? [ev("town"), ev("self")] : [ev("comarca"), ev("town")],
    );

    const html = renderToStaticMarkup(
      await EventPagePromotedEvents({ eventId: "self", cityId: 1, citySlug: "cardedeu", regionId: 2 }),
    );

    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "CITY", cityId: 1 });
    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "REGION", regionId: 2 });
    expect(html).toContain("<li>town</li><li>comarca</li>");
    expect(html).not.toContain("<li>self</li>");
    expect(html).toContain('data-analytics-context="promoted_event_page"');
    expect(html).toContain('data-analytics-place-slug="cardedeu"');
  });

  it("skips a placement it has no id for", async () => {
    fetchPromotedEvents.mockResolvedValue([ev("a")]);
    await EventPagePromotedEvents({ regionId: 2 });
    expect(fetchPromotedEvents).toHaveBeenCalledTimes(1);
    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "REGION", regionId: 2 });
  });
});
