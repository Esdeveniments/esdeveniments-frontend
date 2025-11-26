"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;

const getIsMobile = (): boolean =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof initialIsMobile === "boolean" ? initialIsMobile : false
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateIsMobile = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsMobile(getIsMobile());
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Align with the actual viewport once the client hydrates to avoid SSR/client mismatches.
    updateIsMobile();

    // Update after hydration and on resize to stay in sync with the viewport.
    window.addEventListener("resize", updateIsMobile);

    return () => {
      window.removeEventListener("resize", updateIsMobile);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [updateIsMobile]);

  return isMobile;
};

export default useCheckMobileScreen;
