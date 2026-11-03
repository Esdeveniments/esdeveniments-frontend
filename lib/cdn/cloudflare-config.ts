import type { CloudflarePurgeConfig } from "types/cdn";

// Kept apart from cloudflare-purge.ts so /api/health can read it without
// bundling Sentry, safeFetch and Zod.
export function getCloudflarePurgeConfig(): CloudflarePurgeConfig | null {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  return zoneId && apiToken ? { zoneId, apiToken } : null;
}

export function isCloudflarePurgeConfigured(): boolean {
  return getCloudflarePurgeConfig() !== null;
}
