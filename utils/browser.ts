/**
 * Browser-specific utilities.
 * Only import these in client components ("use client").
 */

/**
 * Schedule a callback during browser idle time or fallback to setTimeout.
 * Returns a cleanup function.
 */
export function scheduleIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): () => void {
  if (
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
  ) {
    const id = window.requestIdleCallback(callback, options);
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, options?.timeout ?? 100);
  return () => clearTimeout(id);
}

const FIRST_INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/** Whether the user asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * `behavior` for JS scrolls: the CSS reduced-motion rule (styles/globals.css)
 * can't reach `scrollTo({ behavior: "smooth" })`.
 */
export function smoothScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "instant" : "smooth";
}

/**
 * Run a callback once: on the first tap, key press or page scroll, or
 * `timeoutMs` after the window load event, whichever comes first.
 * Returns a cleanup function.
 */
export function onFirstInteractionOrTimeout(
  callback: () => void,
  timeoutMs: number
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const options: AddEventListenerOptions = { capture: true, passive: true };

  const cleanup = () => {
    clearTimeout(timer);
    FIRST_INTERACTION_EVENTS.forEach((type) =>
      window.removeEventListener(type, fire, options)
    );
    window.removeEventListener("scroll", fire);
    window.removeEventListener("load", startTimer);
  };
  function fire() {
    cleanup();
    callback();
  }
  function startTimer() {
    timer = setTimeout(fire, timeoutMs);
  }

  FIRST_INTERACTION_EVENTS.forEach((type) =>
    window.addEventListener(type, fire, options)
  );
  // Not captured: element scrolls (carousels) must not count, only the page.
  window.addEventListener("scroll", fire, { passive: true });
  if (document.readyState === "complete") startTimer();
  else window.addEventListener("load", startTimer, { once: true });

  return cleanup;
}

const USER_SCROLL_EVENTS = [...FIRST_INTERACTION_EVENTS, "wheel"] as const;

/**
 * Scroll `container` so `target` sits at its top (minus the target's
 * `scroll-margin-top`), and keep it there while content above it changes
 * size (lazy parts loading), until the user taps, types or scrolls in the
 * container. Returns a cleanup function.
 */
export function keepScrolledToTop(
  container: HTMLElement,
  target: HTMLElement
): () => void {
  const marginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const align = () => {
    const box = container.getBoundingClientRect();
    // Rects include transforms (a modal's entrance scale); scrollTop doesn't.
    const scale =
      box.height && container.offsetHeight
        ? box.height / container.offsetHeight
        : 1;
    container.scrollTop +=
      (target.getBoundingClientRect().top - box.top) / scale - marginTop;
  };
  align();
  if (typeof ResizeObserver === "undefined") return () => {};

  const observer = new ResizeObserver(align);
  for (const child of Array.from(container.children)) observer.observe(child);
  const options: AddEventListenerOptions = { capture: true, passive: true };
  const stop = () => {
    observer.disconnect();
    USER_SCROLL_EVENTS.forEach((type) =>
      container.removeEventListener(type, stop, options)
    );
  };
  USER_SCROLL_EVENTS.forEach((type) =>
    container.addEventListener(type, stop, options)
  );
  return stop;
}

/**
 * Ref callback for full-width `position: fixed` bars. While a Headless UI
 * dialog locks scroll, it hides the page scrollbar and pads `<html>` by its
 * width; fixed bars sit outside that padding, so they widen and their centred
 * content jumps sideways. Mirror the padding on the bar while it lasts.
 */
export function followScrollLockPadding(
  bar: HTMLElement | null
): (() => void) | undefined {
  if (!bar || typeof MutationObserver === "undefined") return;
  const html = document.documentElement;
  const sync = () => {
    bar.style.paddingRight = html.style.paddingRight;
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(html, { attributes: true, attributeFilter: ["style"] });
  return () => {
    observer.disconnect();
    bar.style.paddingRight = "";
  };
}
