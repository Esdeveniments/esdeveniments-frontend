/**
 * Get the site URL based on the environment
 * @returns The appropriate site URL for localhost, preview/development, or production
 */
export function getSiteUrl(): string {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
  ) {
    return "https://esdeveniments.vercel.app";
  }

  return "https://www.esdeveniments.cat";
}

// Keep the const for backward compatibility
export const siteUrl = getSiteUrl();
