// Public user profile as returned by GET /api/users/{username}.
// Leaner than ProfileDetailResponseDTO (no bio/cover/social/verified yet) —
// see lib/api/profiles-external.ts for the mapping to the profile view model.
export interface UserPublicResponseDTO {
  id: string; // UUID
  name: string;
  username: string;
  pictureUrl: string | null;
  createdAt: string; // ISO date-time
}
