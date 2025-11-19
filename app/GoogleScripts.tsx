"use client";

import Script from "next/script";

export default function GoogleScripts() {
  return (
    <>
      {/* Google Analytics - Moved to lazyOnload for performance */}
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

      {/* Google Ads - Moved to lazyOnload to unblock main thread */}
      <Script
        id="google-ads"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADS}`}
      />

      {/* AdBlock Detection - Keep afterInteractive (Critical UI logic) */}
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

      {/* Funding Choices (CMP) - Keep afterInteractive (Legal/GDPR Requirement) */}
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
