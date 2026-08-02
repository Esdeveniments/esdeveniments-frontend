import { GoogleAnalyticsEvent, WindowWithGtag } from "../types/common";
import { isE2ETestMode } from "./env";

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (isE2ETestMode) return;
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, obj);
  }
};

/**
 * Installs the gtag dataLayer-queueing shim if it isn't there yet, so
 * `sendGoogleEvent` calls that fire before GoogleScripts' own `lazyOnload`
 * scripts run (e.g. on a hard navigation, like the OIDC callback landing)
 * don't silently no-op. Safe to call anywhere: it only ever queues into
 * `dataLayer` — whether that queue ever reaches Google still depends on
 * GoogleScripts' existing prod-host/consent gating for the real gtag.js load.
 */
export const ensureGtag = (): WindowWithGtag | null => {
  if (typeof window === "undefined") return null;
  const win = window as WindowWithGtag;
  win.dataLayer = win.dataLayer || [];

  if (typeof win.gtag !== "function") {
    win.gtag = function gtag() {
      win.dataLayer.push(arguments);
    };
  }

  return win;
};
