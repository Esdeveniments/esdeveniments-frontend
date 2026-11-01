/**
 * Wires the `web-vitals` package to GA4 via `sendGoogleEvent`.
 *
 * Emits one `web_vitals` event per Core Web Vitals metric per page load
 * (CLS, FCP, INP, LCP, TTFB). Values are reported in milliseconds except
 * CLS which is a unitless score multiplied by 1000 to fit GA4 integer
 * fields.
 *
 * `element` uses the same format as `rage_click` (one GA4 dimension for both):
 * the interaction target for INP, the LCP element, the largest CLS shift.
 */
import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} from "web-vitals/attribution";
import { sendGoogleEvent } from "@utils/analytics";
import { getElementKey, INTERACTIVE_SELECTORS } from "@utils/rageClick";
import type { MetricWithAttribution } from "types/common";

const elementOf = (node: Node | null): string | undefined =>
  node instanceof Element ? getElementKey(node) : undefined;

// Fold taps on icons and text up to the control, like rage_click does.
const interactionTarget = (node: Node | null): string | undefined =>
  elementOf(
    node instanceof Element ? (node.closest(INTERACTIVE_SELECTORS) ?? node) : node,
  );

function attributionParams(metric: MetricWithAttribution) {
  switch (metric.name) {
    case "INP":
      return {
        element: metric.attribution.interactionTarget,
        interaction_type: metric.attribution.interactionType,
        load_state: metric.attribution.loadState,
      };
    case "LCP":
      return { element: metric.attribution.target };
    case "CLS":
      return { element: metric.attribution.largestShiftTarget };
    default:
      return {};
  }
}

let initialized = false;

export function initWebVitals(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  const emit = (metric: MetricWithAttribution) => {
    sendGoogleEvent("web_vitals", {
      metric: metric.name,
      // Use `delta` (not `value`) so GA4 sums reconstruct the final metric
      // correctly when a metric fires multiple times per page load (LCP, INP).
      // CLS is unitless; scale x1000 so GA4 sees an integer it can aggregate.
      value: Math.round(
        metric.name === "CLS" ? metric.delta * 1000 : metric.delta
      ),
      rating: metric.rating,
      navigation_type: metric.navigationType,
      ...attributionParams(metric),
    });
  };

  onCLS(emit, { generateTarget: elementOf });
  onFCP(emit);
  onINP(emit, { generateTarget: interactionTarget });
  onLCP(emit, { generateTarget: elementOf });
  onTTFB(emit);
}
