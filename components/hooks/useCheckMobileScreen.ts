import { useEffect, useState, useRef, useCallback } from "react";

const useCheckMobileScreen = (): boolean => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);
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

    // Set initial width and mark as mounted
    setWidth(window.innerWidth);
    setHasMounted(true);

    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", handleWindowSizeChange);
      // Clear any pending timeout on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleWindowSizeChange]);

  // Return false during SSR and initial render to prevent hydration mismatch
  // Only return actual mobile detection after client-side mount
  if (!hasMounted) {
    return false;
  }

  return width !== undefined ? width <= 768 : false;
};

export default useCheckMobileScreen;
