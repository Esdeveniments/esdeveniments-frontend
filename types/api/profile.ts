import type { UserPublicResponseDTO } from "./user";

/**
 * Public user profile DTO.
 * Backend endpoint: GET /api/users/{username}.
 * v1 shape is the minimal `UserPublicResponseDTO`; richer fields
 * (bio, avatar, cover, socials, etc.) will be added as the backend grows.
 */
export type ProfileDetailResponseDTO = UserPublicResponseDTO;
export type ProfileSummaryResponseDTO = UserPublicResponseDTO;
