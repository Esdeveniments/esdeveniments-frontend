import { z } from "zod";
import { parsePagedEvents } from "@lib/validation/event";
import type {
  FavoriteEventsPageDTO,
  FavoriteStatusResponseDTO,
} from "types/api/favorites";

export const FavoriteStatusResponseDTOSchema = z.object({
  favorite: z.boolean(),
});

export function parseFavoriteStatus(
  input: unknown
): FavoriteStatusResponseDTO | null {
  const result = FavoriteStatusResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseFavoriteStatus: invalid payload", result.error);
    return null;
  }
  return result.data;
}

/**
 * The favorites paged response is structurally identical to
 * `PagedResponseDTO<EventSummaryResponseDTO>` — delegate to the canonical
 * event validator so item shape is enforced fully, not just `id`+`slug`.
 */
export function parseFavoriteEventsPage(
  input: unknown
): FavoriteEventsPageDTO | null {
  return parsePagedEvents(input);
}
