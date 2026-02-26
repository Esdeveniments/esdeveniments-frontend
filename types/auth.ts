export type AuthMethod =
  | "credentials"
  | "magic-link"
  | "oauth-google"
  | "oauth-github"
  | "passwordless";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
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

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: AuthErrorCode;
  requiresVerification?: boolean;
}

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
