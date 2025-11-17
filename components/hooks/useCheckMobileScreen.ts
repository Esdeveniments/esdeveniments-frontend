"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;

const getIsMobile = (): boolean =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // On the client, always prioritize the actual window size.
    if (typeof window !== "undefined") {
      return getIsMobile();
    }
    // On the server, use the provided hint.
    if (typeof initialIsMobile === "boolean") {
      return initialIsMobile;
    }
    // Fallback for server-side rendering without a hint.
    return false;
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWindowSizeChange = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // React automatically skips updates when the value is the same (Object.is comparison)
      setIsMobile(getIsMobile());
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set up resize listener - state is already initialized correctly
    // via the lazy initializer, so no need to setState here
    window.addEventListener("resize", handleWindowSizeChange);

    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleWindowSizeChange]);

  return isMobile;
};

export default useCheckMobileScreen;
