import { useEffect, useState, useRef, useCallback } from "react";

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const handleWindowSizeChange = useCallback((): void => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the resize event to prevent too many state updates
    timeoutRef.current = setTimeout(() => {
      // Only update if component is still mounted
      if (isMountedRef.current) {
        setWidth(window.innerWidth);
      }
    }, 100);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // Initialize width on mount so initial render after hydration reflects
    // the actual client viewport, not just the server hint/fallback.
    let rafId: number | null = null;
    if (typeof window !== "undefined") {
      rafId = window.requestAnimationFrame(() => {
        if (isMountedRef.current) setWidth(window.innerWidth);
      });
      window.addEventListener("resize", handleWindowSizeChange);
    }
    return () => {
      isMountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleWindowSizeChange);
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleWindowSizeChange]);

  // If the component hasn't mounted yet, prefer a server-provided hint when
  // available. This avoids rendering a desktop-only UI on the server and
  // then swapping to mobile after hydration (layout shift).
  if (width === undefined) {
    if (typeof initialIsMobile === "boolean") return initialIsMobile;
    return false;
  }
  return width <= 768;
};

export default useCheckMobileScreen;
