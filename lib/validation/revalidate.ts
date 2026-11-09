import { z } from "zod";
import type { EventCdnScope } from "types/cdn";

const slugRef = z.object({ slug: z.string().min(1) }).nullish();

// The event fields that pick its cached pages (see buildEventCdnTags).
const EventCdnScopeSchema = z.object({
  slug: z.string().min(1).max(300),
  city: slugRef,
  region: slugRef,
  province: slugRef,
  owner: z.object({ username: z.string().min(1) }).nullish(),
});

/**
 * Parse the `events` of a POST /api/revalidate body: the events changed
 * outside the portal (the admin dashboard), before and after the change.
 * Returns null when the input isn't 1 to 10 valid events.
 */
export function parseRevalidateEvents(
  input: unknown,
): (EventCdnScope & { slug: string })[] | null {
  const result = z.array(EventCdnScopeSchema).min(1).max(10).safeParse(input);
  return result.success ? result.data : null;
}
