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

function slugifyUsername(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Pure-diacritic or punctuation-only names would slugify to "", which
  // would create an unroutable mock user (/perfil/) \u2014 fall back to a
  // synthetic id so the preload doesn't quietly break.
  return slug || `user-${crypto.randomUUID().slice(0, 8)}`;
}

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
    const name = u.name ?? u.email.split("@")[0];
    users.set(u.email, {
      password: u.password,
      user: {
        id: crypto.randomUUID(),
        email: u.email,
        name,
        username: u.username ?? slugifyUsername(name),
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
      const name = credentials.name ?? credentials.email.split("@")[0];
      const user: AuthUser = {
        id: crypto.randomUUID(),
        email: credentials.email,
        name,
        username: slugifyUsername(name),
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
