declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    gtag?: (...args: unknown[]) => void;
    __LAST_E2E_PUBLISH_SLUG__?: string;
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

export {};

declare module "*.css";
