"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import type { TcfCallback, AdContextType } from "types/ads";

// Debug logging for production investigation - remove after debugging
// Uses console.warn because console.log is stripped in production (see next.config.js removeConsole)
const DEBUG_ADS = true; // Set to false to disable
const debugLog = (...args: unknown[]) => {
  if (DEBUG_ADS && typeof window !== 'undefined') {
    console.warn('[AdContext]', ...args);
  }
};

const AdContext = createContext<AdContextType | undefined>(undefined);

export const useAdContext = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error("useAdContext must be used within an AdProvider");
  }
  return context;
};

export const AdProvider = ({ children }: { children: ReactNode }) => {
  const [adsAllowed, setAdsAllowed] = useState(false);
  debugLog('AdProvider mounted, initial adsAllowed: false');

  // Shared Observers
  const visibilityObserver = useRef<IntersectionObserver | null>(null);
  const mutationObserver = useRef<MutationObserver | null>(null);

  // Callbacks maps
  const visibilityCallbacks = useRef<Map<Element, () => void>>(new Map());
  const mutationCallbacks = useRef<
    Map<Element, (mutations: MutationRecord[]) => void>
  >(new Map());

  // Initialize Consent Listener
  useEffect(() => {
    let isMounted = true;
    let listenerId: number | undefined;
    let pollIntervalId: ReturnType<typeof setInterval> | undefined;
    let cmpListenerRegistered = false;

    const setConsent = (allowed: boolean) => {
      debugLog('setConsent called with:', allowed, 'isMounted:', isMounted, 'current __adsConsentGranted:', window.__adsConsentGranted);
      if (!isMounted) return;
      // Always update if value changed (important for consent revocation)
      if (window.__adsConsentGranted === allowed) {
        debugLog('Skipping setConsent - value unchanged');
        return;
      }

      debugLog('Updating consent to:', allowed);
      window.__adsConsentGranted = allowed;
      window.dispatchEvent(
        new CustomEvent("ads-consent-changed", { detail: { allowed } })
      );
      setAdsAllowed(allowed);
    };

    const hasAdConsent = (tcData: {
      purpose?: { consents?: Record<string, boolean> };
      vendor?: { consents?: Record<string, boolean> };
    }) => {
      const purposeConsent = tcData.purpose?.consents ?? {};
      const vendorConsent = tcData.vendor?.consents ?? {};
      // Purpose 1 (storage) + Google vendor 755 are the minimum signals we respect
      return Boolean(purposeConsent["1"] && vendorConsent["755"]);
    };

    const maybeHandleTcData: TcfCallback = (tcData, success) => {
      if (!success || !tcData) return;
      if (
        tcData.eventStatus === "useractioncomplete" ||
        tcData.eventStatus === "tcloaded"
      ) {
        setConsent(hasAdConsent(tcData));
      }
      if (typeof tcData.listenerId === "number") {
        listenerId = tcData.listenerId;
      }
    };

    const registerCmpListeners = () => {
      if (cmpListenerRegistered) return;
      if (typeof window.__tcfapi !== "function") return;

      cmpListenerRegistered = true;
      window.__tcfapi("getTCData", 2, maybeHandleTcData);
      window.__tcfapi("addEventListener", 2, maybeHandleTcData);
    };

    const initConsent = () => {
      debugLog('initConsent called');
      if (!isMounted) {
        debugLog('initConsent: not mounted, returning');
        return;
      }
      if (typeof window === "undefined") {
        debugLog('initConsent: window undefined, returning');
        return;
      }

      // If CMP already available, register immediately
      if (typeof window.__tcfapi === "function") {
        debugLog('initConsent: __tcfapi already available, registering listeners');
        registerCmpListeners();
        return;
      }

      debugLog('initConsent: __tcfapi not available, starting poll');
      // CMP not loaded yet - poll for it
      // Key insight: We ALWAYS want to register listeners when CMP appears,
      // even if we've already fallen back to default consent.
      // This ensures consent revocation is detected.
      let attempts = 0;
      const maxAttemptsBeforeFallback = 20; // 5s before showing ads
      const maxAttemptsTotal = 60; // 15s total polling (CMP might be slow)

      pollIntervalId = setInterval(() => {
        if (!isMounted) {
          debugLog('Poll: unmounted, clearing interval');
          if (pollIntervalId) clearInterval(pollIntervalId);
          return;
        }

        attempts++;
        debugLog('Poll attempt', attempts, '- __tcfapi available:', typeof window.__tcfapi === "function");

        if (typeof window.__tcfapi === "function") {
          // CMP loaded! Register listeners (this handles consent revocation too)
          debugLog('Poll: CMP now available! Registering listeners.');
          if (pollIntervalId) clearInterval(pollIntervalId);
          registerCmpListeners();
          return;
        }

        if (attempts === maxAttemptsBeforeFallback) {
          // After 5s: Enable ads with default consent (user can still revoke later)
          // This is safe because we CONTINUE polling for CMP
          debugLog('Poll: 5s timeout reached, falling back to default consent (true)');
          setConsent(true);
          // Don't clear interval - keep polling for CMP to handle revocation
        }

        if (attempts >= maxAttemptsTotal) {
          // After 15s: Stop polling. CMP is likely blocked or failed.
          // Ads are already running with default consent.
          debugLog('Poll: 15s timeout reached, stopping poll');
          if (pollIntervalId) clearInterval(pollIntervalId);
        }
      }, 250);
    };

    initConsent();

    return () => {
      isMounted = false;
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (
        listenerId &&
        typeof window !== "undefined" &&
        typeof window.__tcfapi === "function"
      ) {
        window.__tcfapi("removeEventListener", 2, () => { }, listenerId);
      }
    };
  }, []);

  // Initialize Visibility Observer
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    visibilityObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = visibilityCallbacks.current.get(entry.target);
            if (callback) {
              callback();
              // Once visible, we might not need to observe it anymore depending on logic,
              // but usually for lazy load we unobserve immediately.
              // We'll let the consumer decide when to unobserve, or unobserve here if it's a one-time trigger.
              // For ad loading, it's usually one-time.
            }
          }
        });
      },
      { rootMargin: "0px 0px 320px 0px" } // Same rootMargin as before
    );

    return () => {
      visibilityObserver.current?.disconnect();
    };
  }, []);

  // Initialize Mutation Observer
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;

    mutationObserver.current = new MutationObserver((mutations) => {
      // Group mutations by target to avoid multiple callbacks if not needed,
      // but MutationObserver batches them anyway.
      // We need to map mutations back to the registered callbacks.
      // Since we observe specific elements, we can look up the target.

      // A mutation record has a target. We need to find which registered element this target belongs to.
      // Since we observe the element itself, mutation.target should be the element or a descendant.
      // However, we usually observe the container for attribute changes or child list.

      const affectedElements = new Set<Element>();
      const mutationsByElement = new Map<Element, MutationRecord[]>();

      mutations.forEach((mutation) => {
        const target = mutation.target as Element;
        // Find the registered ancestor for subtree mutations
        // When subtree: true, mutations on descendants have mutation.target set to the descendant,
        // not the observed element, so we need to traverse up to find the registered element.
        let current: Element | null = target;
        while (current) {
          if (mutationCallbacks.current.has(current)) {
            affectedElements.add(current);
            const mutations = mutationsByElement.get(current) || [];
            mutations.push(mutation);
            mutationsByElement.set(current, mutations);
            break;
          }
          current = current.parentElement;
        }
      });

      affectedElements.forEach(element => {
        const callback = mutationCallbacks.current.get(element);
        const elementMutations = mutationsByElement.get(element);
        if (callback && elementMutations) {
          callback(elementMutations);
        }
      });
    });

    return () => {
      mutationObserver.current?.disconnect();
    };
  }, []);

  const observeVisibility = useCallback((element: Element, callback: () => void) => {
    if (!visibilityObserver.current) {
      // Fallback if observer not supported or not ready, trigger immediately
      callback();
      return;
    }
    visibilityCallbacks.current.set(element, callback);
    visibilityObserver.current.observe(element);
  }, []);

  const unobserveVisibility = useCallback((element: Element) => {
    visibilityCallbacks.current.delete(element);
    visibilityObserver.current?.unobserve(element);
  }, []);

  const observeMutations = useCallback((element: Element, callback: (mutations: MutationRecord[]) => void) => {
    if (!mutationObserver.current) return;
    mutationCallbacks.current.set(element, callback);
    mutationObserver.current.observe(element, {
      attributeFilter: ["data-ad-status"],
      attributes: true,
      childList: true, // We also check for children length in the original code
      subtree: true // Original didn't use subtree but might be safer if ad injects deep structure. 
      // Actually original used: { attributeFilter: ["data-ad-status"], attributes: true } 
      // AND checked children in a separate effect/timer.
      // Let's stick to attributes and childList on the element itself.
    });
  }, []);

  const unobserveMutations = useCallback((element: Element) => {
    mutationCallbacks.current.delete(element);
    // MutationObserver.unobserve doesn't exist. We just stop invoking callback.
    // We can't selectively unobserve a specific element from the observer instance without disconnecting all.
    // This is a limitation of MutationObserver. 
    // However, since we filter by registered callbacks in the listener, this is fine.
    // To truly stop overhead, we would need one observer per element, but that's what we want to avoid.
    // The overhead of observing is low if we ignore the callbacks.
  }, []);

  return (
    <AdContext.Provider
      value={{
        adsAllowed,
        observeVisibility,
        unobserveVisibility,
        observeMutations,
        unobserveMutations,
      }}
    >
      {children}
    </AdContext.Provider>
  );
};
