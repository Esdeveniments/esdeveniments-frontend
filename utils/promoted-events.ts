import type { EventSummaryResponseDTO } from "types/api/event";

/**
 * Joins promoted lists in priority order (own town first), drops repeats and
 * the event being viewed, and keeps at most `limit`.
 */
export function mergePromotedEvents(
  lists: readonly EventSummaryResponseDTO[][],
  excludeId: string | undefined,
  limit: number,
): EventSummaryResponseDTO[] {
  const seen = new Set<string>(excludeId ? [excludeId] : []);
  const merged: EventSummaryResponseDTO[] = [];
  for (const event of lists.flat()) {
    if (merged.length === limit) break;
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged;
}
