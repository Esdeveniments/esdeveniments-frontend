import { createKeyedCache } from "@lib/api/cache";
import type { EventDetailResponseDTO } from "types/api/event";

/**
 * In-memory keyed cache for event detail responses by slug.
 *
 * Lives at module scope so it is shared across the internal API route
 * (app/api/events/[slug]/route.ts GET handler) and the edit server action
 * (app/[locale]/e/[eventId]/edita/actions.ts). The edit action must call
 * `deleteEventDetailCache(slug)` after a successful PUT so the next GET
 * does not serve stale data from this 30-min TTL cache.
 *
 * Without this, `updateTag()` / `refresh()` only invalidate Next.js's fetch
 * Data Cache — the in-memory layer would keep returning the pre-edit event
 * for up to 30 minutes, so the user would not see their changes.
 */
const EVENT_DETAIL_TTL_MS = 30 * 60 * 1000; // 30 minutes

const { cache: eventDetailCache, delete: deleteEventDetailCache } =
  createKeyedCache<EventDetailResponseDTO | null>(EVENT_DETAIL_TTL_MS);

export { eventDetailCache, deleteEventDetailCache };
