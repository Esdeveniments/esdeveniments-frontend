interface GoogleAnalyticsEvent {
  [key: string]: unknown;
}

// Extend the Window interface to include gtag
declare global {
  /* eslint-disable-next-line no-unused-vars */
  interface Window {
    /* eslint-disable-next-line no-unused-vars */
    gtag?: (command: string, event: string, params?: unknown) => void;
  }
}

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, obj);
  }
};
