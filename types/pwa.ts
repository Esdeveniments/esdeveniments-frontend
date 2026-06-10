/**
 * Types for PWA install flow and UI states.
 */

/**
 * Browser/UI state for install capability.
 *
 * - "installed": running standalone or install completed.
 * - "prompt": Chromium deferred install prompt is available.
 * - "ios-manual": iOS/iPadOS browser where the user must use
 *   Share → "Add to Home Screen" (Safari and, since iOS 16.4,
 *   third-party browsers too).
 * - "ios-in-app": iOS in-app webview (Instagram, Facebook, …) where
 *   Add to Home Screen is unavailable; user must open in Safari.
 * - "not-available": no install path detected (yet).
 */
export type PwaInstallState =
  | "installed"
  | "prompt"
  | "ios-manual"
  | "ios-in-app"
  | "not-available";

/**
 * Non-standard event fired by Chromium browsers when app install can be prompted.
 * Per spec/MDN, `prompt()` may only be called once per event instance.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

/**
 * Custom event names re-dispatched by the inline capture script in
 * app/[locale]/layout.tsx. The script must stay in sync with these.
 */
export const PWA_PROMPT_READY_EVENT = "pwa:install-prompt-ready";
export const PWA_INSTALLED_EVENT = "pwa:installed";

declare global {
  interface Window {
    /**
     * Stash for the deferred beforeinstallprompt event, captured by an
     * inline <head> script before any React chunk loads. Chromium fires
     * the event once (often before hydration of lazy chunks); without
     * early capture the install CTA can be missed for the whole session.
     */
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    /** Set by the inline capture script when `appinstalled` fires. */
    __pwaInstalled?: boolean;
  }
}
