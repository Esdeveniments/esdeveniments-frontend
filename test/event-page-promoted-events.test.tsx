import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { PromotedEventsQuery } from "types/api/promotion";

const fetchPromotedEvents = vi.fn<(query: PromotedEventsQuery) => Promise<EventSummaryResponseDTO[]>>();

vi.mock("@lib/api/promotions", () => ({
  fetchPromotedEvents: (query: PromotedEventsQuery) => fetchPromotedEvents(query),
}));
vi.mock("@utils/i18n-seo", () => ({ getLocaleSafely: async () => "ca" }));
vi.mock("@components/ui/eventsAround/EventsAroundSection", () => ({
  default: ({ events }: { events: EventSummaryResponseDTO[] }) => (
    <ol>{events.map((e) => <li key={e.id}>{e.id}</li>)}</ol>
  ),
}));

import EventPagePromotedEvents from "@components/ui/promotedEvents/EventPagePromotedEvents";
import EventMoreEvents from "app/[locale]/e/[eventId]/components/EventMoreEvents";

const ev = (id: string) => ({ id }) as EventSummaryResponseDTO;
const ids = (row: ReactElement) =>
  (row.props as { events: EventSummaryResponseDTO[] }).events.map((e) => e.id);

async function rows(props: Partial<Parameters<typeof EventMoreEvents>[0]>) {
  const tree = await EventMoreEvents({ relatedEvents: [], sourceEventSlug: "self", ...props });
  const [promoted, related] = (tree.props as { children: ReactElement[] }).children;
  return { promoted: ids(promoted), related: ids(related) };
}

describe("EventMoreEvents", () => {
  beforeEach(() => {
    fetchPromotedEvents.mockReset();
  });

  it("lists the town's promotions first, without the viewed event", async () => {
    fetchPromotedEvents.mockImplementation(async (query) =>
      query.placement === "CITY" ? [ev("town"), ev("self")] : [ev("comarca"), ev("town")],
    );

    const { promoted } = await rows({ eventId: "self", cityId: 1, regionId: 2 });

    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "CITY", cityId: 1 });
    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "REGION", regionId: 2 });
    expect(promoted).toEqual(["town", "comarca"]);
  });

  it("drops promoted events from the related row so none is listed twice", async () => {
    fetchPromotedEvents.mockResolvedValue([ev("paid")]);

    const result = await rows({
      eventId: "self",
      cityId: 1,
      relatedEvents: [ev("paid"), ev("other")],
    });

    expect(result).toEqual({ promoted: ["paid"], related: ["other"] });
  });

  it("skips a placement it has no id for", async () => {
    fetchPromotedEvents.mockResolvedValue([ev("a")]);
    await rows({ regionId: 2 });
    expect(fetchPromotedEvents).toHaveBeenCalledTimes(1);
    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "REGION", regionId: 2 });
  });
});

describe("EventPagePromotedEvents", () => {
  it("renders nothing without promotions", async () => {
    expect(await EventPagePromotedEvents({ events: [] })).toBeNull();
  });

  it("tags clicks and views", async () => {
    const html = renderToStaticMarkup(
      (await EventPagePromotedEvents({ events: [ev("town")], citySlug: "cardedeu" }))!,
    );
    expect(html).toContain("<li>town</li>");
    expect(html).toContain('data-analytics-context="promoted_event_page"');
    expect(html).toContain('data-analytics-place-slug="cardedeu"');
  });
});
