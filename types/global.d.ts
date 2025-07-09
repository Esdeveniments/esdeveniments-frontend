declare global {
  interface Window {
    adsbygoogle: unknown[];
  }

  interface Window {
    /* eslint-disable-next-line no-unused-vars */
    gtag?: (command: string, event: string, params?: unknown) => void;
  }
}

export {};
