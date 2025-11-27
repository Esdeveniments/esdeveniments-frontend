"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import type { TcfCallback } from "types/ads";
import { useRef } from "react";

const ADS_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS;
const ADS_SRC = ADS_CLIENT
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`
  : "";

export default function GoogleScripts() {
  const [adsAllowed, setAdsAllowed] = useState(false);
  const autoAdsInitRef = useRef(false);

  // Listen for TCF v2 consent (FundingChoices) and only allow ads when granted.
  useEffect(() => {
    let isMounted = true;
    let listenerId: number | undefined;

    const setConsent = (allowed: boolean) => {
      if (!isMounted) return;
      window.__adsConsentGranted = allowed;
      window.dispatchEvent(
        new CustomEvent("ads-consent-changed", { detail: { allowed } })
      );
      setAdsAllowed(allowed);
    };

    const hasAdConsent = (tcData: {
      purpose?: { consents?: Record<string, boolean> };
      vendor?: { consents?: Record<string, boolean> };
    }) => {
      const purposeConsent = tcData.purpose?.consents ?? {};
      const vendorConsent = tcData.vendor?.consents ?? {};
      // Purpose 1 (storage) + Google vendor 755 are the minimum signals we respect
      return Boolean(purposeConsent["1"] && vendorConsent["755"]);
    };

    const maybeHandleTcData: TcfCallback = (tcData, success) => {
      if (!success || !tcData) return;
      if (
        tcData.eventStatus === "useractioncomplete" ||
        tcData.eventStatus === "tcloaded"
      ) {
        setConsent(hasAdConsent(tcData));
      }
      if (typeof tcData.listenerId === "number") {
        listenerId = tcData.listenerId;
      }
    };

    if (typeof window.__tcfapi === "function") {
      window.__tcfapi("getTCData", 2, maybeHandleTcData);
      window.__tcfapi("addEventListener", 2, maybeHandleTcData);
    } else {
      // Fallback: behave like previous behavior (ads allowed) if CMP is missing
      setConsent(true);
    }

    return () => {
      isMounted = false;
      if (listenerId && typeof window.__tcfapi === "function") {
        window.__tcfapi("removeEventListener", 2, () => {}, listenerId);
      }
    };
  }, []);

  // Manually inject the Ads script once consent is granted to avoid Next.js data-nscript
  useEffect(() => {
    if (!adsAllowed || !ADS_SRC) return;
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${ADS_SRC}"]`
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = ADS_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [adsAllowed]);

  // Trigger Google Auto Ads once consented and loader is (or becomes) available.
  useEffect(() => {
    if (!adsAllowed || autoAdsInitRef.current || !ADS_CLIENT) return;

    const pushAutoAds = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: ADS_CLIENT,
          enable_page_level_ads: true,
        });
        autoAdsInitRef.current = true;
      } catch {
        // Retry once after a short delay if loader isn't ready yet
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: ADS_CLIENT,
              enable_page_level_ads: true,
            });
            autoAdsInitRef.current = true;
          } catch {
            // swallow; individual slots will still render with manual pushes
          }
        }, 600);
      }
    };

    // If the loader isn't on the page yet, wait briefly
    const hasLoader =
      typeof window !== "undefined" &&
      document.querySelector(`script[src="${ADS_SRC}"]`);
    if (hasLoader) {
      pushAutoAds();
      return;
    }

    const timer = setTimeout(pushAutoAds, 800);
    return () => clearTimeout(timer);
  }, [adsAllowed]);

  return (
    <>
      {/* Google Analytics - keep lazyOnload for perf */}
      <Script
        id="google-analytics-gtag"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}
      />
      <Script id="google-analytics-lazy-load" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>

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
