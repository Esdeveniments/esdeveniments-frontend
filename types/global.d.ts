declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    gtag?: (command: string, event: string, params?: unknown) => void;
    __LAST_E2E_PUBLISH_SLUG__?: string;
    __adsConsentGranted?: boolean;
    __tcfapi?: (
      command: "addEventListener" | "removeEventListener" | "getTCData",
      version: number,
      callback: import("./ads").TcfCallback,
      listenerId?: number
    ) => void;
  }
}

declare module 'react' {
  interface CSSProperties {
    viewTransitionName?: string;
  }
}

export {};

declare module "*.css";
