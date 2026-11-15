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

    renderHook(() => useListingAnalytics(container, 2, {}));

    const cards = [...container.querySelectorAll(":scope > ul > li")];
    expect(cards).toHaveLength(2);
    expect(observed).toEqual(cards);
  });

  it("reports which events were seen, with their slot, and skips ad slots", () => {
    vi.useFakeTimers();
    let onIntersect: (entries: { isIntersecting: boolean; target: Element }[]) => void = () => {};
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
      <List events={[{ id: "e1" }, { id: "ad" }, { id: "e2" }]}>
        {(event) =>
          event.id === "ad" ? (
            <div>ad</div>
          ) : (
            <a
              href="#"
              data-analytics-event-id={event.id}
              data-analytics-event-category-slug={event.id === "e1" ? "concerts" : ""}
              data-analytics-event-place-slug="cardedeu"
            >
              {event.id}
            </a>
          )
        }
      </List>,
    );
    renderHook(() => useListingAnalytics(container, 3, { place: "cardedeu" }));

    const cards = [...container.querySelectorAll(":scope > ul > li")];
    onIntersect(cards.map((target) => ({ isIntersecting: true, target })));
    vi.advanceTimersByTime(2000);

    expect(sendGoogleEvent).toHaveBeenCalledWith("view_item_list", {
      item_list_name: "listing",
      place: "cardedeu",
      items: [
        { item_id: "e1", item_category: "concerts", item_category2: "cardedeu", index: 1 },
        { item_id: "e2", item_category: undefined, item_category2: "cardedeu", index: 3 },
      ],
    });
    expect(sendGoogleEvent).toHaveBeenCalledWith(
      "card_impression_batch",
      expect.objectContaining({ visible_cards: 3 }),
    );
  });
});
