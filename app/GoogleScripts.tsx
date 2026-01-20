"use client";

import { useEffect, Suspense, useMemo, useState, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdContext } from "@lib/context/AdContext";
import type { WindowWithGtag } from "types/common";
import { isE2ETestMode } from "@utils/env";
import { scheduleIdleCallback } from "@utils/browser";

// Debug logging for production investigation - remove after debugging
// Uses console.warn because console.log is stripped in production (see next.config.js removeConsole)
const DEBUG_ADS = true; // Set to false to disable
const debugLog = (...args: unknown[]) => {
  if (DEBUG_ADS && typeof window !== 'undefined') {
    console.warn('[GoogleScripts]', ...args);
  }
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
// FundingChoices URL uses the ads client ID (without 'ca-' prefix if present)
const FUNDING_CHOICES_PUB_ID = ADS_CLIENT?.replace(/^ca-/, "") ?? "";
const FUNDING_CHOICES_SRC = FUNDING_CHOICES_PUB_ID
  ? `https://fundingchoicesmessages.google.com/i/${FUNDING_CHOICES_PUB_ID}?ers=1`
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

// Debounce tracking: store path + timestamp to allow re-visits but prevent duplicates
// Key = path, Value = timestamp of last track
const pageViewTimestamps = new Map<string, number>();
// Minimum ms between tracking same path (prevents duplicates from re-renders/strict mode)
const DEBOUNCE_MS = 1000;
// Idle timeout for consent state updates (allows main thread work to complete first)
const CONSENT_UPDATE_IDLE_TIMEOUT_MS = 1000;

/**
 * Check if we should track this page view.
 * Returns true if:
 * - Path hasn't been tracked before, OR
 * - Path was tracked more than DEBOUNCE_MS ago (legitimate re-visit)
 */
function shouldTrackPageView(pagePath: string): boolean {
  const now = Date.now();
  const lastTracked = pageViewTimestamps.get(pagePath);

  if (lastTracked === undefined || now - lastTracked > DEBOUNCE_MS) {
    pageViewTimestamps.set(pagePath, now);

    // Cleanup: remove entries older than 5 minutes to prevent memory growth
    if (pageViewTimestamps.size > 100) {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      for (const [path, timestamp] of pageViewTimestamps) {
        if (timestamp < fiveMinutesAgo) {
          pageViewTimestamps.delete(path);
        }
      }
    }

    return true;
  }

  return false;
}

// Separate component for pageview tracking that uses useSearchParams (requires Suspense)
function GoogleAnalyticsPageview({ adsAllowed }: { adsAllowed: boolean }) {
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
    if (!adsAllowed) return; // Don't track when consent is not given

    const win = ensureGtag();
    if (!win) return;

    const query = searchParamsString ? `?${searchParamsString}` : "";
    const pagePath = `${pathname || "/"}` + query;

    // Time-based debounce: prevents duplicates from React re-renders/Strict Mode
    // but allows legitimate re-visits (user navigates away and back)
    if (!shouldTrackPageView(pagePath)) {
      return;
    }

    win.gtag("event", "page_view", {
      page_path: pagePath,
    });
  }, [adsAllowed, pathname, searchParamsString]);

  return null;
}

