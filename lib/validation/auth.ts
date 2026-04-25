import { z } from "zod";
import type {
  AuthResponseDTO,
  AuthenticatedUserDTO,
  AuthMessageResponseDTO,
} from "types/api/auth";

const AuthRoleSchema = z.enum(["USER", "ADMIN"]);

/** Schema for backend AuthenticatedUserDTO */
export const AuthenticatedUserDTOSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: AuthRoleSchema,
  emailVerified: z.boolean(),
});

/** Schema for frontend AuthUser (after mapping from backend DTO) */
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: AuthRoleSchema.optional(),
  emailVerified: z.boolean().optional(),
});

/** Schema for POST /api/auth/login response */
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresAt: z.string(),
  user: AuthenticatedUserDTOSchema,
});

/** Schema for message-only responses (register, forgot, reset, verify) */
export const AuthMessageResponseSchema = z.object({
  message: z.string(),
});

/** Schema for backend error responses */
export const AuthErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export function parseAuthResponse(data: unknown): AuthResponseDTO | null {
  const result = AuthResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseAuthUser(data: unknown): AuthenticatedUserDTO | null {
  const result = AuthenticatedUserDTOSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseAuthMessageResponse(
  data: unknown
): AuthMessageResponseDTO | null {
  const result = AuthMessageResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseAuthError(data: unknown): string | null {
  const result = AuthErrorSchema.safeParse(data);
  return result.success ? result.data.error : null;
}
