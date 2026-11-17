import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardCarouselAnalytics, {
  resetCarouselImpressionCache,
} from "@components/analytics/CardCarouselAnalytics";
import ListingAnalyticsTracker from "@components/analytics/ListingAnalyticsTracker";
import useListingAnalytics from "@components/hooks/useListingAnalytics";
import List from "@components/ui/list";
import { sendGoogleEvent } from "@utils/analytics";

vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

describe("useListingAnalytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.mocked(sendGoogleEvent).mockClear();
  });

  it("observes the cards of the List grid, not lists nested in a card", () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe(el: Element) {
          observed.push(el);
        }
        unobserve() {}
        disconnect() {}
      },
    );

    const { container } = render(
      <List events={[{ id: "a" }, { id: "b" }]}>
        {(event) => (
          <article>
            <ul>
              <li>{event.id} tag</li>
            </ul>
          </article>
        )}
      </List>,
    );

    renderHook(() => useListingAnalytics(container, {}));

    const cards = [...container.querySelectorAll(":scope > ul > li")];
    expect(cards).toHaveLength(2);
    expect(observed).toEqual(cards);
  });

  it("reports seen events with slots counted across the server and load-more grids", () => {
    vi.useFakeTimers();
    let onIntersect: (
      entries: { isIntersecting: boolean; intersectionRatio: number; target: Element }[],
    ) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof onIntersect) {
          onIntersect = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const card = (id: string, category = "") => (
      <a
        href="#"
        data-analytics-event-id={id}
        data-analytics-event-category-slug={category}
        data-analytics-event-place-slug="cardedeu"
      >
        {id}
      </a>
    );
    const { container } = render(
      <div data-analytics-container="true">
        {/* Server grid with an ad slot, then the load-more grid. */}
        <List events={[{ id: "s1" }, { id: "ad" }]}>
          {(event) => (event.id === "ad" ? <div>ad</div> : card(event.id, "concerts"))}
        </List>
        <div hidden>
          <List events={[{ id: "hidden" }]}>{(event) => card(event.id)}</List>
        </div>
        <List events={[{ id: "m1" }]}>{(event) => card(event.id)}</List>
      </div>,
    );
    const root = container.firstElementChild as HTMLElement;
    renderHook(() =>
      useListingAnalytics(root, { place: "cardedeu", category: "concerts" }),
    );

    const visible = [...root.querySelectorAll("[data-listing-grid] > *")].filter(
      (el) => !el.closest("[hidden]"),
    );
    // A card barely on screen doesn't count yet.
    onIntersect([{ isIntersecting: true, intersectionRatio: 0.1, target: visible[0] }]);
    vi.advanceTimersByTime(2000);
    expect(sendGoogleEvent).not.toHaveBeenCalled();

    onIntersect(visible.map((target) => ({ isIntersecting: true, intersectionRatio: 0.6, target })));
    vi.advanceTimersByTime(2000);

    expect(sendGoogleEvent).toHaveBeenCalledWith("view_item_list", {
      item_list_name: "listing",
      place: "cardedeu",
      place_slug: "cardedeu",
      category: "concerts",
      category_slug: "concerts",
      items: [
        { item_id: "s1", item_category: "concerts", item_category2: "cardedeu", index: 1 },
        { item_id: "m1", item_category: undefined, item_category2: "cardedeu", index: 3 },
      ],
    });
    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "card_impression_batch",
      expect.objectContaining({
        visible_cards: 3,
        total_cards: 3,
        place_slug: "cardedeu",
        category_slug: "concerts",
      }),
    );
  });

  it("batches scroll stops above the visitor median and ignores idle equal viewports", () => {
    vi.useFakeTimers();
    let nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);

    let onIntersect: (
      entries: { isIntersecting: boolean; intersectionRatio: number; target: Element }[],
    ) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof onIntersect) {
          onIntersect = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const ids = ["c1", "c2", "c3", "c4"];
    const { container } = render(
      <div data-analytics-container="true">
        <List events={ids.map((id) => ({ id }))}>
          {(event) => (
            <a
              href="#"
              data-analytics-event-id={event.id}
              data-analytics-event-category-slug="musica"
              data-analytics-event-place-slug="girona"
            >
              {event.id}
            </a>
          )}
        </List>
      </div>,
    );
    const root = container.firstElementChild as HTMLElement;
    const { unmount } = renderHook(() =>
      useListingAnalytics(root, { place: "girona" }),
    );
    const cards = [...root.querySelectorAll("[data-listing-grid] > *")];

    // Idle equal viewport: all 4 cards visible for 10s -> median is 10s, so 0 stops.
    onIntersect(cards.map((target) => ({ isIntersecting: true, intersectionRatio: 0.7, target })));
    nowMs += 10_000;
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(sendGoogleEvent).not.toHaveBeenCalledWith("card_stop_batch", expect.anything());

    // Tab hidden for 30s -> must NOT add dwell.
    nowMs += 30_000;
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Scroll away from c1..c3 immediately, pause 12s more on c4 (total 22s vs median ~10s).
    onIntersect(
      cards.slice(0, 3).map((target) => ({ isIntersecting: false, intersectionRatio: 0, target })),
    );
    nowMs += 12_000;
    unmount();

    expect(sendGoogleEvent).toHaveBeenCalledWith("card_stop_batch", {
      item_list_name: "listing",
      visible_cards: 1,
      total_cards: 4,
      place: "girona",
      place_slug: "girona",
      items: [
        {
          item_id: "c4",
          item_category: "musica",
          item_category2: "girona",
          index: 4,
          dwell_ms: 22_000,
        },
      ],
    });
  });
});

