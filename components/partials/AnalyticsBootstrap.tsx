"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { initCtaTracking } from "@utils/ctaTracking";
import { initRageClick } from "@utils/rageClick";
import { setUserProperties } from "@utils/userProperties";
import { initWebVitals } from "@utils/webVitals";

/**
 * Client-only bootstrap for the analytics instrumentation layer added in
 * April 2026 (CWV, rage-click, CTA session tracking, user properties).
 *
 * Mounted once inside `AdProvider` in `app/[locale]/layout.tsx`. Each init
 * is idempotent and gracefully no-ops when `window.gtag` is not yet
 * available — `setUserProperties` retries for up to 10 seconds.
 */
export default function AnalyticsBootstrap(): null {
  const locale = useLocale();

  useEffect(() => {
    initWebVitals();
    setUserProperties(locale);
    initRageClick();
    initCtaTracking();
  }, [locale]);

  return null;
}
