/**
 * Types for PWA install flow and UI states.
 */

/**
 * Browser/UI state for install capability.
 */
export type PwaInstallState =
  | "installed"
  | "prompt"
  | "ios-manual"
  | "not-available";

/**
 * Non-standard event fired by Chromium browsers when app install can be prompted.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}
