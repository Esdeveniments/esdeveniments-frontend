"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { useAdContext } from "@lib/context/AdContext";
import { isE2ETestMode } from "@utils/env";
import { isProductionHost } from "@utils/production-host";
import {
  onFirstInteractionOrTimeout,
  scheduleIdleCallback,
} from "@utils/browser";
import { ensureGtag, CONSENT_MODE_DEFAULTS } from "@utils/analytics";
import type { GoogleScriptsHeavyProps } from "types/ads";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
// FundingChoices URL uses the ads client ID (without 'ca-' prefix if present)
const FUNDING_CHOICES_PUB_ID = ADS_CLIENT?.replace(/^ca-/, "") ?? "";
const FUNDING_CHOICES_SRC = FUNDING_CHOICES_PUB_ID
  ? `https://fundingchoicesmessages.google.com/i/${FUNDING_CHOICES_PUB_ID}?ers=1`
  : "";

// Google Analytics gtag shim - reused across multiple Script components.
// Conditionally defines gtag only if it doesn't already exist (avoids
// overwriting the real gtag.js implementation if it has already loaded), and
// pushes the Consent Mode v2 denied default in that same guarded branch -
// mirroring ensureGtag() in utils/analytics.ts - so whichever of the two
// runs first (this inline script, or a tracker's ensureGtag() call on a hard
// nav) is the only one that ever pushes the default. Consent Mode only
// honors the first 'default' command; a second one would reset an
// already-granted consent state back to denied.
// It also pushes 'js' + 'config' in that branch, like ensureGtag(): gtag.js
// drops any event queued before 'config'. This script only renders on the
// production host, so it needs no host check of its own.
const GTAG_SHIM = `window.dataLayer=window.dataLayer||[];if(typeof window.gtag!=='function'){window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('consent','default',${JSON.stringify(CONSENT_MODE_DEFAULTS)});window.gtag('js',new Date());window.gtag('config','${GA_MEASUREMENT_ID}');}`;

// Idle timeout for consent state updates (allows main thread work to complete first)
const CONSENT_UPDATE_IDLE_TIMEOUT_MS = 1000;

// adsbygoogle.js waits for the first tap, key press or scroll, so it does not
// compete with the user's first interactions. Without one, it loads this long
// after the window load event.
const ADS_SCRIPT_FALLBACK_MS = 4500;

export default function GoogleScripts() {
  const { adsAllowed } = useAdContext();

  // Gate GA (pageviews + consent) and Auto Ads to the production host so they
  // never fire on Vercel previews, staging, or the app embedded in the Coolify
  // dashboard, all of which inline the same prod measurement ID. Reuses the
  // existing prod-host allowlist (covers www + apex). Resolved after mount so
  // the first client render matches SSR (both render nothing) — no hydration
  // mismatch. The CMP/consent banner is intentionally NOT gated (its
  // googlefcPresent script runs in the root layout <head>, and it sends
  // nothing to GA on its own).
  const [isProdHost, setIsProdHost] = useState(false);
  useEffect(() => {
    setIsProdHost(isProductionHost(window.location.hostname));
  }, []);

  const [HeavyComponent, setHeavyComponent] = useState<
    React.ComponentType<GoogleScriptsHeavyProps> | null
  >(null);
  // Armed at mount, not in GoogleScriptsHeavy: that mounts only after consent,
  // so it would miss the first interaction (often the consent click itself).
  const [adsScriptReady, setAdsScriptReady] = useState(false);
  useEffect(() => {
    if (isE2ETestMode) return;
    let cancelIdle: (() => void) | undefined;
    const cancelTrigger = onFirstInteractionOrTimeout(() => {
      // Off the event task, so the first tap's INP does not pay for it.
      cancelIdle = scheduleIdleCallback(() => setAdsScriptReady(true), {
        timeout: 500,
      });
    }, ADS_SCRIPT_FALLBACK_MS);
    return () => {
      cancelTrigger();
      cancelIdle?.();
    };
  }, []);
  // Track last consent state to avoid duplicate consent updates
  // Using useRef (not module-level) to handle React Strict Mode correctly
  const lastConsentStateRef = useRef<"granted" | "denied" | null>(null);

  // Keep GA consent state aligned with CMP decisions (Consent Mode v2).
  // Note: We use the same consent signal (adsAllowed) for both ads and analytics
  // because our TCF implementation (AdContext) provides a unified consent model.
  // This is intentional and aligns with our CMP's consent structure.
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || isE2ETestMode || !isProdHost) return;
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
  }, [adsAllowed, isProdHost]);

  // Load heavy tracking + Auto Ads only after hydration.
  // This prevents server/client HTML mismatches caused by client-only boundaries.
  useEffect(() => {
    if (!adsAllowed) return;
    if (isE2ETestMode) return;
    if (!isProdHost) return;
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
  }, [adsAllowed, isProdHost]);

  return (
    <>
      {/* Google Analytics - Consent Mode v2 (default pushed by GTAG_SHIM, see
          its comment above, for why this can't unconditionally re-push it) */}
      {GA_MEASUREMENT_ID && !isE2ETestMode && isProdHost && (
        <>
          <Script id="google-analytics-consent" strategy="lazyOnload">
            {GTAG_SHIM}
          </Script>
          <Script
            id="google-analytics-gtag"
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
        </>
      )}

      {!isE2ETestMode && (
        <>

          {/* Funding Choices (CMP) - loads with lazyOnload for PageSpeed.
              The googlefcPresent iframe script runs earlier, in the root layout <head>.
              AdContext polls for __tcfapi and falls back after 5s. */}
          {FUNDING_CHOICES_SRC && (
            <Script
              src={FUNDING_CHOICES_SRC}
              strategy="lazyOnload"
              onLoad={() => {
                // WORKAROUND: Google FC sometimes marks the page as "inactive" on root paths
                // due to script loading order issues from performance optimizations.
                // When this happens, googlefcInactive iframe exists but consent banner doesn't show.
                // Detect this condition and manually trigger the consent UI.
                setTimeout(() => {
                  const win = window as unknown as {
                    googlefc?: { showRevocationMessage?: () => void };
                    __tcfapi?: unknown;
                    frames?: Record<string, unknown>;
                  };

                  const hasInactiveFrame = Boolean(window.frames && 'googlefcInactive' in window.frames);
                  // Check if consent UI is already visible (Google FC uses .fc-consent-root)
                  const consentUIAlreadyVisible = Boolean(document.querySelector('.fc-consent-root'));

                  // Only trigger if: inactive frame exists AND consent UI is not showing
                  if (hasInactiveFrame && !consentUIAlreadyVisible && win.googlefc?.showRevocationMessage) {
                    try {
                      win.googlefc.showRevocationMessage();
                    } catch {
                      // Consent UI trigger failed silently
                    }
                  }
                }, 500);
              }}
            />
          )}


        </>
      )}


      {/* Heavy tracking + Auto Ads: only load after consent */}
      {!isE2ETestMode && isProdHost && adsAllowed && HeavyComponent && (
        <HeavyComponent
          adsAllowed={adsAllowed}
          adsScriptReady={adsScriptReady}
        />
      )}
    </>
  );
}
