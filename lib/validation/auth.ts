import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  token: z.string(),
  expiresAt: z.string(),
  requiresVerification: z.boolean().optional(),
});

export const AuthErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export function parseAuthResponse(data: unknown) {
  const result = AuthResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseAuthUser(data: unknown) {
  const result = AuthUserSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseAuthError(data: unknown): string | null {
  const result = AuthErrorSchema.safeParse(data);
  return result.success ? result.data.error : null;
}
