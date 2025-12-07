"use client";

import { useEffect, useRef, Suspense, useMemo } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdContext } from "../lib/context/AdContext";
import type { WindowWithGtag } from "types/common";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
const ADS_SRC = ADS_CLIENT
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`
  : "";

// Google Analytics gtag shim - reused across multiple Script components
// Conditionally defines gtag only if it doesn't already exist to avoid overwriting
// the real gtag.js implementation if it has already loaded
const GTAG_SHIM = 'window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};';

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

// Separate component for pageview tracking that uses useSearchParams (requires Suspense)
function GoogleAnalyticsPageview({ adsAllowed }: { adsAllowed: boolean }) {
  const lastTrackedPathRef = useRef<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Normalize search params: sort by key and use consistent encoding to prevent
  // spurious pageview events from parameter order/encoding variations
  const searchParamsString = useMemo(() => {
    if (!searchParams) return "";
    // Create a mutable copy from the read-only searchParams and sort it
    const params = new URLSearchParams(searchParams);
    params.sort();
    return params.toString();
  }, [searchParams]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const win = ensureGtag();
    if (!win) return;

    if (!adsAllowed) {
      // Don't reset the ref when consent is revoked - prevents duplicate pageviews
      // if consent is re-granted on the same page
      return;
    }

    const query = searchParamsString ? `?${searchParamsString}` : "";
    const pagePath = `${pathname || "/"}` + query;

    // Only send page_view if we haven't tracked this path yet
    if (lastTrackedPathRef.current === pagePath) return;

    win.gtag("event", "page_view", {
      page_path: pagePath,
    });

    lastTrackedPathRef.current = pagePath;
  }, [adsAllowed, pathname, searchParamsString]);

  return null;
}

export default function GoogleScripts() {
  const { adsAllowed } = useAdContext();
  const autoAdsInitRef = useRef(false);

  // Keep GA consent state aligned with CMP decisions (Consent Mode v2).
  // Note: We use the same consent signal (adsAllowed) for both ads and analytics
  // because our TCF implementation (AdContext) provides a unified consent model.
  // This is intentional and aligns with our CMP's consent structure.
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const win = ensureGtag();
    if (!win) return;

    const consentState: "granted" | "denied" = adsAllowed ? "granted" : "denied";
    win.gtag("consent", "update", {
      ad_user_data: consentState,
      ad_personalization: consentState,
      ad_storage: consentState,
      analytics_storage: consentState,
    });

    win.dataLayer.push({
      event: "consent_state_change",
      consent_state: consentState,
      consent_timestamp: Date.now(),
    });
  }, [adsAllowed]);

  // Trigger Google Auto Ads once consented and loader is (or becomes) available.
  useEffect(() => {
    if (!adsAllowed || !ADS_CLIENT) return;

    // Manually inject script to avoid data-nscript warning from AdSense
    // Defer injection to reduce main thread blocking during hydration
    const injectAdsScript = () => {
      if (ADS_SRC && !document.querySelector(`script[src="${ADS_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = ADS_SRC;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => injectAdsScript(), { timeout: 4000 });
    } else {
      setTimeout(injectAdsScript, 2000);
    }

    const pushAutoAds = () => {
      if (autoAdsInitRef.current || window.__autoAdsInitialized) return;

      const initAds = () => {
        // Double-check inside the callback to prevent race conditions
        if (autoAdsInitRef.current || window.__autoAdsInitialized) return;

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: ADS_CLIENT,
            enable_page_level_ads: true,
          });
          autoAdsInitRef.current = true;
          window.__autoAdsInitialized = true;
        } catch {
          // Retry once after a short delay if loader isn't ready yet
          setTimeout(() => {
            if (autoAdsInitRef.current || window.__autoAdsInitialized) return;
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({
                google_ad_client: ADS_CLIENT,
                enable_page_level_ads: true,
              });
              autoAdsInitRef.current = true;
              window.__autoAdsInitialized = true;
            } catch {
              // swallow; individual slots will still render with manual pushes
            }
          }, 1000); // Increased delay to reduce CPU pressure
        }
      };

      // Use requestIdleCallback if available to avoid blocking main thread
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => initAds(), { timeout: 2000 });
      } else {
        setTimeout(initAds, 500);
      }
    };

    // If the loader isn't on the page yet, wait briefly
    // The script is now manually injected, but we still need to wait for it to load and parse.
    const timer = setTimeout(pushAutoAds, 1000); // Increased delay
    return () => clearTimeout(timer);
  }, [adsAllowed]);

  return (
    <>
      {/* Google Analytics - Consent Mode v2 */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script id="google-analytics-consent" strategy="afterInteractive">
            {`
              ${GTAG_SHIM}
              gtag('consent', 'default', {
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                ad_storage: 'denied',
                analytics_storage: 'denied'
              });
            `}
          </Script>
          <Script
            id="google-analytics-gtag"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script id="google-analytics-lazy-load" strategy="lazyOnload">
            {`
              ${GTAG_SHIM}
              // Note: GTAG_SHIM is included here defensively, even though it's already in
              // google-analytics-consent script. This ensures gtag is available if script
              // loading order varies or the consent script fails to load.
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                cookie_domain: 'auto',
                send_pageview: false
              });
            `}
          </Script>
        </>
      )}

      {/* AdBlock Detection - keep afterInteractive (UI logic) */}
      <Script id="google-adblock" strategy="afterInteractive">
        {`
          (function() {
            function signalGooglefcPresent() {
              if (!window.frames['googlefcPresent']) {
                if (document.body) {
                 const iframe = document.createElement('iframe');
                 iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
                 iframe.style.display = 'none';
                 iframe.name = 'googlefcPresent';
                 document.body.appendChild(iframe);
                } else {
                 setTimeout(signalGooglefcPresent, 0);
                }
              }
            }
            signalGooglefcPresent();
          })();
        `}
      </Script>

      {/* Funding Choices (CMP) - keep afterInteractive */}
      <Script
        src="https://fundingchoicesmessages.google.com/i/pub-2456713018173238?ers=1"
        strategy="afterInteractive"
      />

      {/* AI Referrer Analytics - lazyOnload + robust dataLayer check */}
      <Script id="ai-referrer-analytics" strategy="lazyOnload">
        {`
          (function() {
            try {
              const referrer = document.referrer;
              if (!referrer) return;
              
              const aiDomains = [
                'chat.openai.com',
                'perplexity.ai',
                'gemini.google.com',
                'bard.google.com',
                'claude.ai'
              ];
              
              const isAiReferrer = aiDomains.some(domain => referrer.includes(domain));
              if (!isAiReferrer) return;
              
              const domain = aiDomains.find(d => referrer.includes(d));
              const sessionKey = 'ai_referrer_tracked_' + domain;
              
              if (sessionStorage.getItem(sessionKey)) return;
              
              // Robustness fix: Push directly to dataLayer instead of relying on global gtag function
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'ai_referrer',
                referrer_domain: domain,
                referrer_url: referrer
              });
              
              sessionStorage.setItem(sessionKey, 'true');
            } catch (error) {
              console.warn('AI referrer analytics error:', error);
            }
          })();
        `}
      </Script>

      {/* Pageview tracking - wrapped in Suspense for useSearchParams */}
      {GA_MEASUREMENT_ID && (
        <Suspense fallback={null}>
          <GoogleAnalyticsPageview adsAllowed={adsAllowed} />
        </Suspense>
      )}
    </>
  );
}