describe("CardCarouselAnalytics", () => {
  beforeEach(() => {
    resetCarouselImpressionCache();
  });

  afterEach(() => {
    resetCarouselImpressionCache();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.mocked(sendGoogleEvent).mockClear();
  });

  it("reports seen carousel cards under their list name and deduplicates across Suspense swaps", () => {
    vi.useFakeTimers();
    let onIntersect: (
      entries: { isIntersecting: boolean; intersectionRatio: number; target: Element }[],
    ) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof onIntersect) {
          onIntersect = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const row = (ids: string[]) => (
      <CardCarouselAnalytics
        listName="related_events"
        placeSlug="mataro"
        categorySlug="teatre"
      >
        <ul data-card-carousel>
          {ids.map((id) => (
            <li key={id}>
              <a
                href="#"
                data-analytics-event-id={id}
                data-analytics-event-category-slug="musica"
                data-analytics-event-place-slug="argentona"
              >
                {id}
              </a>
            </li>
          ))}
        </ul>
      </CardCarouselAnalytics>
    );

    const first = render(row(["rel-1", "rel-2"]));
    const firstItems = [...first.container.querySelectorAll("[data-card-carousel] > *")];
    act(() => {
      onIntersect([{ isIntersecting: true, intersectionRatio: 0.8, target: firstItems[1] }]);
    });
    // Fallback unmounts as streamed EventMoreEvents mounts on the same URL.
    first.unmount();

    expect(sendGoogleEvent).toHaveBeenCalledTimes(1);
    expect(sendGoogleEvent).toHaveBeenCalledWith("view_item_list", {
      item_list_name: "related_events",
      place_slug: "mataro",
      category_slug: "teatre",
      items: [
        {
          item_id: "rel-2",
          item_category: "musica",
          item_category2: "argentona",
          index: 2,
        },
      ],
    });

    vi.mocked(sendGoogleEvent).mockClear();
    const second = render(row(["rel-1", "rel-2"]));
    const secondItems = [...second.container.querySelectorAll("[data-card-carousel] > *")];
    act(() => {
      onIntersect(
        secondItems.map((target) => ({ isIntersecting: true, intersectionRatio: 0.8, target })),
      );
      vi.advanceTimersByTime(2000);
    });

    // Only rel-1 is reported; rel-2 was already reported in the fallback.
    expect(sendGoogleEvent).toHaveBeenCalledTimes(1);
    expect(sendGoogleEvent).toHaveBeenCalledWith("view_item_list", {
      item_list_name: "related_events",
      place_slug: "mataro",
      category_slug: "teatre",
      items: [
        {
          item_id: "rel-1",
          item_category: "musica",
          item_category2: "argentona",
          index: 1,
        },
      ],
    });
  });

  it("pools dwell across categorized home carousels and emits card_stop_batch for the paused category row", () => {
    let nowMs = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
    const callbacks: Array<
      (entries: { isIntersecting: boolean; intersectionRatio: number; target: Element }[]) => void
    > = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        cb: (typeof callbacks)[number];
        constructor(cb: (typeof callbacks)[number]) {
          this.cb = cb;
          callbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const catRow = (cat: string, ids: string[]) => (
      <CardCarouselAnalytics
        key={cat}
        listName="home_category"
        placeSlug="catalunya"
        categorySlug={cat}
      >
        <ul data-card-carousel>
          {ids.map((id) => (
            <li key={id}>
              <a
                href="#"
                data-analytics-event-id={id}
                data-analytics-event-category-slug={cat}
                data-analytics-event-place-slug="barcelona"
              >
                {id}
              </a>
            </li>
          ))}
        </ul>
      </CardCarouselAnalytics>
    );

    const { container, unmount } = render(
      <div>
        {catRow("fires-i-mercats", ["shared-1", "f2"])}
        {catRow("exposicions", ["e1"])}
        {catRow("musica", ["shared-1"])}
      </div>,
    );
    const lists = [...container.querySelectorAll("[data-card-carousel]")];
    const [f1, f2] = [...lists[0].children];
    const [e1] = [...lists[1].children];
    const [m1] = [...lists[2].children];

    // Quick 400ms scroll past fires-i-mercats and exposicions, then 4s stop on musica.
    // Note: "shared-1" appears in two distinct category rows and must emit
    // `view_item_list` in BOTH rows (CodeRabbit Round 1).
    callbacks[0]([
      { isIntersecting: true, intersectionRatio: 0.8, target: f1 },
      { isIntersecting: true, intersectionRatio: 0.8, target: f2 },
    ]);
    nowMs += 400;
    callbacks[0]([
      { isIntersecting: false, intersectionRatio: 0, target: f1 },
      { isIntersecting: false, intersectionRatio: 0, target: f2 },
    ]);

    callbacks[1]([{ isIntersecting: true, intersectionRatio: 0.8, target: e1 }]);
    nowMs += 400;
    callbacks[1]([{ isIntersecting: false, intersectionRatio: 0, target: e1 }]);

    callbacks[2]([{ isIntersecting: true, intersectionRatio: 0.8, target: m1 }]);
    nowMs += 4000;
    // Simulate Next App Router calling history.pushState in useInsertionEffect
    // BEFORE unmounting the departing page's carousels (Pullfrog Round 1).
    window.history.pushState({}, "", "/e/clicked-concert");
    unmount();

    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "view_item_list",
      expect.objectContaining({
        item_list_name: "home_category",
        category_slug: "fires-i-mercats",
      }),
    );
    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "view_item_list",
      expect.objectContaining({
        item_list_name: "home_category",
        category_slug: "musica",
      }),
    );
    expect(sendGoogleEvent).toHaveBeenCalledWith("card_stop_batch", {
      item_list_name: "home_category",
      visible_cards: 1,
      total_cards: 4,
      place_slug: "catalunya",
      category_slug: "musica",
      items: [
        {
          item_id: "shared-1",
          item_category: "musica",
          item_category2: "barcelona",
          index: 1,
          dwell_ms: 4000,
        },
      ],
    });

    // Next page starts with an empty pool and fresh seen set.
    vi.mocked(sendGoogleEvent).mockClear();
    const next = render(catRow("musica", ["m1"]));
    const [nextCard] = [...next.container.querySelector("[data-card-carousel]")!.children];
    callbacks[3]([{ isIntersecting: true, intersectionRatio: 0.8, target: nextCard }]);
    nowMs += 3000;
    next.unmount();
    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "view_item_list",
      expect.objectContaining({ item_list_name: "home_category" }),
    );
    expect(sendGoogleEvent).not.toHaveBeenCalledWith("card_stop_batch", expect.anything());
    window.history.pushState({}, "", "/");
  });
});