export default function GoogleScripts() {
  const { adsAllowed } = useAdContext();
  debugLog('Component mounted, adsAllowed:', adsAllowed, 'isE2ETestMode:', isE2ETestMode);

  const [HeavyComponent, setHeavyComponent] = useState<
    React.ComponentType<{ adsAllowed: boolean }> | null
  >(null);
  // Track last consent state to avoid duplicate consent updates
  // Using useRef (not module-level) to handle React Strict Mode correctly
  const lastConsentStateRef = useRef<"granted" | "denied" | null>(null);

  // Keep GA consent state aligned with CMP decisions (Consent Mode v2).
  // Note: We use the same consent signal (adsAllowed) for both ads and analytics
  // because our TCF implementation (AdContext) provides a unified consent model.
  // This is intentional and aligns with our CMP's consent structure.
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || isE2ETestMode) return;
    const win = ensureGtag();
    if (!win) return;

    const consentState: "granted" | "denied" = adsAllowed ? "granted" : "denied";

    // Skip if consent state hasn't actually changed (prevents duplicate events)
    if (lastConsentStateRef.current === consentState) return;

    // Use idle callback to avoid blocking main thread during consent updates
    // Note: We update lastConsentStateRef inside the callback to ensure it only
    // updates when gtag is actually called (fixes React Strict Mode double-invoke)
    const cleanup = scheduleIdleCallback(
      () => {
        // Double-check inside callback in case state changed during idle wait
        if (lastConsentStateRef.current === consentState) return;
        lastConsentStateRef.current = consentState;

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
      },
      { timeout: CONSENT_UPDATE_IDLE_TIMEOUT_MS }
    );

    return cleanup;
  }, [adsAllowed]);

  // Load heavy tracking + Auto Ads only after hydration.
  // This prevents server/client HTML mismatches caused by client-only boundaries.
  useEffect(() => {
    if (!adsAllowed) return;
    if (isE2ETestMode) return;
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
      {/* Google Analytics - Consent Mode v2 (defaults set inline to avoid race conditions) */}
      {GA_MEASUREMENT_ID && !isE2ETestMode && (
        <>
          <Script id="google-analytics-consent" strategy="lazyOnload">
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

      {!isE2ETestMode && (
        <>
          {/* googlefcPresent iframe - MUST exist BEFORE Funding Choices loads (Google requirement).
              Uses beforeInteractive to guarantee ordering. This is a tiny inline script with
              zero performance impact - it just creates a hidden iframe. */}
          <Script id="google-fc-present" strategy="beforeInteractive">
            {`
              (function() {
                if (window.frames['googlefcPresent']) return;
                var createIframe = function() {
                  if (!document.body) {
                    setTimeout(createIframe, 0);
                    return;
                  }
                  var i = document.createElement('iframe');
                  i.style.cssText = 'width:0;height:0;border:none;z-index:-1000;position:absolute;left:-1000px;top:-1000px';
                  i.style.display = 'none';
                  i.name = 'googlefcPresent';
                  document.body.appendChild(i);
                };
                createIframe();
              })();
            `}
          </Script>

          {/* Funding Choices (CMP) - loads with lazyOnload for PageSpeed.
              Since googlefcPresent uses beforeInteractive, ordering is guaranteed.
              AdContext polls for __tcfapi and falls back after 5s. */}
          {FUNDING_CHOICES_SRC && (
            <Script 
              src={FUNDING_CHOICES_SRC} 
              strategy="lazyOnload"
              onLoad={() => {
                debugLog('Funding Choices script loaded, checking googlefc state...');
                debugLog('Current URL:', window.location.href);
                debugLog('Document readyState:', document.readyState);
                
                // Log googlefc state after a short delay to let it initialize
                setTimeout(() => {
                  const win = window as unknown as { googlefc?: unknown; __tcfapi?: unknown };
                  debugLog('googlefc object:', win.googlefc);
                  debugLog('__tcfapi available:', typeof win.__tcfapi);
                  
                  // Check if there are any cookies that might affect consent
                  const fcCookies = document.cookie.split(';')
                    .filter(c => c.includes('__gfc') || c.includes('__gpi') || c.includes('FCCDCF'));
                  debugLog('Funding Choices cookies:', fcCookies.length > 0 ? fcCookies : 'none');
                }, 500);
              }}
            />
          )}

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
        </>
      )}

      {/* Pageview tracking - wrapped in Suspense for useSearchParams */}
      {GA_MEASUREMENT_ID && !isE2ETestMode && (
        <Suspense fallback={null}>
          <GoogleAnalyticsPageview adsAllowed={adsAllowed} />
        </Suspense>
      )}

      {/* Heavy tracking + Auto Ads: only load after consent */}
      {!isE2ETestMode && adsAllowed && HeavyComponent && (
        <HeavyComponent adsAllowed={adsAllowed} />
      )}
    </>
  );
}
