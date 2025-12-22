"use client";

import { useEffect, useRef } from "react";

import type { WindowWithGtag } from "types/common";
import { isE2ETestMode } from "@utils/env";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
const ADS_SRC = ADS_CLIENT
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`
  : "";

const ensureGtag = (): WindowWithGtag | null => {
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

export default function GoogleScriptsHeavy({
  adsAllowed,
}: {
  adsAllowed: boolean;
}) {
  const autoAdsInitRef = useRef(false);
  const autoAdsPendingToken = useRef<symbol | null>(null);

  // Track outbound link clicks (external http/https) with optional enrichment via data attributes.
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || isE2ETestMode) return;
    if (!adsAllowed) return;
    const win = ensureGtag();
    if (!win) return;

    const getClosestAnchor = (
      target: EventTarget | null
    ): HTMLAnchorElement | null => {
      if (!target) return null;
      const el = target as Element | null;
      if (!el) return null;
      if (el instanceof HTMLAnchorElement) return el;
      return el.closest?.("a") as HTMLAnchorElement | null;
    };

    const getClosestAnalyticsElement = (
      target: EventTarget | null
    ): HTMLElement | null => {
      if (!target) return null;
      const el = target as Element | null;
      if (!el) return null;
      return el.closest?.("[data-analytics-event-name]") as HTMLElement | null;
    };

    const handleClick = (event: MouseEvent) => {
      const analyticsEl = getClosestAnalyticsElement(event.target);
      const anchor = getClosestAnchor(event.target);
      if (!analyticsEl && !anchor) return;

      if (analyticsEl?.dataset.analyticsEventName) {
        const container = analyticsEl.closest(
          '[data-analytics-container="true"]'
        ) as HTMLElement | null;
        const dataset: DOMStringMap = {
          ...(container?.dataset || {}),
          ...(analyticsEl.dataset || {}),
        };

        win.gtag("event", dataset.analyticsEventName, {
          context: dataset.analyticsContext || undefined,
          target: dataset.analyticsTarget || undefined,
          category_slug: dataset.analyticsCategorySlug || undefined,
          place_label: dataset.analyticsPlaceLabel || undefined,
          temporal_label: dataset.analyticsTemporalLabel || undefined,
          event_id: dataset.analyticsEventId || undefined,
          event_slug: dataset.analyticsEventSlug || undefined,
          place_slug: dataset.analyticsPlaceSlug || undefined,
          date_slug: dataset.analyticsDateSlug || undefined,
          position: dataset.analyticsPosition || undefined,
          source_event_id: dataset.analyticsSourceEventId || undefined,
          source_event_slug: dataset.analyticsSourceEventSlug || undefined,
        });
      }

      if (!anchor) return;

      const hrefAttr = anchor.getAttribute("href") || "";
      if (!hrefAttr) return;

      const outboundContainer = anchor.closest(
        '[data-analytics-container="true"]'
      ) as HTMLElement | null;
      const outboundDataset: DOMStringMap = {
        ...(outboundContainer?.dataset || {}),
        ...(anchor.dataset || {}),
      };

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.origin);
      } catch {
        return;
      }

      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      if (!isHttp) return;
      const isExternal = url.origin !== window.location.origin;
      if (!isExternal) return;

      win.gtag("event", "outbound_click", {
        link_domain: url.hostname,
        link_path: url.pathname,
        link_type: outboundDataset.analyticsLinkType || undefined,
        context: outboundDataset.analyticsContext || undefined,
        event_id: outboundDataset.analyticsEventId || undefined,
        event_slug: outboundDataset.analyticsEventSlug || undefined,
        place_id: outboundDataset.analyticsPlaceId || undefined,
        place_name: outboundDataset.analyticsPlaceName || undefined,
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [adsAllowed]);

  // Trigger Google Auto Ads once consented and loader is (or becomes) available.
  useEffect(() => {
    if (!adsAllowed || !ADS_CLIENT) return;

    const setPendingToken = () => {
      const token = Symbol("auto-ads-init");
      autoAdsPendingToken.current = token;
      window.__autoAdsInitPending = token;
      return token;
    };

    const clearPendingToken = (token: symbol) => {
      if (window.__autoAdsInitPending === token) {
        window.__autoAdsInitPending = undefined;
      }
      if (autoAdsPendingToken.current === token) {
        autoAdsPendingToken.current = null;
      }
    };

    if (
      autoAdsInitRef.current ||
      window.__autoAdsInitialized ||
      autoAdsPendingToken.current ||
      window.__autoAdsInitPending
    ) {
      return;
    }

    const pendingToken = setPendingToken();

    const injectAdsScript = () => {
      if (ADS_SRC && !document.querySelector(`script[src="${ADS_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = ADS_SRC;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => injectAdsScript(), { timeout: 4000 });
    } else {
      setTimeout(injectAdsScript, 2000);
    }

    const pushAutoAds = () => {
      if (autoAdsInitRef.current || window.__autoAdsInitialized) {
        clearPendingToken(pendingToken);
        return;
      }

      const initAds = () => {
        if (autoAdsInitRef.current || window.__autoAdsInitialized) {
          clearPendingToken(pendingToken);
          return;
        }

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: ADS_CLIENT,
            enable_page_level_ads: true,
          });
          autoAdsInitRef.current = true;
          window.__autoAdsInitialized = true;
          clearPendingToken(pendingToken);
        } catch {
          setTimeout(() => {
            if (autoAdsInitRef.current || window.__autoAdsInitialized) {
              clearPendingToken(pendingToken);
              return;
            }
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({
                google_ad_client: ADS_CLIENT,
                enable_page_level_ads: true,
              });
              autoAdsInitRef.current = true;
              window.__autoAdsInitialized = true;
            } catch {
              // swallow; individual slots will still render with manual pushes
            } finally {
              clearPendingToken(pendingToken);
            }
          }, 1000);
        }
      };

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => initAds(), { timeout: 2000 });
      } else {
        setTimeout(initAds, 500);
      }
    };

    const timer = setTimeout(pushAutoAds, 1000);
    return () => {
      clearTimeout(timer);
      if (autoAdsPendingToken.current === pendingToken) {
        autoAdsPendingToken.current = null;
      }
      if (window.__autoAdsInitPending === pendingToken) {
        window.__autoAdsInitPending = undefined;
      }
    };
  }, [adsAllowed]);

  useEffect(() => {
    const handleTagErrors = (event: ErrorEvent) => {
      if (
        typeof event.message === "string" &&
        event.message.includes("adsbygoogle.push() error:")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleTagErrors);
    return () => {
      window.removeEventListener("error", handleTagErrors);
    };
  }, []);

  return null;
}
