/**
 * Utility functions for intelligent image quality selection
 * Optimized for performance with external images based on 2024 best practices
 */

import { QualityOptions, QualityPreset } from "types/common";

/**
 * Determines optimal image quality based on context
 * Research-based approach for external images:
 * - External images: 60-70 quality (optimal performance vs quality balance)
 * - LCP external images: 70-75 quality (critical loading performance)
 * - Mobile/slow networks: 50-60 quality (bandwidth conservation)
 */
export function getOptimalImageQuality({
  isPriority = false,
  isExternal = true, // Assume external by default for this app
  networkQuality = 70,
  customQuality,
}: QualityOptions): number {
  // Use custom quality if explicitly provided
  if (customQuality !== undefined) {
    return customQuality;
  }

  // For external images, use research-based quality settings
  if (isExternal) {
    if (isPriority) {
      // LCP external images: 70-75 quality for critical loading
      return 70;
    } else {
      // Regular external images: 60-65 quality for optimal performance
      return 60;
    }
  }

  // For internal images (rare in this app), use network-based quality
  return networkQuality;
}

/**
 * Server-side quality selection (no network detection available)
 * Conservative approach for external images
 */
export function getServerImageQuality({
  isPriority = false,
  isExternal = true,
  customQuality,
}: Omit<QualityOptions, "networkQuality">): number {
  return getOptimalImageQuality({
    isPriority,
    isExternal,
    networkQuality: 70, // Default fallback for server-side
    customQuality,
  });
}

/**
 * Quality presets for common scenarios
 */
export const QUALITY_PRESETS = {
  LCP_EXTERNAL: 70, // LCP external images
  EXTERNAL_STANDARD: 60, // Regular external images
  EXTERNAL_MOBILE: 55, // Mobile/slow connections
  INTERNAL_HIGH: 80, // Internal high-quality images
  INTERNAL_STANDARD: 75, // Internal standard images
  EMERGENCY: 50, // Emergency/breaking news (speed over quality)
} as const;

/**
 * Get quality preset by name
 */
export function getQualityPreset(preset: QualityPreset): number {
  const presetMap = {
    LCP_EXTERNAL: QUALITY_PRESETS.LCP_EXTERNAL,
    EXTERNAL_HIGH: QUALITY_PRESETS.EXTERNAL_STANDARD,
    EXTERNAL_STANDARD: QUALITY_PRESETS.EXTERNAL_STANDARD,
    INTERNAL_HIGH: QUALITY_PRESETS.INTERNAL_HIGH,
    INTERNAL_STANDARD: QUALITY_PRESETS.INTERNAL_STANDARD,
    NETWORK_SLOW: QUALITY_PRESETS.EXTERNAL_MOBILE,
    NETWORK_FAST: QUALITY_PRESETS.INTERNAL_HIGH,
  };

  return presetMap[preset] || QUALITY_PRESETS.EXTERNAL_STANDARD;
}
