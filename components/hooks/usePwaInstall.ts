"use client";

import { useCallback, useEffect, useState } from "react";
import type { BeforeInstallPromptEvent, PwaInstallState } from "types/pwa";

function detectInstalledMode(): boolean {
  const inDisplayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true;
  return inDisplayMode || iosStandalone;
}

function detectIosManualInstall(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIos && isSafari;
}

/**
 * Hook for PWA install UX.
 *
 * - Chromium: exposes deferred install prompt via beforeinstallprompt.
 * - iOS Safari: exposes manual install guidance state.
 */
export function usePwaInstall() {
  // Initialize with not-available to avoid hydration mismatch
  const [installState, setInstallState] = useState<PwaInstallState>("not-available");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Move all browser-specific detection to useEffect to prevent hydration mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed
    if (detectInstalledMode()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstallState("installed");
      return;
    }

    // Check if iOS manual install needed
    if (detectIosManualInstall()) {
       
      setInstallState("ios-manual");
      return;
    }

     
    setInstallState("not-available");
  }, []);

  // Separate effect for event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setInstallState("prompt");
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstallState("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installState]);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setInstallState("installed");
        return "accepted";
      }
      return "dismissed";
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt]);

  return {
    installState,
    isInstalled: installState === "installed",
    canPromptInstall: installState === "prompt" && Boolean(deferredPrompt),
    showIosInstructions: installState === "ios-manual",
    promptInstall,
  };
}
