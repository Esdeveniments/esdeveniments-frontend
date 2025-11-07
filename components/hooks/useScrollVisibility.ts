"use client";
import { useState, useEffect, useCallback } from "react";

export const useScrollVisibility = (scrollThreshold: number): boolean => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.scrollY < scrollThreshold;
    }
    return true;
  });

  const handleScroll = useCallback((): void => {
    const shouldShow = window.scrollY < scrollThreshold;
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
    }
  }, [isVisible, scrollThreshold]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return isVisible;
};
