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

// Consent Mode v2 baseline, pushed once by ensureGtag() below. Exported so
// test/analytics.test.ts can assert against it without duplicating the
// literal.
export const CONSENT_MODE_DEFAULTS = {
  ad_user_data: "denied",
  ad_personalization: "denied",
  ad_storage: "denied",
  analytics_storage: "denied",
} as const;

/**
 * Installs the gtag dataLayer-queueing shim if it isn't there yet, so
 * `sendGoogleEvent` calls that fire before GoogleScripts' own `lazyOnload`
 * scripts run (e.g. on a hard navigation, like the OIDC callback landing)
 * don't silently no-op. Safe to call anywhere: it only ever queues into
 * `dataLayer` — whether that queue ever reaches Google still depends on
 * GoogleScripts' existing prod-host/consent gating for the real gtag.js load.
 *
 * Pushes the Consent Mode v2 denied default in the same guarded branch as
 * the shim install, mirroring GoogleScripts' inline GTAG_SHIM script (see
 * its comment there) - so whichever of the two runs first is the only one
 * that pushes the default, guaranteeing it's queued before any event either
 * side sends, without ever double-pushing it.
 */
export const ensureGtag = (): WindowWithGtag | null => {
  if (typeof window === "undefined") return null;
  const win = window as WindowWithGtag;
  win.dataLayer = win.dataLayer || [];

  if (typeof win.gtag !== "function") {
    win.gtag = function gtag() {
      win.dataLayer.push(arguments);
    };
    win.gtag("consent", "default", CONSENT_MODE_DEFAULTS);
  }

  return win;
};
