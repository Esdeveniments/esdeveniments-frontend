import { useEffect, useState, useRef, useCallback } from "react";

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [width, setWidth] = useState<number | undefined>(() =>
    typeof window === "undefined" ? undefined : window.innerWidth
  );
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
    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", handleWindowSizeChange);
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
