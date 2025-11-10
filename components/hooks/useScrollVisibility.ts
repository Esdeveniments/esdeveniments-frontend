"use client";
import { useState, useEffect, useCallback } from "react";

export const useScrollVisibility = (scrollThreshold: number): boolean => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.scrollY < scrollThreshold;
    }
    return true;
  });

  // Keep a stable handler that doesn't close over isVisible; update via
  // functional set to avoid stale closures and unnecessary subscriptions.
  const handleScroll = useCallback((): void => {
    const next = window.scrollY < scrollThreshold;
    setIsVisible((prev) => (prev !== next ? next : prev));
  }, [scrollThreshold]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sync once on mount and whenever the threshold changes without
    // synchronous setState in the effect body.
    const rafId = window.requestAnimationFrame(handleScroll);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(rafId);
    };
  }, [handleScroll]);

  return isVisible;
};
