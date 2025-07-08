"use client";

import Script from "next/script";
import { GoogleScriptsProps } from "types/props";

export default function GoogleScripts({ nonce }: GoogleScriptsProps) {
  return (
    <>
      {/* Google Analytics */}
      <Script
        id="google-analytics-gtag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}
        nonce={nonce}
      />
      <Script
        id="google-analytics-lazy-load"
        strategy="afterInteractive"
        nonce={nonce}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
      {/* Google Ads */}
      <Script
        id="google-ads"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADS}`}
        nonce={nonce}
      />
      <Script id="google-adblock" strategy="afterInteractive" nonce={nonce}>
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
      <Script
        src="https://fundingchoicesmessages.google.com/i/pub-2456713018173238?ers=1"
        strategy="afterInteractive"
        nonce={nonce}
      />
    </>
  );
}
