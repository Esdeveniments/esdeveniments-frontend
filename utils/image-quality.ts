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
  // NOTE: Return values must match allowed qualities in next.config.js: [35, 50, 60, 75, 85]
  if (isExternal) {
    if (isPriority) {
      // LCP external images: 60 quality for critical loading
      return 60;
    } else {
      // For regular external images, use capped quality for performance
      // Capped at 50 to reduce payload on listing cards
      return Math.min(normalizedNetworkQuality, 50);
    }
  }

  // For internal images (rare in this app), use network-based quality
  return normalizedNetworkQuality;
}

// Network-aware quality mapping
// NOTE: Values must match allowed qualities in next.config.js: [35, 50, 60, 75, 85]
const QUALITY_MAP: Record<NetworkQuality, number> = {
  high: 85,
  medium: 75,
  low: 50,
  unknown: 75, // Default to medium quality
};

export function getServerImageQuality(networkQuality?: NetworkQuality): number {
  const clampQuality = (value: number) => Math.max(0, Math.min(value, 100));
  return clampQuality(QUALITY_MAP[networkQuality || "unknown"]);
}

/**
 * Quality presets for common scenarios
 * Optimized based on Lighthouse performance analysis
 * NOTE: Values must match allowed qualities in next.config.js: [35, 50, 60, 75, 85]
 */
export const QUALITY_PRESETS = {
  LCP_EXTERNAL: 60, // LCP external images
  EXTERNAL_HIGH: 50, // High-quality external images
  EXTERNAL_STANDARD: 50, // Regular external images (mapped to allowed 50)
  EXTERNAL_MOBILE: 35, // Mobile/slow connections (mapped to allowed 35)
  INTERNAL_HIGH: 85, // Internal high-quality images (mapped to allowed 85)
  INTERNAL_STANDARD: 75, // Internal standard images
  EMERGENCY: 35, // Emergency/breaking news - maximum speed
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
    // Constrained to max-w-2xl (672px) on desktop, so cap at 672px
    card: "(max-width: 540px) 92vw, (max-width: 768px) 45vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 672px",
    // Hero/featured images
    hero: "(max-width: 768px) 100vw, (max-width: 1024px) 75vw, 50vw",
    // List view / horizontal cards: tighter sizes to avoid over-downloading on desktop
    list: "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw",
    // Detail page images
    detail: "(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 40vw",
  };

  return sizesMap[context];
};
