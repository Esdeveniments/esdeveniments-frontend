import { useEffect, useState, useRef, useCallback } from "react";

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [width, setWidth] = useState<number | undefined>(() =>
    typeof window !== "undefined" ? window.innerWidth : undefined
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWindowSizeChange = useCallback((): void => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the resize event to prevent too many state updates
    timeoutRef.current = setTimeout(() => {
      setWidth(window.innerWidth);
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleWindowSizeChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleWindowSizeChange);
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
