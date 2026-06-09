"use client";

import { useState, useEffect, useCallback } from "react";
import type { PushState } from "types/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Convert a VAPID base64url public key to a Uint8Array for the browser API. */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * Hook for managing Web Push notification subscriptions.
 *
 * iOS (16.4+) requires the app to run in standalone mode (added to home screen)
 * before PushManager is available — this hook detects and surfaces that state.
 *
 * Usage:
 *   const { state, subscribe, unsubscribe } = usePushNotifications();
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>(() => {
    if (typeof window === "undefined") return "unsupported";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }
    if (!VAPID_PUBLIC_KEY) return "unsupported";

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);
    if (isIos && !isStandalone) return "unsupported";

    if (Notification.permission === "denied") return "denied";
    return "unsubscribed";
  });

  useEffect(() => {
    if (state !== "unsubscribed") return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => setState("unsubscribed"));
  }, [state]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // required by spec — silent pushes not allowed
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });

      setState("subscribed");
      return true;
    } catch {
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setState("unsubscribed");
        return true;
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setState("unsubscribed");
      return true;
    } catch {
      return false;
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
