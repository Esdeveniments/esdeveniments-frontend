import { GoogleAnalyticsEvent } from "../types/common";
import { isE2ETestMode } from "./env";

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (isE2ETestMode) return;
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, obj);
  }
};
