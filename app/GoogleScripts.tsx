"use client";

import { useEffect, useRef, Suspense, useMemo, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdContext } from "../lib/context/AdContext";
import type { WindowWithGtag } from "types/common";
import { isE2ETestMode } from "../utils/env";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;

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
    if (!GA_MEASUREMENT_ID || isE2ETestMode) return;
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
  const [HeavyComponent, setHeavyComponent] = useState<
    React.ComponentType<{ adsAllowed: boolean }> | null
  >(null);

  // Keep GA consent state aligned with CMP decisions (Consent Mode v2).
  // Note: We use the same consent signal (adsAllowed) for both ads and analytics
  // because our TCF implementation (AdContext) provides a unified consent model.
  // This is intentional and aligns with our CMP's consent structure.
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || isE2ETestMode) return;
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

  // Load heavy tracking + Auto Ads only after hydration.
  // This prevents server/client HTML mismatches caused by client-only boundaries.
  useEffect(() => {
    if (!adsAllowed) return;
    let cancelled = false;

    import("./GoogleScriptsHeavy")
      .then((mod) => {
        if (cancelled) return;
        setHeavyComponent(() => mod.default);
      })
      .catch(() => {
        // Keep resilient: analytics/ads helpers should never break rendering
      });

    return () => {
      cancelled = true;
    };
  }, [adsAllowed]);

  return (
    <>
      {/* Google Analytics - Consent Mode v2 */}
      {GA_MEASUREMENT_ID && !isE2ETestMode && (
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
      {GA_MEASUREMENT_ID && !isE2ETestMode && (
        <Suspense fallback={null}>
          <GoogleAnalyticsPageview adsAllowed={adsAllowed} />
        </Suspense>
      )}

      {/* Heavy tracking + Auto Ads: only load after consent */}
      {adsAllowed && HeavyComponent && <HeavyComponent adsAllowed={adsAllowed} />}
    </>
  );
}
