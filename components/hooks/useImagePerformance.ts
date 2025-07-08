import { useEffect, useRef } from "react";
import { ImagePerformanceMetrics } from "types/common";

export const useImagePerformance = (
  src: string | undefined,
  quality: number,
  priority: boolean = false
) => {
  const startTimeRef = useRef<number>(0);
  const reportedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!src || reportedRef.current) return;

    startTimeRef.current = performance.now();
    reportedRef.current = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    const handleLoad = () => {
      if (!startTimeRef.current || reportedRef.current) return;
      
      const loadTime = performance.now() - startTimeRef.current;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      const metrics: ImagePerformanceMetrics = {
        loadTime,
        size: 0, // Will be populated by network tab if available
        src,
        networkType: connection?.effectiveType,
        quality,
      };

      // Only report in production and for priority images or slow loads
      if (process.env.NODE_ENV === "production" && (priority || loadTime > 1000)) {
        console.log("Image Performance:", metrics);
        
        // Send to analytics or monitoring service
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "image_performance", {
            event_category: "performance",
            event_label: priority ? "priority" : "normal",
            value: Math.round(loadTime),
          });
        }
      }

      reportedRef.current = true;
    };

    const handleError = () => {
      if (!startTimeRef.current || reportedRef.current) return;
      
      const loadTime = performance.now() - startTimeRef.current;
      
      if (process.env.NODE_ENV === "production") {
        console.warn("Image Load Error:", { src, loadTime });
        
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "image_error", {
            event_category: "performance",
            event_label: "load_failure",
            value: Math.round(loadTime),
          });
        }
      }
      
      reportedRef.current = true;
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);
    
    img.src = src;

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src, quality, priority]);
};
