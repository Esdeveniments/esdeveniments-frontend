"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import {
  PWA_PROMPT_READY_EVENT,
  PWA_INSTALLED_EVENT,
} from "types/pwa";
import type { BeforeInstallPromptEvent, PwaInstallState } from "types/pwa";

function detectInstalledMode(): boolean {
  const inDisplayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true;
  return inDisplayMode || iosStandalone || window.__pwaInstalled === true;
}

/**
 * iPadOS detection. iPadOS 13+ reports a desktop Macintosh UA; the
 * reliable signal is a Mac UA combined with multi-touch support (real
 * Macs report 0). Needed by the install UI: Safari's share button sits
 * in the bottom toolbar on iPhone but top-right on iPad.
 */
function isIpadDevice(): boolean {
  const ua = navigator.userAgent;
  if (/ipad/i.test(ua)) return true;
  return /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

/** iOS/iPadOS device detection (any model). */
function isIosDevice(): boolean {
  return /iphone|ipod/i.test(navigator.userAgent) || isIpadDevice();
}

/**
 * In-app webviews (Instagram, Facebook, TikTok, …) cannot Add to Home
 * Screen on iOS — the user must open the page in Safari first. Most of
 * this popup's audience arrives from social links, so this path matters.
 */
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /instagram|fban|fbav|fb_iab|line\/|musical_ly|bytedancewebview|tiktok|snapchat|linkedinapp|pinterest|twitter|gsa\//i.test(
    ua,
  );
}

function detectIosInstallState(): PwaInstallState | null {
  if (!isIosDevice()) return null;
  // Since iOS 16.4 both Safari and third-party browsers (Chrome, Firefox,
  // Edge on iOS) expose Share → "Add to Home Screen", so manual guidance
  // applies to all real browsers — but not to in-app webviews.
  return isInAppBrowser() ? "ios-in-app" : "ios-manual";
}

function getStashedPrompt(): BeforeInstallPromptEvent | null {
  return window.__pwaDeferredPrompt ?? null;
}

/**
 * Hook for PWA install UX.
 *
 * - Chromium: consumes the deferred beforeinstallprompt event captured by
 *   the inline script in app/[locale]/layout.tsx (early capture prevents
 *   missing the one-shot event while lazy chunks load).
 * - iOS/iPadOS: exposes manual install guidance, with a dedicated state
 *   for in-app webviews where Add to Home Screen is unavailable.
 */
export function usePwaInstall() {
  // Initialize with not-available to avoid hydration mismatch
  const [installState, setInstallState] =
    useState<PwaInstallState>("not-available");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIpad, setIsIpad] = useState(false);

  // All browser-specific detection runs in an effect to prevent hydration
  // mismatches. Runs once; later transitions arrive via the capture-script
  // custom events below.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (detectInstalledMode()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstallState("installed");
      return;
    }

    // Consume a prompt captured before this hook mounted.
    const stashed = getStashedPrompt();
    if (stashed) {
      setDeferredPrompt(stashed);
      setInstallState("prompt");
    } else {
      const iosState = detectIosInstallState();
      if (iosState) {
        setInstallState(iosState);
        setIsIpad(isIpadDevice());
      }
    }

    const onPromptReady = () => {
      const prompt = getStashedPrompt();
      if (prompt) {
        setDeferredPrompt(prompt);
        setInstallState("prompt");
      }
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstallState("installed");
    };

    window.addEventListener(PWA_PROMPT_READY_EVENT, onPromptReady);
    window.addEventListener(PWA_INSTALLED_EVENT, onInstalled);
    return () => {
      window.removeEventListener(PWA_PROMPT_READY_EVENT, onPromptReady);
      window.removeEventListener(PWA_INSTALLED_EVENT, onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";

    // A BeforeInstallPromptEvent can only be prompted once (per MDN), so
    // always clear it up front — keeping it around leaves a button that
    // silently fails on retry. If Chromium decides to re-fire
    // beforeinstallprompt later, the capture script restores availability.
    setDeferredPrompt(null);
    window.__pwaDeferredPrompt = null;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallState("installed");
        return "accepted";
      }
      // Dismissed: fall back to "not-available" so the UI can offer the
      // next-best action (e.g. push opt-in works in-browser on desktop).
      setInstallState("not-available");
      return "dismissed";
    } catch (error) {
      captureException(error, {
        tags: { feature: "pwa", action: "prompt-install" },
      });
      setInstallState("not-available");
      return "unavailable";
    }
  }, [deferredPrompt]);

  return {
    installState,
    isInstalled: installState === "installed",
    canPromptInstall: installState === "prompt" && Boolean(deferredPrompt),
    showIosInstructions: installState === "ios-manual",
    showOpenInSafariHint: installState === "ios-in-app",
    /** Safari's share button is top-right on iPad, bottom toolbar on iPhone. */
    isIpad,
    promptInstall,
  };
}
