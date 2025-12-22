import { GoogleAnalyticsEvent } from "../types/common";

// Disable GA in E2E test mode to prevent test traffic from polluting analytics
const isE2ETestMode =
  process.env.E2E_TEST_MODE === "1" ||
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

export const sendGoogleEvent = (
  event: string,
  obj: GoogleAnalyticsEvent
): void => {
  if (isE2ETestMode) return;
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, obj);
  }
};
