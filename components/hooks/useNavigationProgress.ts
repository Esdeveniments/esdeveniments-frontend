"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  completeNavigationFeedback,
  subscribeNavigationFeedback,
} from "@lib/navigation-feedback";
import type { NavigationProgressState } from "types/ui";

const INITIAL_STATE: NavigationProgressState = {
  isVisible: false,
  isNavigating: false,
  progress: 0,
};

const PROGRESS_TARGET = 0.92;
const PROGRESS_STEP = 0.08;
const PROGRESS_INTERVAL = 120;

export function useNavigationProgress(): NavigationProgressState {
  const [state, setState] = useState<NavigationProgressState>(INITIAL_STATE);
  const intervalRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const searchParamsKey = searchParams?.toString();

  const prefersReducedMotion = usePrefersReducedMotion();

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isVisible: false,
        progress: 0,
      }));
    }, 200);
  }, [clearHideTimeout]);

  const handleComplete = useCallback(() => {
    clearIntervalRef();
    setState((prev) => ({
      ...prev,
      isNavigating: false,
      progress: 1,
    }));
    scheduleHide();
  }, [clearIntervalRef, scheduleHide]);

  const startInterval = useCallback(() => {
    clearIntervalRef();
    intervalRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isNavigating) return prev;
        const delta = (PROGRESS_TARGET - prev.progress) * PROGRESS_STEP;
        const next = prev.progress + delta;
        return {
          ...prev,
          progress: Math.min(next, PROGRESS_TARGET),
        };
      });
    }, PROGRESS_INTERVAL);
  }, [clearIntervalRef]);

  const handleStart = useCallback(() => {
    clearHideTimeout();
    setState((prev) => ({
      ...prev,
      isVisible: true,
      isNavigating: true,
      progress: prefersReducedMotion ? 1 : Math.max(prev.progress, 0.1),
    }));
    if (prefersReducedMotion) {
      scheduleHide();
      return;
    }
    startInterval();
  }, [
    prefersReducedMotion,
    startInterval,
    clearHideTimeout,
    scheduleHide,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeNavigationFeedback((event) => {
      if (event === "start") {
        handleStart();
      } else {
        handleComplete();
      }
    });
    return () => {
      unsubscribe();
      clearIntervalRef();
      clearHideTimeout();
    };
  }, [handleStart, handleComplete, clearIntervalRef, clearHideTimeout]);

  // Complete navigation whenever the path or search params change
  useEffect(() => {
    if (!pathname) return;
    completeNavigationFeedback();
  }, [pathname, searchParamsKey]);

  return state;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
