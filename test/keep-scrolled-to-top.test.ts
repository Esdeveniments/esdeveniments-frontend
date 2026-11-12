import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { keepScrolledToTop } from "@utils/browser";

// jsdom has no layout: place the target `offset` px below the container's
// content top, so its on-screen top moves with `scrollTop`.
function setup(offset: { value: number }) {
  const container = document.createElement("div");
  const content = document.createElement("div");
  const target = document.createElement("p");
  content.appendChild(target);
  container.appendChild(content);
  document.body.appendChild(container);
  target.style.scrollMarginTop = "16px";
  container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
  target.getBoundingClientRect = () =>
    ({ top: 100 + offset.value - container.scrollTop }) as DOMRect;
  return { container, content, target };
}

describe("keepScrolledToTop", () => {
  let resize: () => void;
  const observed: Element[] = [];
  const disconnect = vi.fn();

  beforeEach(() => {
    observed.length = 0;
    disconnect.mockClear();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect = disconnect;
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("puts the target at the top, minus its scroll-margin-top", () => {
    const offset = { value: 500 };
    const { container, content, target } = setup(offset);

    keepScrolledToTop(container, target);

    expect(container.scrollTop).toBe(484);
    expect(observed).toEqual([content]);
  });

  it("keeps it there when content above it resizes", () => {
    const offset = { value: 500 };
    const { container, target } = setup(offset);
    keepScrolledToTop(container, target);

    offset.value = 700; // a lazy part above the target grew
    resize();

    expect(container.scrollTop).toBe(684);
  });

  it("undoes a transform scale on the container (modal entrance)", () => {
    const { container, target } = setup({ value: 0 });
    Object.defineProperty(container, "offsetHeight", { value: 400 });
    container.getBoundingClientRect = () =>
      ({ top: 100, height: 380 }) as DOMRect; // scale(0.95)
    target.getBoundingClientRect = () =>
      ({ top: 100 + (500 - container.scrollTop) * 0.95 }) as DOMRect;

    keepScrolledToTop(container, target);

    expect(container.scrollTop).toBeCloseTo(484);
  });

  it.each(["pointerdown", "keydown", "touchstart", "wheel"])(
    "stops following once the user interacts (%s)",
    (type) => {
      const offset = { value: 500 };
      const { container, target } = setup(offset);
      keepScrolledToTop(container, target);

      target.dispatchEvent(new Event(type, { bubbles: true }));

      expect(disconnect).toHaveBeenCalledTimes(1);
    }
  );
});
