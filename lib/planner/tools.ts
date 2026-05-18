import { fetchEventsExternal } from "@lib/api/events-external";
import { filterActiveEvents } from "@utils/event-helpers";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { FetchEventsParams } from "types/event";
import {
  SearchEventsArgsSchema,
  type PlannerEventCompact,
  type SearchEventsArgs,
  type SearchEventsResult,
} from "types/planner";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function toCompact(event: EventSummaryResponseDTO): PlannerEventCompact {
  return {
    slug: event.slug,
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime,
    city: event.city?.name ?? null,
    region: event.region?.name ?? null,
    categories: event.categories.map((c) => c.slug),
    type: event.type,
    location: event.location,
  };
}

export async function runSearchEvents(
  rawArgs: unknown,
): Promise<SearchEventsResult> {
  const parsed = SearchEventsArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      events: [],
      total: 0,
      note: `Invalid arguments: ${parsed.error.message}`,
    };
  }
  const args: SearchEventsArgs = parsed.data;
  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const params: FetchEventsParams = {
    page: 0,
    size: limit,
    place: args.place,
    category: args.category,
    term: args.term,
    byDate: args.byDate,
    from: args.from,
    to: args.to,
    type: args.type,
  };

  const paged = await fetchEventsExternal(params);
  const active = filterActiveEvents(paged.content);
  return {
    events: active.slice(0, limit).map(toCompact),
    total: paged.totalElements,
    note:
      active.length === 0
        ? "No s'han trobat esdeveniments amb aquests criteris. Suggereix afinar la cerca."
        : undefined,
  };
}
