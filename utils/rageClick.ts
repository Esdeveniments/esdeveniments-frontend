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

let initialized = false;

const recentClicks = new WeakMap<Element, number[]>();
const reportedElements = new Set<string>();

function getElementKey(el: Element): string {
  const rageId = el.getAttribute("data-rage-id");
  if (rageId) return `rage-id:${rageId}`;

  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const className =
    typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
  return `${tag}${id}${className}`.slice(0, 120);
}

export function initRageClick(): void {
  if (initialized) return;
  if (typeof document === "undefined") return;
  initialized = true;

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      if (!target || target.nodeType !== 1) return;

      const now = Date.now();
      const prior = recentClicks.get(target) ?? [];
      const recent = prior.filter((t) => now - t < CLICK_WINDOW_MS);
      recent.push(now);
      recentClicks.set(target, recent);

      if (recent.length < CLICK_THRESHOLD) return;

      const key = getElementKey(target);
      if (reportedElements.has(key)) return;
      reportedElements.add(key);

      sendGoogleEvent("rage_click", {
        element: key,
        click_count: recent.length,
        path: window.location.pathname,
      });
    },
    { passive: true, capture: true }
  );
}
