/**
 * Detects rage clicks: 3+ clicks within 1 second on the same element.
 * Emits one `rage_click` event per element per session to avoid spam.
 *
 * Element identity is resolved via `data-rage-id` when present, falling
 * back to a compact `tag#id.class` signature (first two classes only) so
 * stable identification survives styling drift.
 */
import { sendGoogleEvent } from "@utils/analytics";

const CLICK_WINDOW_MS = 1000;
const CLICK_THRESHOLD = 3;

// Selectors for stable interactive ancestors. Clicks on children (icons,
// text spans) are folded up to the nearest interactive element so rapid
// clicks don't split across multiple DOM nodes and hide the rage pattern.
const INTERACTIVE_SELECTORS =
  'button, a, [role="button"], [role="link"], input, [data-rage-id]';

let initialized = false;

const recentClicks = new WeakMap<Element, number[]>();
const reportedElements = new Set<string>();

function getElementKey(el: Element): string {
  const rageId = el.getAttribute("data-rage-id");
  if (rageId) return `rage-id:${rageId}`;

  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  // Use getAttribute("class") instead of el.className — SVG elements
  // return an SVGAnimatedString for className, not a plain string.
  const rawClass = el.getAttribute("class") || "";
  const className = rawClass
    ? "." + rawClass.trim().replace(/\s+/g, ".") 
    : "";
  // GA4 caps event parameter values at 100 characters.
  return (tag + id + className).slice(0, 100);
}

export function initRageClick(): void {
  if (initialized) return;
  if (typeof document === "undefined") return;
  initialized = true;

  document.addEventListener(
    "click",
    (e) => {
      const rawTarget = e.target as Element | null;
      if (!rawTarget || rawTarget.nodeType !== 1) return;

      // Normalize to the nearest interactive ancestor so clicks on icons or
      // text inside a button collapse to the same identity. Falls back to
      // the raw target when nothing interactive is above it.
      const target = rawTarget.closest(INTERACTIVE_SELECTORS) ?? rawTarget;

      const now = Date.now();
      const prior = recentClicks.get(target) ?? [];
      const recent = prior.filter((t) => now - t < CLICK_WINDOW_MS);
      recent.push(now);
      recentClicks.set(target, recent);

      if (recent.length < CLICK_THRESHOLD) return;

      const key = getElementKey(target);
      // Scope dedupe by route to prevent cross-page collisions on elements
      // with identical tag/class signatures.
      const scopedKey = `${window.location.pathname}::${key}`;
      if (reportedElements.has(scopedKey)) return;
      reportedElements.add(scopedKey);

      sendGoogleEvent("rage_click", {
        element: key,
        click_count: recent.length,
        path: window.location.pathname,
      });
    },
    { passive: true, capture: true }
  );
}
