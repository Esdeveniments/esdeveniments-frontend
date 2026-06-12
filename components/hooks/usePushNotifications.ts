"use client";

import { useState, useEffect, useCallback } from "react";
import { captureException } from "@sentry/nextjs";
import { safeFetch } from "@utils/safe-fetch";
import type { PushState } from "types/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Convert a VAPID base64url public key to a Uint8Array for the browser API.
 *  The explicit Uint8Array<ArrayBuffer> generic is required: TS 5.9 narrows
 *  BufferSource to ArrayBufferView<ArrayBuffer>, and a bare Uint8Array
 *  (= Uint8Array<ArrayBufferLike>) fails the applicationServerKey check. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const view = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
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
  // Initialize with unsupported to avoid hydration mismatch
  const [state, setState] = useState<PushState>("unsupported");

  // Move all browser-specific detection to useEffect to prevent hydration mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check browser capabilities first
    // (Sync setState calls for feature detection; no cascading renders)
    // Notification can be absent even when PushManager exists (some iOS
    // webviews), so guard it here before reading Notification.permission below.
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      !VAPID_PUBLIC_KEY
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unsupported");
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);

    if (isIos && !isStandalone) {
       
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
       
      setState("denied");
      return;
    }

    // Check for existing subscription async; the active flag cancels the
    // pending state update if the component unmounts first (StrictMode
    // double-mount safe).
    let active = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!active) return;
        setState(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        if (active) setState("unsubscribed");
      });

    return () => {
      active = false;
    };
  }, []);

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
      // Defensive: encryption keys should always be present, but if the
      // browser returns a malformed subscription, roll it back instead of
      // sending a payload that will fail server validation and leave a
      // dangling browser-side subscription.
      if (!json.keys?.p256dh || !json.keys?.auth) {
        captureException(new Error("Push subscription missing keys"), {
          tags: { feature: "push", action: "subscribe" },
        });
        await sub.unsubscribe();
        setState("unsubscribed");
        return false;
      }

      // safeFetch: 5s timeout + Sentry capture with response body on failure
      const { error } = await safeFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
        context: { tags: { feature: "push", action: "subscribe" } },
      });

      if (error) {
        // Server didn't store it — roll back the browser subscription so
        // client and server state stay consistent.
        await sub.unsubscribe();
        setState("unsubscribed");
        return false;
      }

      setState("subscribed");
      return true;
    } catch (error) {
      captureException(error, {
        tags: { feature: "push", action: "subscribe" },
      });
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

      const { error } = await safeFetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
        context: { tags: { feature: "push", action: "unsubscribe" } },
      });

      if (error) return false;

      await sub.unsubscribe();
      setState("unsubscribed");
      return true;
    } catch (error) {
      captureException(error, {
        tags: { feature: "push", action: "unsubscribe" },
      });
      return false;
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
