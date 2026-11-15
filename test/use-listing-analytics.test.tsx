import { render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    renderHook(() => useListingAnalytics(root, { place: "cardedeu" }));

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
      items: [
        { item_id: "s1", item_category: "concerts", item_category2: "cardedeu", index: 1 },
        { item_id: "m1", item_category: undefined, item_category2: "cardedeu", index: 3 },
      ],
    });
    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "card_impression_batch",
      expect.objectContaining({ visible_cards: 3, total_cards: 3 }),
    );
  });
});
