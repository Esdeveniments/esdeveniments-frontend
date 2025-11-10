declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    gtag?: (command: string, event: string, params?: unknown) => void;
  }
}

export {};

declare module "*.css";
