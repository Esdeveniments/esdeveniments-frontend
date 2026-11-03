import "server-only";
import { captureException } from "@sentry/nextjs";
import { buildEventCdnTags, cdnTag, getCdnHost } from "@lib/cdn/cache-tags";
import { getCloudflarePurgeConfig } from "@lib/cdn/cloudflare-config";
import { parseCloudflarePurgeResponse } from "@lib/validation/cloudflare";
import { safeFetch } from "@utils/safe-fetch";
import type {
  CloudflarePurgeConfig,
  CloudflarePurgeOutcome,
  CloudflarePurgeTarget,
  EventCdnScope,
} from "types/cdn";

const PURGE_TIMEOUT_MS = 10_000;
// Free plan: 100 tags or prefixes per request, 5 requests/min (bucket of 25),
// shared by every purge on the account. Callers send one request per change.
const MAX_ITEMS_PER_REQUEST = 100;

/** `<host>:html`: every public HTML page of this deployment. */
export function getAllHtmlCdnTag(): string | null {
  const host = getCdnHost();
  return host ? cdnTag(host, "html") : null;
}

function chunk(items: readonly string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < items.length; i += MAX_ITEMS_PER_REQUEST) {
    chunks.push(items.slice(i, i + MAX_ITEMS_PER_REQUEST));
  }
  return chunks;
}

export function buildPurgeBodies(
  target: CloudflarePurgeTarget,
): Record<string, unknown>[] {
  if ("purgeEverything" in target) return [{ purge_everything: true }];
  if ("tags" in target) return chunk([...new Set(target.tags)]).map((tags) => ({ tags }));
  return chunk([...new Set(target.prefixes)]).map((prefixes) => ({ prefixes }));
}

async function sendPurge(
  { zoneId, apiToken }: CloudflarePurgeConfig,
  body: Record<string, unknown>,
): Promise<string | null> {
  const { data, error, status } = await safeFetch<unknown>(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      timeout: PURGE_TIMEOUT_MS,
      context: { tags: { section: "cdn-purge" } },
    },
  );
  // safeFetch already reported non-OK, timeout and network errors to Sentry.
  if (error) {
    return status ? `Cloudflare purge failed: ${status}` : error.message;
  }

  const apiErrors = parseCloudflarePurgeResponse(data);
  if (apiErrors === null || apiErrors.length > 0) {
    const message = `Cloudflare purge rejected: ${
      apiErrors?.join("; ") ?? "unexpected response"
    }`;
    captureException(new Error(message), {
      tags: { section: "cdn-purge" },
      extra: { purgeKind: Object.keys(body)[0] },
    });
    return message;
  }
  return null;
}

/**
 * Purge Cloudflare's cache. Never throws: a failed purge must not fail the
 * caller, the pages then expire on their own `s-maxage`.
 */
export async function purgeCloudflareCache(
  target: CloudflarePurgeTarget,
): Promise<CloudflarePurgeOutcome> {
  const config = getCloudflarePurgeConfig();
  if (!config) return { success: true, skipped: true };

  const bodies = buildPurgeBodies(target);
  if (bodies.length === 0) return { success: true, skipped: true };

  for (const body of bodies) {
    const error = await sendPurge(config, body);
    if (error) return { success: false, error };
  }
  return { success: true };
}

/**
 * Clear every CDN-cached page that lists or shows these events. Call it from
 * `after()` once the change is saved and Next's own caches are expired, so
 * Cloudflare's next fetch gets fresh HTML. Pass the old and new event on edit.
 */
export async function purgeEventPagesFromCdn(
  events: readonly (EventCdnScope | null | undefined)[],
): Promise<CloudflarePurgeOutcome> {
  const tags = buildEventCdnTags(getCdnHost(), events);
  return purgeCloudflareCache({ tags });
}
