import { z } from "zod";
import type {
  FavoriteEventsPageDTO,
  FavoriteStatusResponseDTO,
} from "types/api/favorites";

export const FavoriteStatusResponseDTOSchema = z.object({
  favorite: z.boolean(),
});

// Minimal validation for the paged favorites response.
// We do not redeclare the full EventSummaryResponseDTO schema here — the
// page wrapper is the load-bearing shape; per-event validation is the
// responsibility of consumers that need it.
export const FavoriteEventsPageDTOSchema = z.object({
  content: z.array(z.unknown()),
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
  return result.data as FavoriteEventsPageDTO;
}
