import { useState, useEffect } from "react";
import {
  NetworkQuality,
  NetworkQualityCache,
  NetworkInformation,
} from "types/common";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get network quality from cache if valid
 */
function getNetworkQualityFromCache(): NetworkQuality | null {
  const cached = sessionStorage.getItem("networkQuality");
  if (!cached) return null;

  try {
    const { quality: cachedQuality, timestamp }: NetworkQualityCache =
      JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return cachedQuality;
    }
  } catch (error) {
    console.error("Error parsing network quality cache:", error);
    // Invalid cache, return null to trigger detection
  }

  return null;
}

/**
 * Detect network quality using Network Information API
 */
function detectNetworkQuality(): NetworkQuality {
  // Check for Network Information API with proper typing
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (connection) {
    const conn = connection as NetworkInformation;

    // Check for data saver mode
    if (conn.saveData) {
      return "low";
    }

    // Use downlink speed if available (more accurate)
    if (typeof conn.downlink === "number") {
      if (conn.downlink >= 15) return "high"; // Raised from 5 to align with average 4G speeds
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

/**
 * Cache network quality result
 */
function cacheNetworkQuality(quality: NetworkQuality): void {
  const cacheData: NetworkQualityCache = {
    quality,
    timestamp: Date.now(),
  };
  sessionStorage.setItem("networkQuality", JSON.stringify(cacheData));
}

/**
 * Hook to initialize network detection without returning the value.
 * Use this in components that need to ensure network detection runs
 * and caches the result for other components to consume.
 */
export function useNetworkSpeed(): NetworkQuality {
  const [networkQuality, setNetworkQuality] =
    useState<NetworkQuality>("unknown");

  useEffect(() => {
    // Check cache first
    const cached = getNetworkQualityFromCache();
    if (cached) {
      setNetworkQuality(cached);
      return;
    }

    // Detect network quality
    const detectedQuality = detectNetworkQuality();
    setNetworkQuality(detectedQuality);

    // Cache the result
    cacheNetworkQuality(detectedQuality);
  }, []);

  return networkQuality;
}

/**
 * Hook to initialize network detection without returning the value
 * Use this in components that need to ensure network detection runs
 */
export function useNetworkDetection(): void {
  useEffect(() => {
    // Check if already cached and valid
    const cached = getNetworkQualityFromCache();
    if (cached) {
      return; // Still valid, no need to detect again
    }

    // Run detection and cache result
    const quality = detectNetworkQuality();
    cacheNetworkQuality(quality);
  }, []);
}
