"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { useAdContext } from "@lib/context/AdContext";
import { useIsClient } from "@components/hooks/useIsClient";
import { isE2ETestBuild } from "@utils/env";
import { isProductionHost } from "@utils/production-host";
import {
  onFirstInteractionOrTimeout,
  scheduleIdleCallback,
} from "@utils/browser";
import {
  ensureGtag,
  CONSENT_MODE_DEFAULTS,
  FUNDING_CHOICES_SRC,
} from "@utils/analytics";
import type { GoogleScriptsHeavyProps, TcfCallback } from "types/ads";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;

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

// On a slow phone FC's own box reports "cmpuishown" up to ~1.2 s after its
// first TCF event; wait longer than that before showing the box by hand.
const CONSENT_FALLBACK_DELAY_MS = 3000;

// WORKAROUND: on some pages (seen on "/") Funding Choices loads but never
// shows its box to a new visitor, so show it by hand. Only when FC's first TCF
// event says GDPR applies and there is no stored consent string, and FC has
// not shown its own box since. The wait starts at that first event, not at a
// fixed time, so a slow FC cannot reopen the box for a visitor who already
// chose. (The googlefcInactive frame is no signal: it is there for everyone.)
export function armConsentFallback(): () => void {
  if (typeof window.__tcfapi !== "function") return () => {};
  let settled = false;
  let listenerId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopListening = () => {
    if (listenerId === undefined) return;
    window.__tcfapi?.("removeEventListener", 2, () => {}, listenerId);
    listenerId = undefined;
  };
  const onTcData: TcfCallback = (tcData, success) => {
    if (!success || !tcData) return;
    if (typeof tcData.listenerId === "number") listenerId = tcData.listenerId;
    if (settled) {
      stopListening();
      return;
    }
    if (
      tcData.tcString ||
      tcData.gdprApplies === false ||
      tcData.eventStatus === "cmpuishown"
    ) {
      settled = true;
      clearTimeout(timer);
      stopListening();
      return;
    }
    // undefined means "not known yet": wait for a later event.
    if (tcData.gdprApplies !== true) return;
    timer ??= setTimeout(() => {
      stopListening();
      if (settled || document.querySelector(".fc-consent-root")) return;
      try {
        window.googlefc?.showRevocationMessage?.();
      } catch {
        // Consent UI trigger failed silently
      }
    }, CONSENT_FALLBACK_DELAY_MS);
  };
  window.__tcfapi("addEventListener", 2, onTcData);
  return () => {
    settled = true;
    clearTimeout(timer);
    stopListening();
  };
}

export default function GoogleScripts() {
  const { adsAllowed } = useAdContext();

  // Gate GA (pageviews + consent) and Auto Ads to the production host so they
  // never fire on Vercel previews, staging, or the app embedded in the Coolify
  // dashboard, all of which inline the same prod measurement ID. Reuses the
  // existing prod-host allowlist (covers www + apex). False on the server and
  // during hydration, so the first client render matches SSR (both render
  // nothing) — no hydration mismatch. The CMP/consent banner is intentionally
  // NOT gated (its googlefcPresent script runs in the root layout <head>, and
  // it sends nothing to GA on its own).
  const isClient = useIsClient();
  const isProdHost = isClient && isProductionHost(window.location.hostname);

  const [HeavyComponent, setHeavyComponent] = useState<
    React.ComponentType<GoogleScriptsHeavyProps> | null
  >(null);
  // Armed at mount, not in GoogleScriptsHeavy: that mounts only after consent,
  // so it would miss the first interaction (often the consent click itself).
  const [adsScriptReady, setAdsScriptReady] = useState(false);
  useEffect(() => {
    if (isE2ETestBuild) return;
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
  // The Funding Choices loader is in the root layout <head>. Arm the consent
  // fallback once it has loaded.
  useEffect(() => {
    if (isE2ETestBuild || !FUNDING_CHOICES_SRC) return;
    const script = document.querySelector<HTMLScriptElement>(
      `script[src="${FUNDING_CHOICES_SRC}"]`
    );
    if (!script) return;
    let disarm: (() => void) | undefined;
    const arm = () => {
      disarm = armConsentFallback();
    };
    // Usually loaded before hydration: the loader defines __tcfapi, and there
    // is no load event left to wait for.
    if (typeof window.__tcfapi === "function") arm();
    else script.addEventListener("load", arm, { once: true });
    return () => {
      script.removeEventListener("load", arm);
      disarm?.();
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
    if (!GA_MEASUREMENT_ID || isE2ETestBuild || !isProdHost) return;
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
    if (isE2ETestBuild) return;
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
      {GA_MEASUREMENT_ID && !isE2ETestBuild && isProdHost && (
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

      {/* Heavy tracking + Auto Ads: only load after consent */}
      {!isE2ETestBuild && isProdHost && adsAllowed && HeavyComponent && (
        <HeavyComponent
          adsAllowed={adsAllowed}
          adsScriptReady={adsScriptReady}
        />
      )}
    </>
  );
}
