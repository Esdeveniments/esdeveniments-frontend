import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import HorizontalScroll from "components/ui/common/HorizontalScroll";

let observerCallbacks: IntersectionObserverCallback[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const scrollBy = vi.fn();
const scrollTo = vi.fn();

function intersectAll(intersectionRatio = 0.6) {
  act(() => {
    observerCallbacks.forEach((cb) =>
      cb(
        [
          { isIntersecting: true, intersectionRatio } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );
  });
}

describe("HorizontalScroll nudge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observerCallbacks = [];
    scrollBy.mockClear();
    scrollTo.mockClear();
    sessionStorage.clear();
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    );
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 1000,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 300,
    });
    HTMLElement.prototype.scrollBy = scrollBy;
    HTMLElement.prototype.scrollTo = scrollTo;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    Reflect.deleteProperty(HTMLElement.prototype, "scrollBy");
    Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  });

  const renderCarousel = () =>
    render(
      <HorizontalScroll ariaLabel="Test" nudgeOnFirstLoad hintStorageKey="k">
        <div role="listitem">a</div>
      </HorizontalScroll>,
    );

  it("does not nudge a carousel that never enters the viewport", () => {
    renderCarousel();
    act(() => vi.advanceTimersByTime(3000));

    expect(observerCallbacks).toHaveLength(1);
    expect(scrollBy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("k")).toBeNull();
  });

  it("nudges once when the carousel enters the viewport", () => {
    renderCarousel();
    intersectAll();
    act(() => vi.advanceTimersByTime(1000));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ left: 16, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    expect(sessionStorage.getItem("k")).toBe("1");
  });

  it("waits until half the carousel is visible", () => {
    renderCarousel();
    intersectAll(0.1);
    act(() => vi.advanceTimersByTime(1000));

    expect(scrollBy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("k")).toBeNull();

    intersectAll(0.6);
    act(() => vi.advanceTimersByTime(1000));
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it("nudges only one of two carousels that share a storage key", () => {
    renderCarousel();
    renderCarousel();
    intersectAll();
    act(() => vi.advanceTimersByTime(1000));

    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it("does not scroll back over a swipe made during the nudge", () => {
    const { getByRole } = renderCarousel();
    intersectAll();
    act(() => {
      getByRole("list").dispatchEvent(new Event("touchstart"));
      vi.advanceTimersByTime(1000);
    });

    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("removes its touch listeners once the nudge ends", () => {
    const { getByRole } = renderCarousel();
    const removeSpy = vi.spyOn(getByRole("list"), "removeEventListener");
    intersectAll();
    act(() => vi.advanceTimersByTime(1000));

    expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
  });
});
