/**
 * Utility functions for intelligent image quality selection
 * Optimized for performance with external images based on 2024 best practices
 */

import { QualityOptions, QualityPreset } from "types/common";
import { NetworkQuality } from "types/common";

/**
 * Determines optimal image quality based on context
 * Research-based approach for external images:
 * - External images: 50-55 quality (optimized for performance vs quality balance)
 * - LCP external images: 60-65 quality (critical loading performance)
 * - Mobile/slow networks: 45-50 quality (bandwidth conservation)
 *
 * Updated based on Lighthouse analysis showing 159 KiB potential savings
 */
export function getOptimalImageQuality({
  isPriority = false,
  isExternal = true, // Assume external by default for this app
  networkQuality = 70,
  customQuality,
}: QualityOptions): number {
  const clampQuality = (value: number) => Math.max(0, Math.min(value, 100));
  const normalizedNetworkQuality = clampQuality(networkQuality);

  // Use custom quality if explicitly provided
  if (customQuality !== undefined) {
    return clampQuality(customQuality);
  }

  // For external images, use optimized quality settings for performance
  if (isExternal) {
    if (isPriority) {
      // LCP external images: 55-60 quality for critical loading (lowered to trim mobile payloads)
      return 55;
    } else {
      // For regular external images, use network-based quality, capped for performance.
      // Lowered cap to 45 to reduce payload on listing cards (Lighthouse flagged oversized downloads).
      return Math.min(normalizedNetworkQuality, 45);
    }
  }

  // For internal images (rare in this app), use network-based quality
  return normalizedNetworkQuality;
}

// Network-aware quality mapping
const QUALITY_MAP: Record<NetworkQuality, number> = {
  high: 85,
  medium: 70,
  low: 45,
  unknown: 70, // Default to medium quality
};

export function getServerImageQuality(networkQuality?: NetworkQuality): number {
  const clampQuality = (value: number) => Math.max(0, Math.min(value, 100));
  return clampQuality(QUALITY_MAP[networkQuality || "unknown"]);
}

/**
 * Quality presets for common scenarios
 * Optimized based on Lighthouse performance analysis
 */
export const QUALITY_PRESETS = {
  LCP_EXTERNAL: 60, // LCP external images (reduced from 70)
  EXTERNAL_HIGH: 50, // High-quality external images (reduced from 65)
  EXTERNAL_STANDARD: 45, // Regular external images (reduced from 60)
  EXTERNAL_MOBILE: 40, // Mobile/slow connections (reduced from 55)
  INTERNAL_HIGH: 80, // Internal high-quality images (unchanged)
  INTERNAL_STANDARD: 75, // Internal standard images (unchanged)
  EMERGENCY: 35, // Emergency/breaking news - maximum speed (reduced from 50)
} as const;

/**
 * Get quality preset by name
 */
export function getQualityPreset(preset: QualityPreset): number {
  const presetMap = {
    LCP_EXTERNAL: QUALITY_PRESETS.LCP_EXTERNAL,
    EXTERNAL_HIGH: QUALITY_PRESETS.EXTERNAL_HIGH,
    EXTERNAL_STANDARD: QUALITY_PRESETS.EXTERNAL_STANDARD,
    INTERNAL_HIGH: QUALITY_PRESETS.INTERNAL_HIGH,
    INTERNAL_STANDARD: QUALITY_PRESETS.INTERNAL_STANDARD,
    NETWORK_SLOW: QUALITY_PRESETS.EXTERNAL_MOBILE,
    NETWORK_FAST: QUALITY_PRESETS.INTERNAL_HIGH,
    EMERGENCY: QUALITY_PRESETS.EMERGENCY,
  };

  return presetMap[preset] || QUALITY_PRESETS.EXTERNAL_STANDARD;
}

/**
 * Get optimized sizes attribute based on component usage context
 * Based on actual usage patterns from the Lighthouse analysis
 */
export const getOptimalImageSizes = (
  context: "card" | "hero" | "list" | "detail" = "card"
): string => {
  const sizesMap = {
    // Event cards in listings (most common usage)
    card: "(max-width: 540px) 92vw, (max-width: 768px) 45vw, (max-width: 1024px) 33vw, 25vw",
    // Hero/featured images
    hero: "(max-width: 768px) 100vw, (max-width: 1024px) 75vw, 50vw",
    // List view / horizontal cards: tighter sizes to avoid over-downloading on desktop
    list: "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw",
    // Detail page images
    detail: "(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 40vw",
  };

  return sizesMap[context];
};
