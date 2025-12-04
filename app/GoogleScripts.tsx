"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useAdContext } from "../lib/context/AdContext";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
const ADS_SRC = ADS_CLIENT
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`
  : "";

export default function GoogleScripts() {
  const { adsAllowed } = useAdContext();
  const autoAdsInitRef = useRef(false);

  // Keep GA consent state aligned with CMP decisions (Consent Mode v2).
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (typeof window === "undefined") return;

    const consentState: "granted" | "denied" = adsAllowed ? "granted" : "denied";
    const win = window as Window & {
      dataLayer?: unknown[];
      __gaInitialPageviewSent?: boolean;
    };

    win.dataLayer = win.dataLayer || [];
    if (typeof win.gtag !== "function") {
      win.gtag = function gtag(...args: unknown[]) {
        win.dataLayer?.push(args);
      };
    }

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

    if (!adsAllowed) {
      win.__gaInitialPageviewSent = false;
      return;
    }

    if (!win.__gaInitialPageviewSent) {
      const pagePath = `${window.location.pathname}${window.location.search}`;
      win.gtag("event", "page_view", {
        page_path: pagePath,
      });
      win.__gaInitialPageviewSent = true;
    }
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
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
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
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
                cookie_domain: 'auto',
                anonymize_ip: true,
                send_page_view: false
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
    </>
  );
}
