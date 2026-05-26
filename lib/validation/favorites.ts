import { z } from "zod";
import type {
  FavoriteEventsPageDTO,
  FavoriteStatusResponseDTO,
} from "types/api/favorites";

export const FavoriteStatusResponseDTOSchema = z.object({
  favorite: z.boolean(),
});

// We do not redeclare the full EventSummaryResponseDTO schema here — the
// page wrapper is the load-bearing shape. Items are validated as
// object-shaped (with at least `id` + `slug`) so a malformed entry fails
// at parse time rather than crashing the consumer when it reads fields.
const FavoriteEventItemSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
  })
  .passthrough();

export const FavoriteEventsPageDTOSchema = z.object({
  content: z.array(FavoriteEventItemSchema),
  currentPage: z.number().int(),
  pageSize: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
  last: z.boolean(),
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

export function parseFavoriteEventsPage(
  input: unknown
): FavoriteEventsPageDTO | null {
  const result = FavoriteEventsPageDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseFavoriteEventsPage: invalid payload", result.error);
    return null;
  }
  // Items are validated as object-shaped with id + slug at parse time;
  // the full EventSummaryResponseDTO field-by-field schema is owned by
  // consumers that need it (passthrough preserves the remaining fields).
  return result.data as unknown as FavoriteEventsPageDTO;
}
