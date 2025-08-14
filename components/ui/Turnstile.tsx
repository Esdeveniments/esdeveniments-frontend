"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    let mounted = true;
    const tryRender = () => {
      if (!mounted) return;
      if (ref.current && window.turnstile) {
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => onToken(token),
          "error-callback": () => onToken(null),
          "timeout-callback": () => onToken(null),
        });
      } else {
        setTimeout(tryRender, 200);
      }
    };

    tryRender();
    return () => {
      mounted = false;
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="cf-turnstile" />;
}