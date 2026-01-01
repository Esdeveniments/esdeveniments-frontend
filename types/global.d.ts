declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    gtag?: (...args: unknown[]) => void;
    __LAST_E2E_PUBLISH_SLUG__?: string;
    __OPENED_URLS__?: string[];
    __adsConsentGranted?: boolean;
    __autoAdsInitialized?: boolean;
    __autoAdsInitPending?: symbol;
    dataLayer?: unknown[];
    __tcfapi?: (
      command: "addEventListener" | "removeEventListener" | "getTCData",
      version: number,
      callback: import("./ads").TcfCallback,
      listenerId?: number
    ) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number }
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}

declare module "react" {
  interface CSSProperties {
    viewTransitionName?: string;
  }
}

// Type-safe next-intl translations
// This catches missing placeholder parameters at compile time (yarn typecheck)
type Messages = typeof import("../messages/ca.json");
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}

export {};

declare module "*.css";
