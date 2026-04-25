export type AuthMethod =
  | "credentials"
  | "magic-link"
  | "oauth-google"
  | "oauth-github"
  | "passwordless";

export type AuthRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  profileSlug?: string;
  role?: AuthRole;
  emailVerified?: boolean;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: AuthErrorCode | null;
}

export type AuthErrorCode =
  | "invalid-credentials"
  | "email-taken"
  | "weak-password"
  | "network-error"
  | "not-configured"
  | "rate-limited"
  | "email-not-verified"
  | "account-locked"
  | "unknown";

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials {
  email: string;
  password?: string;
  displayName?: string;
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: AuthErrorCode;
  message?: string;
  requiresVerification?: boolean;
}

export type { AuthResponseDTO, AuthenticatedUserDTO, AuthMessageResponseDTO } from "./api/auth";

export type AuthUnsubscribe = () => void;

export interface AuthAdapter {
  readonly supportedMethods: readonly AuthMethod[];
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(credentials: RegisterCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(
    callback: (user: AuthUser | null) => void
  ): AuthUnsubscribe;
}

export interface MockAuthUser {
  password: string;
  user: AuthUser;
}

export interface MockAdapterOptions {
  supportedMethods?: AuthMethod[];
  delay?: number;
  preloadUsers?: Array<{
    email: string;
    password: string;
    displayName?: string;
    profileSlug?: string;
  }>;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: AuthErrorCode | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  supportedMethods: readonly AuthMethod[];
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(credentials: RegisterCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
}
