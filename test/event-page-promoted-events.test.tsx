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
  default: ({
    events,
    analyticsEventName,
    analyticsListName,
  }: {
    events: EventSummaryResponseDTO[];
    analyticsEventName?: string;
    analyticsListName?: string;
  }) => (
    <ol
      data-event-name={analyticsEventName}
      data-list-name={analyticsListName}
    >
      {events.map((e) => (
        <li key={e.id}>{e.id}</li>
      ))}
    </ol>
  ),
}));

import EventPagePromotedEvents from "@components/ui/promotedEvents/EventPagePromotedEvents";
import EventMoreEvents from "app/[locale]/e/[eventId]/components/EventMoreEvents";
import EventRelatedEvents from "app/[locale]/e/[eventId]/components/EventRelatedEvents";

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

  it("reuses the fallback row only when no related event is promoted", async () => {
    const relatedRow = <EventRelatedEvents events={[ev("paid"), ev("other")]} sourceEventSlug="self" />;
    const second = async () => {
      const tree = await EventMoreEvents({
        relatedEvents: [ev("paid"), ev("other")],
        sourceEventSlug: "self",
        cityId: 1,
        relatedRow,
      });
      return (tree.props as { children: ReactElement[] }).children[1];
    };

    fetchPromotedEvents.mockResolvedValue([ev("elsewhere")]);
    expect(await second()).toBe(relatedRow);

    fetchPromotedEvents.mockResolvedValue([ev("paid")]);
    const filtered = await second();
    expect(filtered).not.toBe(relatedRow);
    expect(ids(filtered)).toEqual(["other"]);
  });

  it("skips a placement it has no id for", async () => {
    fetchPromotedEvents.mockResolvedValue([ev("a")]);
    await rows({ regionId: 2 });
    expect(fetchPromotedEvents).toHaveBeenCalledTimes(1);
    expect(fetchPromotedEvents).toHaveBeenCalledWith({ placement: "REGION", regionId: 2 });
  });
});

describe("EventRelatedEvents", () => {
  it("sends related_event_click, list impressions, and the viewed event's category and place", () => {
    const html = renderToStaticMarkup(
      <EventRelatedEvents
        events={[ev("a")]}
        sourceEventSlug="self"
        sourceSlugs={{ categorySlug: "concerts", placeSlug: "cardedeu" }}
      />,
    );
    expect(html).toContain('data-analytics-category-slug="concerts"');
    expect(html).toContain('data-analytics-place-slug="cardedeu"');
    expect(html).toContain('data-event-name="related_event_click"');
    expect(html).toContain('data-list-name="related_events"');
  });
});

describe("EventPagePromotedEvents", () => {
  it("renders nothing without promotions", async () => {
    expect(await EventPagePromotedEvents({ events: [] })).toBeNull();
  });

  it("tags clicks and views, falling back to the event's region slug when citySlug is absent", async () => {
    const html = renderToStaticMarkup(
      (await EventPagePromotedEvents({
        events: [ev("comarca")],
        fallbackPlaceSlug: "valles-oriental",
      }))!,
    );
    expect(html).toContain("<li>comarca</li>");
    expect(html).toContain('data-analytics-context="promoted_event_page"');
    expect(html).toContain('data-analytics-place-slug="valles-oriental"');
    expect(html).toContain('data-list-name="promoted_event_page"');
  });
});