describe("ListingAnalyticsTracker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.mocked(sendGoogleEvent).mockClear();
  });

  it("tracks fallback listing grids when HybridEventsListClient does not mount", () => {
    vi.useFakeTimers();
    let onIntersect: (
      entries: { isIntersecting: boolean; intersectionRatio: number; target: Element }[],
    ) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof onIntersect) {
          onIntersect = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    const { container } = render(
      <div data-analytics-container="true">
        <List events={[{ id: "fb-1" }]}>
          {(event) => (
            <a
              href="#"
              data-analytics-event-id={event.id}
              data-analytics-event-category-slug="musica"
              data-analytics-event-place-slug="girona"
            >
              {event.id}
            </a>
          )}
        </List>
        <ListingAnalyticsTracker place="sabadell" />
      </div>,
    );

    const card = container.querySelector("[data-listing-grid] > *")!;
    act(() => {
      onIntersect([{ isIntersecting: true, intersectionRatio: 0.7, target: card }]);
      vi.advanceTimersByTime(2000);
    });

    expect(sendGoogleEvent).toHaveBeenCalledWith("view_item_list", {
      item_list_name: "listing",
      place: "sabadell",
      place_slug: "sabadell",
      items: [
        {
          item_id: "fb-1",
          item_category: "musica",
          item_category2: "girona",
          index: 1,
        },
      ],
    });
  });
});
