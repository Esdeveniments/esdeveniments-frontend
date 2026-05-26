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
