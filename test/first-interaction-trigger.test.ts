import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onFirstInteractionOrTimeout as arm } from "@utils/browser";

const cleanups: Array<() => void> = [];
const onFirstInteractionOrTimeout = (callback: () => void, ms: number) => {
  const cleanup = arm(callback, ms);
  cleanups.push(cleanup);
  return cleanup;
};

describe("onFirstInteractionOrTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.useRealTimers();
    Reflect.deleteProperty(document, "readyState");
  });

  it("fires once on the first interaction, not again on later ones or the timeout", () => {
    const callback = vi.fn();
    onFirstInteractionOrTimeout(callback, 4500);

    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(10_000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it.each(["keydown", "touchstart", "scroll"])("fires on %s", (type) => {
    const callback = vi.fn();
    onFirstInteractionOrTimeout(callback, 4500);

    window.dispatchEvent(new Event(type));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores scrolls of an element inside the page", () => {
    const callback = vi.fn();
    onFirstInteractionOrTimeout(callback, 4500);
    const carousel = document.createElement("div");
    document.body.appendChild(carousel);

    carousel.dispatchEvent(new Event("scroll"));

    expect(callback).not.toHaveBeenCalled();
    carousel.remove();
  });

  it("fires on the timeout when the user does nothing", () => {
    const callback = vi.fn();
    onFirstInteractionOrTimeout(callback, 4500);

    vi.advanceTimersByTime(4499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("starts the timeout at the window load event", () => {
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "interactive",
    });
    const callback = vi.fn();
    onFirstInteractionOrTimeout(callback, 4500);

    vi.advanceTimersByTime(10_000);
    expect(callback).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(4500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("never fires after cleanup", () => {
    const callback = vi.fn();
    const cleanup = onFirstInteractionOrTimeout(callback, 4500);

    cleanup();
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(10_000);

    expect(callback).not.toHaveBeenCalled();
  });
});
