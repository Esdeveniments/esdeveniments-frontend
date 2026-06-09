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
  const [installState, setInstallState] = useState<PwaInstallState>(() => {
    if (typeof window === "undefined") return "not-available";
    if (detectInstalledMode()) return "installed";
    if (detectIosManualInstall()) return "ios-manual";
    return "not-available";
  });
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (installState === "installed") return;

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
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setInstallState("installed");
      return "accepted";
    }
    return "dismissed";
  }, [deferredPrompt]);

  return {
    installState,
    isInstalled: installState === "installed",
    canPromptInstall: installState === "prompt" && Boolean(deferredPrompt),
    showIosInstructions: installState === "ios-manual",
    promptInstall,
  };
}
