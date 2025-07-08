import { useState, useEffect } from "react";
import { NetworkQuality, NetworkQualityCache } from "types/common";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useNetworkSpeed(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>("unknown");

  useEffect(() => {
    // Check cache first
    const cached = sessionStorage.getItem("networkQuality");
    if (cached) {
      try {
        const { quality: cachedQuality, timestamp }: NetworkQualityCache =
          JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setQuality(cachedQuality);
          return;
        }
      } catch {
        // Invalid cache, continue with detection
      }
    }

    // Detect network quality
    function detectNetworkQuality(): NetworkQuality {
      // Check for Network Information API
      const nav = navigator as unknown as Record<string, unknown>;
      const connection =
        nav.connection || nav.mozConnection || nav.webkitConnection;

      if (connection && typeof connection === "object") {
        const conn = connection as {
          downlink?: number;
          effectiveType?: string;
          saveData?: boolean;
        };

        // Check for data saver mode
        if (conn.saveData) {
          return "low";
        }

        // Use downlink speed if available (more accurate)
        if (typeof conn.downlink === "number") {
          if (conn.downlink >= 5) return "high";
          if (conn.downlink >= 1.5) return "medium";
          return "low";
        }

        // Fallback to effective type
        switch (conn.effectiveType) {
          case "4g":
            return "high";
          case "3g":
            return "medium";
          case "2g":
          case "slow-2g":
            return "low";
          default:
            return "medium";
        }
      }

      // Fallback: assume medium quality
      return "medium";
    }

    const detectedQuality = detectNetworkQuality();
    setQuality(detectedQuality);

    // Cache the result
    const cacheData: NetworkQualityCache = {
      quality: detectedQuality,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("networkQuality", JSON.stringify(cacheData));
  }, []);

  return quality;
}

// Hook to initialize network detection without returning the value
// Use this in components that need to ensure network detection runs
export function useNetworkDetection(): void {
  useEffect(() => {
    // Check if already cached
    const cached = sessionStorage.getItem("networkQuality");
    if (cached) {
      try {
        const { timestamp }: NetworkQualityCache = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return; // Still valid, no need to detect again
        }
      } catch {
        // Invalid cache, continue with detection
      }
    }

    // Run detection
    const nav = navigator as unknown as Record<string, unknown>;
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    let quality: NetworkQuality = "medium";

    if (connection && typeof connection === "object") {
      const conn = connection as {
        downlink?: number;
        effectiveType?: string;
        saveData?: boolean;
      };

      if (conn.saveData) {
        quality = "low";
      } else if (typeof conn.downlink === "number") {
        if (conn.downlink >= 5) quality = "high";
        else if (conn.downlink >= 1.5) quality = "medium";
        else quality = "low";
      } else {
        switch (conn.effectiveType) {
          case "4g":
            quality = "high";
            break;
          case "3g":
            quality = "medium";
            break;
          case "2g":
          case "slow-2g":
            quality = "low";
            break;
          default:
            quality = "medium";
        }
      }
    }

    // Cache the result
    const cacheData: NetworkQualityCache = {
      quality,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("networkQuality", JSON.stringify(cacheData));
  }, []);
}
