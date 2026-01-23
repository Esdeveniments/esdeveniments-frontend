import type { RevalidatableTag } from "types/cache";

/**
 * Cloudflare cache purge result
 */
export interface CloudflarePurgeResult {
  /** Whether the purge was executed successfully */
  purged: boolean;
  /** URL prefixes that were purged */
  prefixes?: string[];
  /** Whether purge was skipped (e.g., not configured) */
  skipped?: boolean;
  /** Error message if purge failed */
  error?: string;
}

/**
 * Response DTO for POST /api/revalidate endpoint
 */
export interface RevalidateResponseDTO {
  /** Whether revalidation was triggered */
  revalidated: boolean;
  /** Cache tags that were revalidated */
  tags: RevalidatableTag[];
  /** Cloudflare CDN purge result */
  cloudflare: CloudflarePurgeResult;
  /** ISO 8601 timestamp of revalidation */
  timestamp: string;
  /** Warning message for transient errors (e.g., DynamoDB tag cache failures) */
  warning?: string;
}
