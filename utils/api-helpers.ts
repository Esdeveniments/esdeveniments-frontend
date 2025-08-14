/**
 * Shared API utilities for consistent origin resolution across middleware and layout
 * Follows the same fallback strategy as middleware.ts for edge runtime compatibility
 */

/**
 * Get API origin with multiple fallback strategies for Edge Runtime
 * Edge runtime has limitations with environment variables
 */
export function getApiOrigin(): string {
  // Strategy 1: Try environment variable (works in most cases)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      console.warn("Invalid NEXT_PUBLIC_API_URL format:", apiUrl);
    }
  }

  // Strategy 2: Fallback based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    return "https://api.esdeveniments.cat"; // Production API
  }

  // Strategy 3: Default fallback (development/staging)
  return "https://api-pre.esdeveniments.cat";
}
