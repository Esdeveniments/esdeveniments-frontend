import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import {
  EventSummaryResponseDTOSchema,
  enhanceEventImage,
} from "@lib/validation/event";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { PromotionScope } from "types/event";

export type { PromotionScope } from "types/event";

const MAX_PROMOTED_EVENTS = 8;

function buildScopeQuery(scope: PromotionScope): string {
  const params = new URLSearchParams({ scope: scope.type });
  if (scope.type !== "homepage") {
    params.set("slug", scope.slug);
  }
  return params.toString();
}

/**
 * Provisional, isolated contract: the backend endpoint this calls does not exist yet
 * (Gerard's promotion-checkout endpoint shipped in phase 1; the "list active promoted
 * events" read side is still undecided). A field-name or shape mismatch once it ships
 * is a one-file fix, confined to this function.
 */
export async function getActivePromotedEvents(
  scope: PromotionScope,
): Promise<EventSummaryResponseDTO[]> {
  if (process.env.PROMOTED_EVENTS_ENABLED !== "true") {
    return [];
  }

  if (!isApiUrlConfigured()) {
    return [];
  }

  try {
    const apiUrl = getApiUrl();
    const finalUrl = `${apiUrl}/events/promotions/active?${buildScopeQuery(scope)}`;

    // NEVER add `next: { revalidate, tags }` here — external wrappers must not opt
    // into the Next fetch cache (high-cardinality per-scope URLs caused a 146k-entry
    // cache explosion, see docs/incidents/2026-01-20-fetch-cache-explosion.md).
    const response = await fetchWithHmac(finalUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(
        `getActivePromotedEvents: HTTP ${response.status} for ${finalUrl}`,
      );
      return [];
    }

    const data = await response.json();
    const content = Array.isArray(data?.content) ? data.content : [];

    // Validate each item individually rather than the array atomically — one
    // malformed item (wherever it falls in the response) should be dropped,
    // not discard every valid promotion alongside it.
    const events: EventSummaryResponseDTO[] = [];
    let invalidCount = 0;
    for (const item of content) {
      const parsed = EventSummaryResponseDTOSchema.safeParse(item);
      if (parsed.success) {
        events.push(parsed.data as EventSummaryResponseDTO);
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      console.warn(
        `getActivePromotedEvents: dropped ${invalidCount} invalid content item(s)`,
      );
    }

    return events.map(enhanceEventImage).slice(0, MAX_PROMOTED_EVENTS);
  } catch (error) {
    console.warn("getActivePromotedEvents: fetch failed", error);
    return [];
  }
}
