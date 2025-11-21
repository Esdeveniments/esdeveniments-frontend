declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    gtag?: (command: string, event: string, params?: unknown) => void;
    __LAST_E2E_PUBLISH_SLUG__?: string;
  }
}

declare module 'react' {
  interface CSSProperties {
    viewTransitionName?: string;
  }
}

export {};

declare module "*.css";
