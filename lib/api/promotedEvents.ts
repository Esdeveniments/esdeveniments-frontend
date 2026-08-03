import { z } from "zod";
import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
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

  try {
    const apiUrl = getApiUrl();
    const finalUrl = `${apiUrl}/events/promotions/active?${buildScopeQuery(scope)}`;

    const response = await fetchWithHmac(finalUrl, {
      next: { revalidate: 300, tags: ["promoted-events"] },
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
    const parsed = z.array(EventSummaryResponseDTOSchema).safeParse(content);
    if (!parsed.success) {
      console.warn(
        "getActivePromotedEvents: invalid content payload",
        parsed.error,
      );
      return [];
    }

    const events = parsed.data as EventSummaryResponseDTO[];
    return events.map(enhanceEventImage).slice(0, MAX_PROMOTED_EVENTS);
  } catch (error) {
    console.warn("getActivePromotedEvents: fetch failed", error);
    return [];
  }
}
