import type {
  AuthAdapter,
  AuthResult,
  AuthUser,
  AuthUnsubscribe,
  LoginCredentials,
  RegisterCredentials,
  MockAuthUser,
  MockAdapterOptions,
} from "types/auth";

export function createMockAdapter(
  options: MockAdapterOptions = {}
): AuthAdapter {
  const {
    supportedMethods = ["credentials"],
    delay = 300,
    preloadUsers = [],
  } = options;

  const users = new Map<string, MockAuthUser>();
  const listeners = new Set<(user: AuthUser | null) => void>();
  let currentUser: AuthUser | null = null;

  for (const u of preloadUsers) {
    users.set(u.email, {
      password: u.password,
      user: {
        id: crypto.randomUUID(),
        email: u.email,
        displayName: u.displayName,
      },
    });
  }

  const wait = () => new Promise<void>((r) => setTimeout(r, delay));

  const notify = (user: AuthUser | null) => {
    for (const cb of listeners) cb(user);
  };

  return {
    supportedMethods,

    async login(credentials: LoginCredentials): Promise<AuthResult> {
      await wait();
      const entry = users.get(credentials.email);
      if (!entry || entry.password !== credentials.password) {
        return { success: false, error: "invalid-credentials" };
      }
      currentUser = entry.user;
      notify(currentUser);
      return { success: true, user: entry.user };
    },

    async register(credentials: RegisterCredentials): Promise<AuthResult> {
      await wait();
      if (users.has(credentials.email)) {
        return { success: false, error: "email-taken" };
      }
      const user: AuthUser = {
        id: crypto.randomUUID(),
        email: credentials.email,
        displayName: credentials.displayName,
      };
      users.set(credentials.email, {
        password: credentials.password ?? "",
        user,
      });
      currentUser = user;
      notify(currentUser);
      return { success: true, user };
    },

    async logout(): Promise<void> {
      currentUser = null;
      notify(null);
    },

    async getSession(): Promise<AuthUser | null> {
      return currentUser;
    },

    onAuthStateChange(
      callback: (user: AuthUser | null) => void
    ): AuthUnsubscribe {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
