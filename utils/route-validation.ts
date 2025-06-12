/**
 * Route validation utilities for blocking invalid system/browser requests
 * from hitting dynamic routes that shouldn't process them.
 */

/**
 * List of invalid place values that should not be processed by dynamic routes
 */
const INVALID_PLACES = [
  ".well-known",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "ads.txt",
  "manifest.json",
] as const;

/**
 * Checks if a place parameter is valid for dynamic route processing
 * @param place - The place parameter from the dynamic route
 * @returns true if the place is valid, false otherwise
 */
export function isValidPlace(place: string): boolean {
  if (!place || typeof place !== "string") {
    return false;
  }

  // Check against known invalid places
  if (INVALID_PLACES.includes(place as any)) {
    return false;
  }

  // Block any place starting with a dot (system files)
  if (place.startsWith(".")) {
    return false;
  }

  // Block any place containing dots (likely file extensions)
  if (place.includes(".")) {
    return false;
  }

  // Block common system paths
  if (place.startsWith("_next") || place.startsWith("api")) {
    return false;
  }

  return true;
}

/**
 * Validates place parameter and throws error if invalid
 * Use this in the main component function
 * @param place - The place parameter from the dynamic route
 * @throws Error if place is invalid
 */
export function validatePlaceOrThrow(place: string): void {
  if (!isValidPlace(place)) {
    console.log(`🚫 Blocking invalid place request: ${place}`);
    throw new Error(`Invalid place: ${place}`);
  }
}

/**
 * Validates place parameter for metadata generation
 * Returns fallback metadata if invalid instead of throwing
 * @param place - The place parameter from the dynamic route
 * @returns Object with validation result and optional fallback metadata
 */
export function validatePlaceForMetadata(place: string): {
  isValid: boolean;
  fallbackMetadata?: {
    title: string;
    description: string;
  };
} {
  if (!isValidPlace(place)) {
    console.log(`🚫 Blocking invalid place in metadata: ${place}`);
    return {
      isValid: false,
      fallbackMetadata: {
        title: "Not Found",
        description: "Page not found",
      },
    };
  }

  return { isValid: true };
}
