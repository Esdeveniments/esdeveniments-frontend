import { render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useListingAnalytics from "@components/hooks/useListingAnalytics";
import List from "@components/ui/list";

vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

describe("useListingAnalytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
