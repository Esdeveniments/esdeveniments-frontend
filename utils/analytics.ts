import { GoogleAnalyticsEvent } from "../types/common";

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, obj);
  }
};
