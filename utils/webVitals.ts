/**
 * Wires the `web-vitals` package to GA4 via `sendGoogleEvent`.
 *
 * Emits one `web_vitals` event per Core Web Vitals metric per page load
 * (CLS, FCP, INP, LCP, TTFB). Values are reported in milliseconds except
 * CLS which is a unitless score multiplied by 1000 to fit GA4 integer
 * fields.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { sendGoogleEvent } from "@utils/analytics";

let initialized = false;

export function initWebVitals(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  const emit = (metric: Metric) => {
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
    });
  };

  onCLS(emit);
  onFCP(emit);
  onINP(emit);
  onLCP(emit);
  onTTFB(emit);
}
