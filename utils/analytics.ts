import { GoogleAnalyticsEvent, WindowWithGtag } from "../types/common";
import { isE2ETestMode } from "./env";
import { isProductionHost } from "./production-host";

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (isE2ETestMode) return;
  ensureGtag()?.gtag("event", event, obj);
};

// How long gtag.js holds its hits (the landing page_view) for our consent
// update after it loads. Funding Choices answers asynchronously; without a
// wait, the page_view of a visitor who consented on an earlier visit goes out
// denied, and GA reports leave denied hits out.
export const CONSENT_WAIT_FOR_UPDATE_MS = 1000;

// Consent Mode v2 baseline, pushed once by ensureGtag() below. Exported so
// test/analytics.test.ts can assert against it without duplicating the
// literal.
export const CONSENT_MODE_DEFAULTS = {
  ad_user_data: "denied",
  ad_personalization: "denied",
  ad_storage: "denied",
  analytics_storage: "denied",
  wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS,
} as const;

// Funding Choices (Google CMP) loader. The URL uses the AdSense publisher ID
// without the "ca-" prefix.
const FUNDING_CHOICES_PUB_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS?.replace(/^ca-/, "") ?? "";
export const FUNDING_CHOICES_SRC = FUNDING_CHOICES_PUB_ID
  ? `https://fundingchoicesmessages.google.com/i/${FUNDING_CHOICES_PUB_ID}?ers=1`
  : "";

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
    // gtag.js drops events queued before 'config', so config goes in right
    // after the default instead of waiting for the lazyOnload scripts.
    const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
    if (gaId && isProductionHost(win.location.hostname)) {
      win.gtag("js", new Date());
      win.gtag("config", gaId);
    }
  }

  return win;
};

// Remembers that this browser sent a user_id, so a later anonymous page load
// (after logout, which is a full redirect) clears it with null.
const USER_ID_SET_KEY = "ga_user_id_set";

/**
 * GA4 User-ID: set the opaque auth id when signed in, send null after a
 * sign-out, send nothing for visitors who never signed in (per Google's
 * user-id guide). Never pass an email or username here.
 */
export const setAnalyticsUserId = (userId: string | null): void => {
  if (isE2ETestMode) return;
  const win = ensureGtag();
  if (!win) return;
  try {
    if (userId) {
      win.gtag("set", { user_id: userId });
      localStorage.setItem(USER_ID_SET_KEY, "1");
    } else if (localStorage.getItem(USER_ID_SET_KEY)) {
      win.gtag("set", { user_id: null });
      localStorage.removeItem(USER_ID_SET_KEY);
    }
  } catch {
    // Storage disabled: the user_id (if any) was still set above.
  }
};

// GA4 drops event param values longer than 100 characters.
const MAX_SEARCH_TERM_LENGTH = 100;

/** Normalizes a typed search for the `search_term` param. */
export const toSearchTermParam = (term: string): string =>
  term.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_SEARCH_TERM_LENGTH);

/** A typed search matched a place name and opened that place's page. */
export const sendPlaceRedirectGA = (
  context: "search" | "hero_search" | "hero_cta",
  term: string,
  placeSlug: string,
): void =>
  sendGoogleEvent("search_place_redirect", {
    context,
    search_term: toSearchTermParam(term),
    matched_place: placeSlug,
  });

/** Last path segment of a shared URL (the event slug), never the title. */
export const getShareItemId = (url: string): string => {
  try {
    const segments = new URL(url, "https://www.esdeveniments.cat").pathname
      .split("/")
      .filter(Boolean);
    return segments.at(-1) ?? "";
  } catch {
    return "";
  }
};
