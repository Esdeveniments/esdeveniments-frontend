import type { AuthRole } from "../auth";

/** Backend DTO: GET /api/users/{username} response.
 *  `pictureUrl` and `createdAt` are sent by the backend but were previously
 *  stripped by the Zod schema — now parsed and forwarded to the profile UI. */
export interface UserPublicResponseDTO {
  id: string;
  name: string;
  username: string;
  pictureUrl?: string;
  createdAt?: string; // ISO date-time
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
  role?: AuthRole;
  lastLoginAt?: string;
}
