import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "./event";

/** Backend DTO: GET /api/users/me/favorites/events/{eventId} response */
export interface FavoriteStatusResponseDTO {
  favorite: boolean;
}

/** Backend DTO: GET /api/users/me/favorites/events response */
export type FavoriteEventsPageDTO =
  PagedResponseDTO<EventSummaryResponseDTO>;

/**
 * Per-slug outcome of the guest → server favorites migration.
 *  - "migrated": POSTed successfully to the backend.
 *  - "dropped":  backend returned 404, event is gone — safe to forget.
 *  - "failed":   transient error (5xx, network, unknown) — retry next login.
 */
/** Generic shape returned by mutation wrappers in lib/api/*-external. */
export interface MutationResultDTO {
  ok: boolean;
  status: number;
}

export type FavoriteMigrationSlugResult =
  | { kind: "migrated"; slug: string }
  | { kind: "dropped"; slug: string }
  | { kind: "failed"; slug: string };
