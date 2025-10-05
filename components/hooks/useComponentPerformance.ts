import { useLayoutEffect, useRef, useEffect } from "react";
import { trackComponentPerformance } from "@utils/analytics";

/**
 * Hook to track component render performance
 */
export const useComponentPerformance = (componentName: string) => {
  const renderStart = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      trackComponentPerformance(componentName, renderTime);
    }
  });
};
