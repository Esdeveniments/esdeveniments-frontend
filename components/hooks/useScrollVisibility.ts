import { useState, useEffect, useCallback } from "react";

export const useScrollVisibility = (scrollThreshold: number): boolean => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const handleScroll = useCallback((): void => {
    const shouldShow = window.scrollY < scrollThreshold;
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
    }
  }, [isVisible, scrollThreshold]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsVisible(window.scrollY < scrollThreshold);
      window.addEventListener("scroll", handleScroll);

      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
    return undefined;
  }, [handleScroll, scrollThreshold]);

  return isVisible;
};
