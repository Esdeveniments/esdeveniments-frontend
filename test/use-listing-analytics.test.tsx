import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useListingAnalytics from "@components/hooks/useListingAnalytics";

vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

describe("useListingAnalytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("observes the cards of the List grid (ul > li), not nested lists", () => {
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

    const container = document.createElement("div");
    container.innerHTML =
      "<ul><li><article><ul><li>tag</li></ul></article></li><li>b</li></ul>";

    renderHook(() => useListingAnalytics(container, 2, {}));

    const cards = [...container.querySelectorAll(":scope > ul > li")];
    expect(observed).toEqual(cards);
  });
});
