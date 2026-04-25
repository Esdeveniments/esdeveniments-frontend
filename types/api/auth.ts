import type { AuthRole } from "types/auth";

/** Backend DTO: request body for POST /api/auth/login */
export interface LoginRequestDTO {
  email: string;
  password: string;
}

/** Backend DTO: request body for POST /api/auth/register */
export interface RegisterRequestDTO {
  email: string;
  password: string;
  name: string;
}

/** Backend DTO: what POST /api/auth/login returns */
export interface AuthResponseDTO {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: AuthenticatedUserDTO;
}

/** Backend DTO: what GET /api/auth/me returns */
export interface AuthenticatedUserDTO {
  id: number;
  email: string;
  name: string;
  role: AuthRole;
  emailVerified: boolean;
}

/** Backend DTO: message-only responses (register, forgot, reset, verify) */
export interface AuthMessageResponseDTO {
  message: string;
}

/** Backend DTO: error responses */
export interface AuthErrorDTO {
  error: string;
  message?: string;
}
