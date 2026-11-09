import { revalidatePath, revalidateTag } from "next/cache";
import { deleteEventDetailCache } from "@lib/cache/event-detail-cache";
import { eventTag, eventsTag, eventsCategorizedTag } from "@lib/cache/tags";
import { SUPPORTED_LOCALES } from "types/i18n";

/**
 * Expires the event detail page in every locale, for each slug.
 * revalidatePath matches the route path after rewrites, and proxy.ts rewrites
 * unprefixed URLs to /ca/..., so every locale needs its prefix, even the default.
 */
export function revalidateEventPages(slugs: Iterable<string>): void {
  try {
    for (const slug of new Set(slugs)) {
      for (const locale of SUPPORTED_LOCALES) {
        revalidatePath(`/${locale}/e/${slug}`);
      }
    }
  } catch {
    // revalidatePath is a no-op outside of a render context in some environments
  }
}

/**
 * Expires everything Next holds for these events, from a route handler (server
 * actions use updateTag for read-your-own-writes instead): their data and
 * pages, the event lists, and the in-memory detail cache. `{ expire: 0 }` so a
 * Cloudflare purge that follows can't be refilled with stale HTML.
 */
export function expireEventCaches(slugs: Iterable<string>): void {
  const unique = new Set(slugs);
  for (const slug of unique) {
    revalidateTag(eventTag(slug), { expire: 0 });
    deleteEventDetailCache(slug);
  }
  revalidateTag(eventsTag, { expire: 0 });
  revalidateTag(eventsCategorizedTag, { expire: 0 });
  revalidateEventPages(unique);
}
