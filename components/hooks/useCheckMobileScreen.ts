import { useEffect, useState, useRef, useCallback } from "react";

const MOBILE_BREAKPOINT = 768;

const getIsMobile = (): boolean =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

const useCheckMobileScreen = (initialIsMobile?: boolean): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof initialIsMobile === "boolean" ? initialIsMobile : false
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWindowSizeChange = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsMobile(getIsMobile());
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    setIsMobile(getIsMobile());
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
