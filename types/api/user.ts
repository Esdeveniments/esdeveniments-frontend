/** Backend DTO: GET /api/users/{username} response */
export interface UserPublicResponseDTO {
  id: string;
  name: string;
  username: string;
}

export type PictureSource = "LOGTO" | "CUSTOM";

/** Backend DTO: GET /api/auth/me response (authenticated session profile). */
export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  name: string;
  username: string;
  pictureUrl?: string;
  pictureSource?: PictureSource;
  role?: "USER" | "ADMIN" | "ORGANIZATION";
  lastLoginAt?: string;
}
