/**
 * Get the site URL based on the environment
 * @returns The appropriate site URL for localhost, preview/development, or production
 */
export function getSiteUrl(): string {
  // Priority 1: Explicitly set site URL (SST deployments, custom configs)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Priority 2: Vercel deployments
  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
  ) {
    return "https://esdeveniments.vercel.app";
  }

  // Priority 3: Development (non-production)
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // Priority 4: Production fallback
  return "https://www.esdeveniments.cat";
}

// Keep the const for backward compatibility
export const siteUrl = getSiteUrl();
