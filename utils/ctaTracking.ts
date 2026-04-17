/**
 * Session-wide CTA tracker. A single IntersectionObserver counts impressions,
 * click handlers accumulate interactions, and one `cta_summary` event is
 * dispatched on page hide. Keeps event volume O(1) per session per CTA.
 *
 * Mirrors the batching pattern used by `useListingAnalytics.ts` for card
 * impressions. `useTrackedCta` is the React entry point that registers an
 * element's ref with this singleton.
 */
import type { CtaStats, TrackedCtaId } from "types/analytics";
import { sendGoogleEvent } from "@utils/analytics";

const OBSERVER_THRESHOLD = 0.5;

let io: IntersectionObserver | null = null;
const elementToId = new WeakMap<Element, TrackedCtaId>();
const idStats = new Map<TrackedCtaId, CtaStats>();
// Use Set (not WeakSet) so we can iterate and clear on flush.
const countedElements = new Set<Element>();
// Track all registered elements so flush can re-arm them for the next session.
const registeredElements = new Set<Element>();

let sessionStart = 0;
let flushListenersAttached = false;

function getStats(id: TrackedCtaId): CtaStats {
  let stats = idStats.get(id);
  if (!stats) {
    stats = { impressions: 0, clicks: 0 };
    idStats.set(id, stats);
  }
  return stats;
}

function flush(): void {
  if (idStats.size === 0) return;

  // Self-heal if `registerCta` was called before `initCtaTracking` somehow —
  // otherwise `session_duration_ms` would be Date.now() − 0 (~55 years).
  if (sessionStart === 0) sessionStart = Date.now();

  const sessionDurationMs = Date.now() - sessionStart;
  // Emit one flat event per CTA so GA4 reports aggregate cleanly across
  // sessions — at most 5 events per pagehide (one per TrackedCtaId).
  for (const [id, stats] of idStats) {
    sendGoogleEvent("cta_session", {
      cta_id: id,
      impressions: stats.impressions,
      clicks: stats.clicks,
      first_interaction_ms: stats.firstInteractionMs,
      session_duration_ms: sessionDurationMs,
    });
  }

  // Reset per-window state so SPA navigations and tab-switch-and-return
  // keep tracking instead of locking the buffer after the first flush.
  idStats.clear();
  sessionStart = Date.now();

  // Re-arm still-mounted elements so impressions are counted in the next
  // session window — prevents `impressions: 0` with non-zero clicks after
  // a background/restore cycle.
  if (io) {
    for (const el of registeredElements) {
      if (countedElements.has(el)) {
        io.observe(el);
      }
    }
  }
  countedElements.clear();
}

function ensureObserver(): void {
  if (io) return;
  if (typeof IntersectionObserver === "undefined") return;

  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (countedElements.has(entry.target)) continue;
        const id = elementToId.get(entry.target);
        if (!id) continue;
        countedElements.add(entry.target);
        getStats(id).impressions += 1;
        io?.unobserve(entry.target);
      }
    },
    { threshold: OBSERVER_THRESHOLD }
  );
}

function ensureFlushListeners(): void {
  if (flushListenersAttached) return;
  if (typeof window === "undefined") return;
  flushListenersAttached = true;

  // `pagehide` is the most reliable cross-browser hook for session end.
  window.addEventListener("pagehide", flush);
  // Some mobile browsers skip `pagehide` when the tab is suspended.
  // `visibilitychange` → hidden is a safety net.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function initCtaTracking(): void {
  if (sessionStart !== 0) return;
  sessionStart = Date.now();
  ensureObserver();
  ensureFlushListeners();
}

export function registerCta(element: Element, id: TrackedCtaId): void {
  // Defensive: if callers register elements before `initCtaTracking` runs
  // (unusual React mount order, Strict Mode double-invocation, etc.), bring
  // the tracker online so `session_duration_ms` doesn't overflow at flush.
  if (sessionStart === 0) initCtaTracking();
  ensureObserver();
  if (!io) return;
  elementToId.set(element, id);
  registeredElements.add(element);
  io.observe(element);
}

export function unregisterCta(element: Element): void {
  elementToId.delete(element);
  registeredElements.delete(element);
  countedElements.delete(element);
  io?.unobserve(element);
}

export function trackCtaClick(id: TrackedCtaId): void {
  const stats = getStats(id);
  stats.clicks += 1;
  if (stats.firstInteractionMs === undefined && sessionStart !== 0) {
    stats.firstInteractionMs = Date.now() - sessionStart;
  }
}
