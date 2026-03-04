# Auth System Plan — Provider-Agnostic Frontend

## Goal

Implement login & registration UI in `que-fer` that is **completely agnostic** to the auth provider. The frontend defines an `AuthAdapter` interface (Strategy Pattern). When a provider is chosen later (Supabase, NextAuth, Firebase, custom passwordless, OAuth buttons, etc.), only a single adapter file needs to be written — zero changes to components, pages, or hooks.

---

## Current State

- **No existing auth code** in the codebase — but **empty directory scaffolds** exist at `app/api/auth/{login,signup,logout}/` and `app/api/user/{self,favorites,owned}/` (no `route.ts` files).
- **Backend has no user model**: `esdeveniments-backend` has no Spring Security, no JWT, no user entity, no login endpoints. The only security is HMAC request signing (server-to-server).
- **Cookies in use**: `user_favorites` (httpOnly, 1-year), locale preference (via `proxy.ts`), `visitor_id` (sponsor checkout only). All use `sameSite: "lax"`.
- State management: Zustand store (`store.ts`) for minimal UI state (`openModal`, `hydrated`, `userLocation`).
- Context pattern precedent: `AdContext` in `lib/context/AdContext.tsx` — separate `"use client"` provider with own state, wraps app in `layout.tsx`.
- Reusable `Modal` component exists (`components/ui/common/modal/`) using Headless UI `Dialog`.
- Hooks: `components/hooks/use*.ts` (15 hooks, established naming convention).
- Rate-limiting types exist (`types/rate-limit.ts`) with `RateLimiter` interface.
- All types must live in `types/` (ESLint-enforced).
- Server Components by default; `"use client"` only at leaves.
- Internal links use `Link` from `@i18n/routing` (locales: `ca`, `es`, `en`; default `ca`; prefix `as-needed`).
- All routes use Catalan slugs: `/preferits`, `/publica`, `/qui-som`, `/politica-privacitat`, `/termes-servei`, `/noticies`, `/patrocina`.
- Design system: semantic classes (`.btn-primary`, `.heading-1`, etc.), no `gray-*`.

---

## Open Questions — Answered from Codebase & Best Practices

Each answer below is derived from **what the codebase already does** and **2026 industry best practices**. No assumptions are made — evidence is cited.

### 1. Which auth methods will be supported?

**Answer: The adapter must declare which methods it supports; the UI adapts. No method is hardcoded.**

- **Evidence**: The entire goal is provider-agnosticism. The `AuthAdapter` interface will expose a `supportedMethods` array. The form components render only the UI for methods the active adapter declares.
- **Industry pattern (2026)**: Most auth providers (Supabase, Clerk, Auth.js v5, Firebase) support multiple methods simultaneously. The adapter pattern naturally handles this — each adapter implementation declares its own set.
- **What the frontend needs**: A `AuthMethod` union type covering all _possible_ methods (`"credentials" | "magic-link" | "oauth-google" | "oauth-github" | "passwordless"`). The active adapter picks which subset it supports. Form components conditionally render based on that subset.

### 2. Where is session state stored?

**Answer: httpOnly cookie (set by the adapter/backend), surfaced to React via a dedicated AuthContext.**

- **Evidence**: The codebase already uses httpOnly cookies for `user_favorites` (see `utils/favorites.ts` — `httpOnly: true`, 1-year `maxAge`). The `visitor_id` cookie follows the same pattern in `proxy.ts`. This is the established cookie pattern.
- **Why not localStorage/Zustand**: The existing Zustand store (`store.ts`) explicitly only persists `hydrated` state and is designed for UI-only concerns. Auth tokens in localStorage are vulnerable to XSS. The project's CSP uses `'unsafe-inline'` for scripts, making localStorage tokens especially risky.
- **Why not Zustand**: `store.ts` comments say "minimal state" — auth adds complexity that belongs in its own domain. The `AdContext` pattern (separate React Context for a separate concern) is the established precedent.
- **Adapter responsibility**: The adapter handles the actual cookie/token mechanics (e.g., Supabase manages its own cookie via `@supabase/ssr`; Auth.js uses `next-auth` session cookie). The `AuthProvider` only reads the resulting session state.

### 3. Is server-side session validation needed?

**Answer: Yes, but only for write API routes. Read pages stay static (ISR).**

- **Evidence**: Empty directories already scaffolded at `app/api/auth/login/`, `app/api/auth/signup/`, `app/api/auth/logout/`, `app/api/user/self/`, `app/api/user/favorites/`, `app/api/user/owned/`. This confirms the intent to have server-validated auth endpoints.
- **Critical constraint (from AGENTS.md)**: "NEVER add `searchParams` to listing pages" — listing pages must stay static. Auth-gated data fetching must happen client-side (SWR) or via API routes, never by making page components dynamic.
- **Proxy pattern**: `proxy.ts` already validates HMAC on private API routes and allows public GET routes. Auth validation will follow the same pattern — `proxy.ts` checks the session cookie on protected `/api/user/*` routes.
- **Backend reality**: The `esdeveniments-backend` has **no user model, no Spring Security, no JWT**. Server-side validation on the Next.js side means validating the session cookie (from the auth provider) before proxying to the backend. The backend itself will need auth endpoints added separately.

### 4. What user data do we need?

**Answer: Minimal — `id`, `email`, `displayName` (optional), `avatarUrl` (optional).**

- **Evidence**: The app has no user profiles currently. The scaffolded `app/api/user/self/` suggests a basic user info endpoint. The codebase patterns are minimalistic (see `copilot-instructions.md` §19: "minimalistic code").
- **No roles/permissions yet**: The backend has no role model. The deferred list already excludes RBAC. Keep the `AuthUser` type extensible but minimal.
- **Type definition**: Goes in `types/auth.ts` per governance rules. The `avatarUrl` is optional because not all providers supply one (magic-link/passwordless users typically have no avatar).

### 5. Should there be a "profile" page?

**Answer: Not in this phase. Only login/register pages.**

- **Evidence**: The plan's "What This Does NOT Include" section already defers "Profile page." The scaffolded directories (`app/api/user/self/`) suggest a future profile API but no UI yet.
- **Rationale**: Without backend user endpoints, a profile page has nothing to display. Ship the auth forms first; profile comes when the backend supports it.

### 6. What are the Catalan route slugs?

**Answer: `/iniciar-sessio` (login), `/registre` (register).**

- **Evidence from existing routes**: All user-facing routes use Catalan slugs — `/preferits` (favorites), `/publica` (publish), `/qui-som` (about), `/politica-privacitat` (privacy), `/termes-servei` (terms), `/noticies` (news), `/patrocina` (sponsor), `/compartir-tiktok` (share tiktok). The pattern is consistent Catalan.
- **Why not `/login`**: `/login` is English. Every other route in the app is Catalan. Using `/login` would be inconsistent.
- **Translations**: i18n routing (`next-intl` with `as-needed` prefix strategy) means `/es/iniciar-sesion` and `/en/login` would be handled automatically via route translations if needed later — but the canonical (default `ca`) slugs must be Catalan.

### 7. Should login/register be pages or modals?

**Answer: Full pages, with an optional modal trigger for future use.**

- **Evidence**: The existing generic `Modal` component (`components/ui/common/modal/`) uses Headless UI `Dialog` and is already used for editing events and filters. A login modal _could_ reuse this.
- **Why pages first**: SEO (login/register pages can have `noindex` metadata like `/preferits` does), deep-linkability (redirect to `/iniciar-sessio?redirect=/publica`), and simplicity. The forms are rendered via server component shells (like every other page in the app).
- **Modal later**: The `LoginForm` client component will be self-contained enough to render inside a `Modal` in the future (e.g., "Login to save favorites" prompt).

### 8. Is email verification part of the flow?

**Answer: Delegated entirely to the adapter/provider.**

- **Evidence**: This is provider-specific behavior. Supabase sends verification emails automatically. Auth.js can be configured for it. Firebase has its own flow. The frontend adapter contract needs only an `AuthResult` with a possible `requiresVerification: true` flag so the UI can show a "check your email" message.
- **No email service in the codebase**: The backend has no email sending capability. Verification must come from the auth provider's infrastructure.

### 9. Password requirements?

**Answer: Provider-defined. The frontend does basic client-side validation only (min 8 chars).**

- **Evidence**: Since we don't know the provider yet, the frontend should only enforce minimal UX validation (empty field, minimum length). The real validation happens server-side in the provider.
- **Industry standard (2026)**: NIST 800-63B recommends minimum 8 characters, no complexity rules, no periodic rotation. The adapter can return specific error messages if the provider rejects the password.

### 10. Error message strategy?

**Answer: i18n keys in `messages/*.json` for known errors; fallback to adapter-returned messages.**

- **Evidence**: The app uses `next-intl` with `messages/ca.json`, `messages/es.json`, `messages/en.json`. All user-facing text goes through `useTranslations()` (client) or `getTranslations()` (server). This is enforced project-wide.
- **Pattern**: Define keys like `Auth.errors.invalidCredentials`, `Auth.errors.emailTaken`, `Auth.errors.networkError` in all 3 locale files. The adapter returns error codes (not messages). The UI maps codes to i18n keys. Unknown/provider-specific errors fall back to a generic "something went wrong" i18n key.

### 11. Post-login redirect behavior?

**Answer: Redirect to the page the user came from (stored in a `redirect` query param), fallback to home `/`.**

- **Evidence**: The app's URL-first philosophy (filters in URL segments, not state). A `?redirect=/publica` query param on the login page is clean and SSR-friendly. The `preferits` page already reads server-side data — a logged-in user could be redirected back there.
- **Implementation**: The login page reads `searchParams` (this is allowed — it's NOT a listing page, so no ISR cost concern). On successful login, `router.push(redirect || "/")`.

### 12. Should the Zustand store hold auth state, or a separate React Context?

**Answer: Separate React Context (new `AuthProvider`), following the `AdContext` pattern.**

- **Evidence**: The Zustand store (`store.ts`) is explicitly "minimal state" — `openModal`, `hydrated`, `userLocation`. It uses `persist` with `partialize` to only persist `hydrated`. Auth state has a different lifecycle (session-based, not UI-based) and different persistence needs (cookie, not localStorage).
- **Precedent**: `AdContext` (`lib/context/AdContext.tsx`) is a `"use client"` context provider with its own state management, separate from Zustand. It wraps the app in `layout.tsx`. Auth should follow the identical pattern.
- **Why not Zustand**: Auth state needs to sync with the server (cookie validation). Zustand is client-only with localStorage persistence. A context provider can call `adapter.getSession()` on mount and subscribe to changes — Zustand's `persist` middleware isn't designed for this.

### 13. Protected routes pattern?

**Answer: Not in this phase. Client-side guard component later; never middleware for page protection.**

- **Evidence**: `proxy.ts` handles API route protection (HMAC) and SEO headers, but never redirects users based on auth. Making `proxy.ts` auth-aware would couple it to the provider.
- **Critical constraint**: Adding auth checks in middleware risks making listing pages dynamic (ISR cost incident). Protected routes should use a `<RequireAuth>` client component wrapper that checks `useAuth().isAuthenticated` and redirects client-side.
- **Deferred**: The plan already defers this. For now, auth forms work standalone.

### 14. Rate limiting on auth forms?

**Answer: Yes, on the API routes. The `types/rate-limit.ts` type already exists.**

- **Evidence**: `types/rate-limit.ts` defines `RateLimiter` with `maxRequests`, `windowMs`, and a `check()` method returning a 429 response. This was designed for exactly this use case.
- **Where**: Rate limiting goes on `app/api/auth/login/route.ts` and `app/api/auth/signup/route.ts` (server-side), not on the form components (client-side rate limiting is trivially bypassed).
- **Not in this phase**: Since the API routes are empty scaffolds, rate limiting is implemented when the actual endpoints are built.

### 15. Analytics tracking for auth events?

**Answer: Yes, via `data-analytics-*` attributes (existing pattern), not imperative `gtag()` calls.**

- **Evidence**: The codebase uses `data-analytics-event-slug` attributes on event links (seen in `e2e/favorites.flow.spec.ts`). GA tracking is loaded via `GoogleScripts.tsx` with `strategy="lazyOnload"`. There are no imperative `gtag()` calls in the codebase.
- **Pattern**: Add `data-analytics-action="login"` / `data-analytics-action="register"` to the submit buttons. GA4 can pick these up via enhanced measurement or GTM triggers — no code changes needed.
- **Not in this phase**: Analytics wiring is a polish step after the forms work.

---

## Proposed Architecture

```
types/auth.ts                        ← AuthUser, AuthState, AuthAdapter, AuthMethod types
lib/auth/adapter.ts                  ← AuthAdapter interface + NoopAuthAdapter (placeholder)
lib/auth/AuthProvider.tsx             ← "use client" context provider
components/hooks/useAuth.ts           ← Hook consuming auth context
components/ui/auth/LoginForm.tsx      ← Provider-agnostic login form (client component)
components/ui/auth/RegisterForm.tsx   ← Provider-agnostic register form (client component)
app/iniciar-sessio/page.tsx          ← Login page (server component shell, Catalan slug)
app/registre/page.tsx                ← Register page (server component shell, Catalan slug)
```

### Layer Diagram

```
┌─────────────────────────────────┐
│  Pages (Server Components)      │  app/iniciar-sessio/page.tsx, app/registre/page.tsx
│  - Static shell, SEO metadata   │
└────────────┬────────────────────┘
             │ renders
┌────────────▼────────────────────┐
│  Form Components (Client)       │  LoginForm.tsx, RegisterForm.tsx
│  - UI only, calls useAuth()     │
│  - Renders fields based on      │
│    adapter.supportedMethods     │
└────────────┬────────────────────┘
             │ uses
┌────────────▼────────────────────┐
│  useAuth() Hook                 │  components/hooks/useAuth.ts
│  - Thin wrapper over context    │
└────────────┬────────────────────┘
             │ reads from
┌────────────▼────────────────────┐
│  AuthProvider (Context)         │  lib/auth/AuthProvider.tsx
│  - Holds AuthState              │
│  - Delegates to AuthAdapter     │
│  - Handles session hydration    │
└────────────┬────────────────────┘
             │ delegates to
┌────────────▼────────────────────┐
│  AuthAdapter (Interface)        │  lib/auth/adapter.ts
│  - login(), register(), logout()│
│  - getSession(), onStateChange()│
│  - supportedMethods             │
└────────────┬────────────────────┘
             │ implemented by
┌────────────▼────────────────────┐
│  NoopAuthAdapter (Placeholder)  │  Ships with app, does nothing
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  Future: SupabaseAuthAdapter    │  Swap in when provider chosen
│  Future: NextAuthAdapter        │
│  Future: FirebaseAuthAdapter    │
└─────────────────────────────────┘
```

---

## Implementation Steps (Skill-Compliant)

Each step references the specific skills it must follow.

### Step 1: Define types (`types/auth.ts`)

**Skills**: `type-system-governance`, `pre-implementation-checklist`

- All types in `types/auth.ts` — ESLint enforces no inline types.
- Use `interface` for objects (extendable), `type` for unions.
- Use `unknown` where needed, never `any`.
- Props types for auth components go in `types/props.ts` (e.g., `LoginFormProps`, `RegisterFormProps`).

Types to define:

- `AuthMethod` — `type` union: `"credentials" | "magic-link" | "oauth-google" | "oauth-github" | "passwordless"`
- `AuthUser` — `interface`: `{ id: string; email: string; displayName?: string; avatarUrl?: string }`
- `AuthStatus` — `type` union: `"loading" | "authenticated" | "unauthenticated"`
- `AuthState` — `interface`: `{ status: AuthStatus; user: AuthUser | null; error: AuthErrorCode | null }`
- `AuthErrorCode` — `type` union: `"invalid-credentials" | "email-taken" | "weak-password" | "network-error" | "not-configured" | "unknown"`
- `AuthAdapter` — `interface`: the provider contract (see Step 2)
- `LoginCredentials` — `interface`: `{ email: string; password?: string }` (password optional for magic-link)
- `RegisterCredentials` — `interface`: `{ email: string; password?: string; displayName?: string }`
- `AuthResult` — `interface`: `{ success: boolean; user?: AuthUser; error?: AuthErrorCode; requiresVerification?: boolean }`
- `AuthUnsubscribe` — `type`: `() => void`

### Step 2: Create adapter interface (`lib/auth/adapter.ts`)

**Skills**: `pre-implementation-checklist`, `api-layer-patterns`

- `AuthAdapter` interface contract (imported from `types/auth.ts`):
  ```
  supportedMethods: readonly AuthMethod[]
  login(credentials: LoginCredentials): Promise<AuthResult>
  register(credentials: RegisterCredentials): Promise<AuthResult>
  logout(): Promise<void>
  getSession(): Promise<AuthUser | null>
  onAuthStateChange(callback: (user: AuthUser | null) => void): AuthUnsubscribe
  ```
- `NoopAuthAdapter` implementation: all methods return `{ success: false, error: "not-configured" }`.
- Export a `defaultAdapter` instance.
- Max 100 lines (per §19 mandatory constraint). The adapter + Noop fit easily.
- No external API calls here — adapters are injected, not imported. Future adapters (Supabase, etc.) would use `fetchWithHmac` for internal API routes per `api-layer-patterns`.

### Step 3: Create AuthProvider (`lib/auth/AuthProvider.tsx`)

**Skills**: `react-nextjs-patterns`, `bundle-optimization`

- `"use client"` — required (uses `useState`, `useEffect`, `useCallback`).
- Follows `AdContext` pattern exactly: `createContext` + provider component + consumer hook.
- Uses `useRef` for the subscription cleanup and one-time initialization flag (not `useState` — per hooks best practices).
- `useCallback` for `login`, `register`, `logout` to provide stable references.
- On mount: calls `adapter.getSession()` to hydrate, then subscribes via `adapter.onAuthStateChange()`.
- Returns cleanup function from `useEffect` to unsubscribe.
- SSR hydration safety: initial state is `{ status: "loading", user: null, error: null }` — components show skeleton/nothing until hydrated. No conditional rendering mismatch.
- No barrel file — import directly as `from "@lib/auth/AuthProvider"`.
- Bundle impact: minimal — only React context + one `useEffect`. No external dependencies added.

### Step 4: Create useAuth hook (`components/hooks/useAuth.ts`)

**Skills**: `react-nextjs-patterns`

- Thin context consumer (like `useAdContext`).
- Throws if used outside `AuthProvider` (fail-fast).
- Exposes: `user`, `status`, `isAuthenticated` (derived), `isLoading` (derived), `error`, `login()`, `register()`, `logout()`, `supportedMethods`.
- No state of its own — reads from context only.
- Under 30 lines.

### Step 5: Build form components (`components/ui/auth/`)

**Skills**: `design-system-conventions`, `i18n-best-practices`, `react-nextjs-patterns`, `bundle-optimization`

**LoginForm.tsx** (`"use client"`):

- Uses `useTranslations("Auth")` for all strings — never hardcoded text.
- Uses `Link` from `@i18n/routing` for registration link — never `next/link`.
- Design system classes:
  - `heading-2` for form title
  - `body-normal` for description
  - `label` for form labels
  - `btn-primary` for submit
  - `btn-outline` for OAuth buttons (if supported)
  - `card-bordered` + `card-body` for form container
  - `rounded-input` for form inputs
  - `text-foreground`, `text-foreground/80` — no `gray-*`
  - `stack` for vertical form layout
  - `flex-center` for centered layouts
- Conditionally renders based on `adapter.supportedMethods`:
  - `"credentials"` → email + password fields
  - `"magic-link"` → email field only + "check your email" flow
  - `"oauth-*"` → OAuth button(s)
  - `"passwordless"` → email field only
- Error display: maps `AuthErrorCode` → i18n key → translated string. Unknown codes fall back to `Auth.errors.unknown`.
- `data-analytics-action="login"` on submit button (per Q15).
- Max 100 lines per function — split into sub-components if needed (e.g., `OAuthButtons.tsx`, `CredentialsFields.tsx`).

**RegisterForm.tsx** (`"use client"`):

- Same patterns as LoginForm.
- Additional `displayName` field (optional, only if adapter supports credentials).
- Password min-length validation (8 chars, per NIST 800-63B / Q9).
- `data-analytics-action="register"` on submit button.

**No barrel file** (`index.ts`) for `components/ui/auth/` — each component imported directly to prevent client-reference-manifest bloat across routes.

### Step 6: Create pages (`app/iniciar-sessio/`, `app/registre/`)

**Skills**: `url-canonicalization`, `react-nextjs-patterns`, `i18n-best-practices`

**`app/iniciar-sessio/page.tsx`** (Server Component):

- Async server component — no `"use client"`.
- Uses `getTranslations()` from `next-intl/server` for metadata.
- `robots: "noindex, nofollow"` (like `/preferits`).
- Uses `buildPageMeta()` from `@components/partials/seo-meta` for consistent metadata.
- Renders `<LoginForm />` (the only client island).
- Reads `searchParams.redirect` for post-login redirect — this is allowed (`/iniciar-sessio` is NOT a listing page, no ISR cost risk).
- No data fetching — static shell only.

**`app/registre/page.tsx`** (Server Component):

- Same pattern as login page.
- Renders `<RegisterForm />`.

**CRITICAL**: These pages must NEVER be inside `app/[place]/` — they are top-level routes, not listing pages. No ISR cost risk.

### Step 7: Wire AuthProvider into layout (`app/layout.tsx`)

**Skills**: `react-nextjs-patterns`, `bundle-optimization`

- Add `<AuthProvider>` inside the existing provider stack, wrapping `<BaseLayout>`:
  ```
  <NextIntlClientProvider>
    <AdProvider>
      <AuthProvider>     ← NEW
        <BaseLayout>...</BaseLayout>
      </AuthProvider>    ← NEW
    </AdProvider>
  </NextIntlClientProvider>
  ```
- Import `AuthProvider` directly: `from "@lib/auth/AuthProvider"` — no barrel file.
- Default adapter is `NoopAuthAdapter` (built-in). When a real provider is chosen, swap the adapter prop.
- Bundle impact: `AuthProvider` is a `"use client"` component, but it's tiny (context + one useEffect). No new npm dependencies.

### Step 8: Add i18n keys (`messages/*.json`)

**Skills**: `i18n-best-practices`

- Add `Auth` namespace to all 3 locale files (`ca.json`, `es.json`, `en.json`).
- Keys:
  ```json
  {
    "Auth": {
      "login": {
        "title": "...",
        "submit": "...",
        "noAccount": "...",
        "registerLink": "..."
      },
      "register": {
        "title": "...",
        "submit": "...",
        "hasAccount": "...",
        "loginLink": "..."
      },
      "fields": { "email": "...", "password": "...", "displayName": "..." },
      "errors": {
        "invalidCredentials": "...",
        "emailTaken": "...",
        "weakPassword": "...",
        "networkError": "...",
        "notConfigured": "...",
        "unknown": "..."
      },
      "verification": { "checkEmail": "..." },
      "logout": "..."
    }
  }
  ```
- Check existing keys first (`pre-implementation-checklist`) — reuse `common.submit`, `common.cancel` if they exist.

---

## Step 9: MockAuthAdapter for Testing (No Provider Required)

**Skills**: `testing-patterns`, `react-nextjs-patterns`

The `NoopAuthAdapter` always fails with "not-configured". To test the full auth flow end-to-end **without choosing a provider**, we ship a `MockAuthAdapter` that simulates a working auth system entirely in-memory.

### Purpose

- Verifies the entire pipeline works: forms → hook → context → adapter → state update → UI reaction.
- Usable in Vitest unit tests **and** in dev/preview deployments for manual QA.
- No real backend, no real cookies, no external dependencies.

### File: `lib/auth/mock-adapter.ts`

```typescript
// Simulates in-memory auth with fake users
// Configurable: which methods to support, artificial delay, forced errors

const mockAdapter: AuthAdapter = {
  supportedMethods: ["credentials", "magic-link"], // configurable

  async login({ email, password }) {
    // Simulate network delay
    await delay(500);
    // Check mock user store (Map<email, { password, user }>)
    const entry = mockUsers.get(email);
    if (!entry || entry.password !== password)
      return { success: false, error: "invalid-credentials" };
    currentUser = entry.user;
    notifyListeners(currentUser);
    return { success: true, user: entry.user };
  },

  async register({ email, password, displayName }) {
    await delay(500);
    if (mockUsers.has(email)) return { success: false, error: "email-taken" };
    const user = { id: crypto.randomUUID(), email, displayName };
    mockUsers.set(email, { password: password ?? "", user });
    currentUser = user;
    notifyListeners(currentUser);
    return { success: true, user };
  },

  async logout() {
    currentUser = null;
    notifyListeners(null);
  },

  async getSession() {
    return currentUser;
  },

  onAuthStateChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
```

### Key Properties

- **No npm dependencies** — uses `Map`, `Set`, `crypto.randomUUID()`.
- **Configurable** — pass options: `createMockAdapter({ supportedMethods, delay, preloadUsers })`.
- **Pre-seeded users** — optionally comes with a test user (`test@test.com` / `password123`) for instant manual QA.
- **No persistence** — state resets on page reload (intentional for testing).
- **In-memory listeners** — `onAuthStateChange` works, so `AuthProvider` picks up state changes reactively.

### Usage in Tests (Vitest)

```typescript
// test/auth.test.ts
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@lib/auth/AuthProvider";
import { createMockAdapter } from "@lib/auth/mock-adapter";
import LoginForm from "@components/ui/auth/LoginForm";

describe("Auth Flow", () => {
  it("should show error on invalid credentials", async () => {
    const adapter = createMockAdapter({ supportedMethods: ["credentials"] });
    render(
      <AuthProvider adapter={adapter}>
        <LoginForm />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), "wrong@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/invalid/i)).toBeInTheDocument();
  });

  it("should login successfully with valid credentials", async () => {
    const adapter = createMockAdapter({
      supportedMethods: ["credentials"],
      preloadUsers: [{ email: "user@test.com", password: "password123", displayName: "Test" }],
    });
    render(
      <AuthProvider adapter={adapter}>
        <LoginForm />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    // After login, form should disappear or show welcome
    expect(await screen.findByText(/Test/i)).toBeInTheDocument();
  });

  it("should register a new user", async () => {
    const adapter = createMockAdapter({ supportedMethods: ["credentials"] });
    render(
      <AuthProvider adapter={adapter}>
        <RegisterForm />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "newpassword");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/new@test.com/i)).toBeInTheDocument();
  });

  it("should show email-taken error on duplicate registration", async () => {
    const adapter = createMockAdapter({
      supportedMethods: ["credentials"],
      preloadUsers: [{ email: "taken@test.com", password: "pass" }],
    });
    render(
      <AuthProvider adapter={adapter}>
        <RegisterForm />
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email/i), "taken@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "newpass123");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/taken|already/i)).toBeInTheDocument();
  });

  it("should render magic-link UI when adapter supports it", () => {
    const adapter = createMockAdapter({ supportedMethods: ["magic-link"] });
    render(
      <AuthProvider adapter={adapter}>
        <LoginForm />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("should logout and clear user", async () => {
    const adapter = createMockAdapter({
      supportedMethods: ["credentials"],
      preloadUsers: [{ email: "u@t.com", password: "p" }],
    });
    // ... login first, then click logout, verify user is null
  });
});
```

### Usage for Dev/Preview QA

In `app/layout.tsx`, conditionally use MockAdapter in dev:

```typescript
const adapter =
  process.env.NODE_ENV === "development"
    ? createMockAdapter({
        preloadUsers: [{ email: "dev@test.com", password: "dev" }],
      })
    : noopAdapter; // or real adapter when chosen
```

This lets you manually test login/register forms in `yarn dev` without any backend.

### What This Tests Without a Provider

| Scenario                                          | Covered                        |
| ------------------------------------------------- | ------------------------------ |
| Login with valid credentials                      | ✅                             |
| Login with invalid credentials (error display)    | ✅                             |
| Registration with new email                       | ✅                             |
| Registration with duplicate email (error display) | ✅                             |
| Conditional rendering per `supportedMethods`      | ✅                             |
| State updates (loading → authenticated)           | ✅                             |
| Logout clears state                               | ✅                             |
| `onAuthStateChange` reactive updates              | ✅                             |
| Form validation (empty fields, min-length)        | ✅                             |
| i18n error message mapping                        | ✅                             |
| Post-login redirect (`?redirect=`)                | ✅ (E2E with Playwright)       |
| SSR hydration (no mismatch)                       | ✅ (renders loading initially) |

---

## Step 10: Backend API Contract (Frontend-Defined)

**Skills**: `api-layer-patterns`, `data-validation-patterns`

The backend (`esdeveniments-backend`) has no auth yet. The frontend defines the **exact HTTP contract** it expects. When the backend implements auth, it must match these interfaces. This follows the project's three-layer proxy pattern.

### Architecture (Auth API Layers)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Client Code                                       │
│ AuthAdapter.login() → calls lib/api/auth.ts                │
│ AuthAdapter.register() → calls lib/api/auth.ts             │
│ AuthAdapter.logout() → calls lib/api/auth.ts               │
│ AuthAdapter.getSession() → calls lib/api/auth.ts           │
└─────────────────┬───────────────────────────────────────────┘
                  │ internal fetch (via getInternalApiUrl)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Internal API Routes (app/api/auth/*)              │
│ POST /api/auth/login    → loginExternal()                  │
│ POST /api/auth/signup   → signupExternal()                 │
│ POST /api/auth/logout   → logoutExternal()                 │
│ GET  /api/user/self     → getUserSelfExternal()            │
└─────────────────┬───────────────────────────────────────────┘
                  │ fetchWithHmac (HMAC-signed)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: External Backend (esdeveniments-backend)          │
│ POST /auth/login        → returns AuthResponseDTO          │
│ POST /auth/signup       → returns AuthResponseDTO          │
│ POST /auth/logout       → returns 204                      │
│ GET  /auth/me           → returns UserDTO                  │
└─────────────────────────────────────────────────────────────┘
```

### Backend Endpoints Contract

The frontend expects the backend to implement these **exact** endpoints:

#### `POST /auth/login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response (200):**

```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "displayName": "Albert",
    "avatarUrl": null
  },
  "token": "jwt-or-session-token",
  "expiresAt": "2026-03-26T12:00:00Z"
}
```

**Error Responses:**
| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "invalid-request", "message": "Email is required" }` | Missing/malformed fields |
| 401 | `{ "error": "invalid-credentials", "message": "Incorrect email or password" }` | Wrong credentials |
| 429 | `{ "error": "rate-limited", "message": "Too many attempts" }` | Rate limit exceeded |

#### `POST /auth/signup`

**Request:**

```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "displayName": "Nuria"
}
```

**Success Response (201):**

```json
{
  "user": {
    "id": "uuid-string",
    "email": "newuser@example.com",
    "displayName": "Nuria",
    "avatarUrl": null
  },
  "token": "jwt-or-session-token",
  "expiresAt": "2026-03-26T12:00:00Z",
  "requiresVerification": false
}
```

**Error Responses:**
| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "invalid-request", "message": "Password must be at least 8 characters" }` | Validation failure |
| 409 | `{ "error": "email-taken", "message": "An account with this email already exists" }` | Duplicate email |
| 429 | `{ "error": "rate-limited", "message": "Too many attempts" }` | Rate limit exceeded |

#### `POST /auth/logout`

**Request:** Empty body. The session/JWT token is sent via cookie or Authorization header.

**Success Response (204):** No body.

**Error Responses:**
| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "unauthenticated", "message": "Not logged in" }` | No valid session |

#### `GET /auth/me`

**Request:** No body. Session/JWT token in cookie or Authorization header.

**Success Response (200):**

```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "displayName": "Albert",
  "avatarUrl": "https://..."
}
```

**Error Responses:**
| Status | Body | When |
|--------|------|------|
| 401 | `{ "error": "unauthenticated", "message": "Not logged in" }` | Invalid/expired session |

### Zod Schemas (Frontend Validation)

**File: `lib/validation/auth.ts`**

```typescript
import { z } from "zod";

// Backend response DTOs
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  token: z.string(),
  expiresAt: z.string().datetime(),
  requiresVerification: z.boolean().optional(),
});

export const AuthErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

// Parse functions (safe fallbacks)
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
```

### Types (Frontend ↔ Backend DTO Bridge)

**File: `types/api/auth.ts`** — API-layer DTOs (not the same as `types/auth.ts` which is frontend-only state).

```typescript
// Request DTOs (what the frontend sends)
export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface SignupRequestDTO {
  email: string;
  password: string;
  displayName?: string;
}

// Response DTOs (what the backend returns)
export interface AuthResponseDTO {
  user: UserDTO;
  token: string;
  expiresAt: string;
  requiresVerification?: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthErrorDTO {
  error: string;
  message?: string;
}
```

### External Wrappers (Layer 3)

**File: `lib/api/auth-external.ts`**

Following the exact pattern from `events-external.ts`:

```typescript
import { fetchWithHmac } from "@lib/api/fetch-wrapper";
import {
  parseAuthResponse,
  parseAuthUser,
  parseAuthError,
} from "@lib/validation/auth";
import { captureException } from "@sentry/nextjs";
import type {
  LoginRequestDTO,
  SignupRequestDTO,
  AuthResponseDTO,
} from "types/api/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Env guard pattern (consistent with all external wrappers)

export async function loginExternal(
  credentials: LoginRequestDTO,
): Promise<{ data: AuthResponseDTO | null; errorCode: string | null }> {
  if (!API_URL) return { data: null, errorCode: "not-configured" };

  try {
    const res = await fetchWithHmac(`${API_URL}/auth/login`, {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();

    if (!res.ok) {
      const errorCode = parseAuthError(json);
      return { data: null, errorCode: errorCode ?? "unknown" };
    }

    const data = parseAuthResponse(json);
    return { data, errorCode: data ? null : "unknown" };
  } catch (error) {
    captureException(error, {
      tags: { section: "auth", type: "login-failed" },
    });
    return { data: null, errorCode: "network-error" };
  }
}

export async function signupExternal(
  credentials: SignupRequestDTO,
): Promise<{ data: AuthResponseDTO | null; errorCode: string | null }> {
  if (!API_URL) return { data: null, errorCode: "not-configured" };
  // Same pattern as loginExternal with POST /auth/signup
  // ...
}

export async function logoutExternal(): Promise<void> {
  if (!API_URL) return;
  try {
    await fetchWithHmac(`${API_URL}/auth/logout`, { method: "POST" });
  } catch (error) {
    captureException(error, {
      tags: { section: "auth", type: "logout-failed" },
    });
  }
}

export async function getUserSelfExternal(): Promise<UserDTO | null> {
  if (!API_URL) return null;
  try {
    const res = await fetchWithHmac(`${API_URL}/auth/me`);
    if (!res.ok) return null;
    return parseAuthUser(await res.json());
  } catch (error) {
    captureException(error, {
      tags: { section: "auth", type: "get-user-failed" },
    });
    return null;
  }
}
```

### Internal API Routes (Layer 2)

**File: `app/api/auth/login/route.ts`** (scaffold — implemented when backend is ready):

```typescript
import { NextResponse } from "next/server";
import { loginExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "invalid-request",
          message: "Email and password are required",
        },
        { status: 400 },
      );
    }

    const { data, errorCode } = await loginExternal({ email, password });

    if (!data) {
      const statusMap: Record<string, number> = {
        "invalid-credentials": 401,
        "rate-limited": 429,
        "not-configured": 503,
      };
      return NextResponse.json(
        { error: errorCode },
        { status: statusMap[errorCode ?? ""] ?? 500 },
      );
    }

    // Set session cookie (httpOnly, sameSite lax — matching existing cookie pattern)
    const response = NextResponse.json({ user: data.user }, { status: 200 });
    response.cookies.set("auth_session", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
    // No Cache-Control for auth mutations
  } catch (e) {
    return handleApiError(e, "/api/auth/login", {
      status: 500,
      errorMessage: "Login failed",
    });
  }
}
```

### How the BackendAuthAdapter Connects It

When the backend implements the contract above, a `BackendAuthAdapter` replaces the `MockAuthAdapter`:

```typescript
// lib/auth/backend-adapter.ts (future, when backend is ready)
import type { AuthAdapter } from "types/auth";

export function createBackendAdapter(): AuthAdapter {
  return {
    supportedMethods: ["credentials"],

    async login(credentials) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? "unknown" };
      return { success: true, user: data.user };
    },

    async register(credentials) {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? "unknown" };
      return {
        success: true,
        user: data.user,
        requiresVerification: data.requiresVerification,
      };
    },

    async logout() {
      await fetch("/api/auth/logout", { method: "POST" });
    },

    async getSession() {
      const res = await fetch("/api/user/self");
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },

    onAuthStateChange(callback) {
      // For cookie-based auth, no real-time push.
      // Could poll /api/user/self, or use a BroadcastChannel for multi-tab sync.
      return () => {};
    },
  };
}
```

### Contract Handoff to Backend Team

The backend team needs to implement:

| Endpoint       | Method | Spring Controller | Request DTO                  | Response DTO      | Status Codes       |
| -------------- | ------ | ----------------- | ---------------------------- | ----------------- | ------------------ |
| `/auth/login`  | POST   | `AuthController`  | `LoginRequestDTO`            | `AuthResponseDTO` | 200, 400, 401, 429 |
| `/auth/signup` | POST   | `AuthController`  | `SignupRequestDTO`           | `AuthResponseDTO` | 201, 400, 409, 429 |
| `/auth/logout` | POST   | `AuthController`  | _(session in cookie/header)_ | 204               | 204, 401           |
| `/auth/me`     | GET    | `UserController`  | _(session in cookie/header)_ | `UserDTO`         | 200, 401           |

Backend requirements (not frontend concerns, but documented for alignment):

- **User entity**: `id` (UUID), `email` (unique), `password_hash`, `display_name`, `avatar_url`, `created_at`.
- **Session/JWT**: Backend decides (JWT recommended for stateless, httpOnly cookie for transport). The frontend only cares about the `token` field in `AuthResponseDTO` and the `auth_session` cookie.
- **HMAC**: Auth endpoints must be behind the existing HMAC filter (same as all other endpoints on `pre` profile).
- **Error codes**: Must use the exact `error` field values defined above (`invalid-credentials`, `email-taken`, `weak-password`, `rate-limited`, `unauthenticated`, `invalid-request`). These map directly to frontend i18n keys.

---

## Step 11: UI & Navigation Changes

**Skills**: `react-nextjs-patterns`, `design-system-conventions`, `i18n-best-practices`, `bundle-optimization`, `type-system-governance`

The auth system needs UI integration points beyond the login/register pages. This step covers the navbar, mobile bottom bar, footer, and conditional rendering patterns across the app.

### Current Navigation Structure

```
BaseLayout
├── Navbar (Server Component) → components/ui/common/navbar/index.tsx
│   └── NavbarClient ("use client") → components/ui/common/navbar/NavbarClient.tsx
│        ├── Logo (left)
│        ├── Desktop nav links (center-right): Inici, Agenda, Preferits, Publicar, Notícies
│        ├── LanguageSwitcher (far right)
│        ├── Mobile hamburger button (md:hidden)
│        ├── Fixed bottom tab bar (md:hidden): Home, Agenda, Favorites, Publish(+), News
│        └── Mobile slide-down menu (hamburger panel): same nav items + LanguageSwitcher
├── <main>{children}</main>
├── Footer (Server Component) → components/ui/common/footer/index.tsx
│   └── navigation: Inici, Agenda, Preferits, Publicar, Notícies, Qui som, Patrocina, Contacte, Arxiu, Termes, Privacitat
└── LazySocialFollowPopup
```

**Key fact**: `NavbarClient` is already `"use client"` — no new client boundary needed. Auth UI hooks (`useAuth()`) can be called directly inside it.

### 11.1 — Navbar: Auth Button (Desktop)

**Location**: Right side of desktop nav, between nav links and `LanguageSwitcher`.

**Unauthenticated state** → Show a "Login" button:

```
[Inici] [Agenda] [Preferits] [Publicar] [Notícies]   [Iniciar sessió] [🌐]
```

- Style: `btn-outline` — secondary action, doesn't compete with nav links.
- Uses `Link` from `@i18n/routing` pointing to `/iniciar-sessio`.
- i18n key: `Components.Navbar.auth.login` (e.g., "Iniciar sessió" / "Iniciar sesión" / "Log in").

**Authenticated state** → Show user avatar/initial + dropdown:

```
[Inici] [Agenda] [Preferits] [Publicar] [Notícies]   [👤 ▾] [🌐]
```

- Avatar: circular image (if `user.avatarUrl`) or a circle with the first letter of `displayName` or email.
- Dropdown menu items:
  - ~~Perfil~~ (deferred — no profile page yet)
  - Tanca sessió (logout)
- Style: avatar circle uses `rounded-badge` (full radius), `bg-primary text-primary-foreground` for initial fallback.
- Dropdown uses existing design patterns: `card-bordered card-body` with `shadow-md`.
- Close dropdown on click outside (use `useRef` + `useEffect` for click-away, or Headless UI `Menu`).

### 11.2 — Navbar: Mobile Bottom Tab Bar

The current bottom bar has 5 icons with no space for auth. **Two approaches** (pick one during implementation):

**Option A — Replace one icon contextually** (recommended):

- When **unauthenticated**: Replace the "Preferits" (heart) icon with a "User" icon linking to `/iniciar-sessio`. Rationale: Favorites requires login anyway — showing login is more useful.
- When **authenticated**: Keep the heart icon as-is (favorites). The user can log out from the hamburger menu or desktop dropdown.

**Option B — Add auth icon as 6th item**:

- Adds a `UserCircleIcon` after News. But 6 icons may be tight on small screens (< 360px).

**Recommendation**: Option A — contextual swap. It keeps 5 icons, doesn't shrink touch targets, and guides unauthenticated users toward login.

```
Unauthenticated: [🏠] [📅] [👤 Login]  [➕ Publica] [📰]
Authenticated:   [🏠] [📅] [❤️ Preferits] [➕ Publica] [📰]
```

- i18n keys: `Components.Navbar.auth.login` (reused) and existing `aria.favorites`.
- Icon: `UserCircleIcon` from `@heroicons/react/24/outline` (already imported in project).

### 11.3 — Navbar: Mobile Hamburger Menu

Add auth items at the bottom of the slide-down panel, separated by a `border-t border-border`:

**Unauthenticated**:

```
[Inici]
[Agenda]
[Preferits]
[Publicar]
[Notícies]
─────────────────
[Iniciar sessió]
─────────────────
[🌐 Language]
```

**Authenticated**:

```
[Inici]
[Agenda]
[Preferits]
[Publicar]
[Notícies]
─────────────────
[👤 user@email.com]
[Tanca sessió]
─────────────────
[🌐 Language]
```

- "Iniciar sessió" uses `Link` from `@i18n/routing` → `/iniciar-sessio`.
- "Tanca sessió" calls `useAuth().logout()` onClick.
- User email/name is `body-small text-foreground/60` — informational, not a link (no profile page yet).

### 11.4 — Footer Changes

Add "Iniciar sessió" link to the footer navigation array — **only when unauthenticated**.

**Problem**: The footer is a **Server Component** — it doesn't have access to `useAuth()`.

**Solutions** (pick one):

**Option A — Static link, always visible** (recommended for now):

- Add "Iniciar sessió" to the footer nav array unconditionally. When already logged in, navigating to `/iniciar-sessio` can display "You're already logged in" or redirect to home.
- This keeps the footer as a Server Component (zero bundle impact).

**Option B — Client island in footer**:

- Extract just the auth link as a tiny `"use client"` component (`FooterAuthLink`), render it within the server-rendered footer.
- Minimal footprint but adds a client boundary.

**Recommendation**: Option A. A static link is simpler, SEO-friendly, and matches how all other footer links work. The login page handles the already-logged-in edge case.

### 11.5 — Type Changes Needed

**File: `types/props.ts`** — extend `NavbarLabels` and `NavbarClientProps`:

```typescript
// Add to NavbarLabels:
export interface NavbarLabels {
  // ... existing fields
  login: string; // "Iniciar sessió" / "Log in"
  logout: string; // "Tanca sessió" / "Log out"
  userMenu: string; // aria-label for "User menu"
}

// NavbarClientProps stays the same (no auth state passed as props —
// NavbarClient reads from useAuth() context directly)
```

**Why no auth props on NavbarClientProps**: The Navbar Server Component cannot access auth state (it's session-based, client-side). Instead, `NavbarClient` (already `"use client"`) reads auth state via `useAuth()` hook directly. The only new data from the server is i18n labels (login/logout text), which are just strings.

### 11.6 — Conditional UI Patterns (Other Pages)

Some existing pages may benefit from auth-aware behavior in the future. These are **deferred** but documented for planning:

| Page / Feature   | Current Behavior                            | Auth-Aware Behavior (Future)                                 |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `/preferits`     | Works with cookie-based anonymous favorites | Show "Login to sync favorites across devices" banner         |
| `/publica`       | Open to anyone                              | Optionally require login to publish (via `<RequireAuth>`)    |
| Event detail     | Anyone can view                             | "Save to favorites" shows login tooltip if not authenticated |
| Sponsor checkout | Uses `visitor_id` cookie                    | Associate sponsor with user account                          |

**None of these are in scope for this phase.** They become trivial once `useAuth()` is available — just wrap in a conditional check.

### 11.7 — Login/Register Page Layout

Both pages follow the existing page layout pattern (Server Component shell + client island):

```
┌──────────────────────────────────────────────────────────────────┐
│ Navbar (with login button — will show as active/different)       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│     ┌────────────────────────────────────────────────┐           │
│     │  heading-2: "Iniciar sessió"                   │           │
│     │  body-normal: "Accedeix al teu compte..."      │           │
│     │                                                │           │
│     │  ┌─────────────────────────────────┐           │           │
│     │  │ label: Correu electrònic        │           │           │
│     │  │ [rounded-input email field     ]│           │           │
│     │  │                                 │           │           │
│     │  │ label: Contrasenya              │           │ card-     │
│     │  │ [rounded-input password field  ]│           │ bordered  │
│     │  │                                 │           │           │
│     │  │ [btn-primary:  Iniciar sessió  ]│           │           │
│     │  │                                 │           │           │
│     │  │ ─── o ───                       │           │           │
│     │  │                                 │           │           │
│     │  │ [btn-outline: Continua amb Google] ← if     │           │
│     │  │                                    adapter  │           │
│     │  │                                    supports │           │
│     │  └─────────────────────────────────┘           │           │
│     │                                                │           │
│     │  body-small: "No tens compte?"                 │           │
│     │  Link(@i18n/routing): "Registra't"  → /registre│           │
│     └────────────────────────────────────────────────┘           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Footer                                                           │
└──────────────────────────────────────────────────────────────────┘
```

- Page container: `container py-section-y px-section-x flex-center` (centered card).
- Card width: `max-w-md w-full` (consistent with typical auth forms).
- OAuth divider: "o" text with horizontal rules, uses `body-small text-foreground/60`.
- All text from `useTranslations("Auth")`.

### 11.8 — i18n Keys for Navigation Auth

Add to `messages/*.json` under `Components.Navbar`:

```json
{
  "Components": {
    "Navbar": {
      "auth": {
        "login": "Iniciar sessió",
        "logout": "Tanca sessió",
        "userMenu": "Menú d'usuari"
      }
    }
  }
}
```

And in footer:

```json
{
  "Components": {
    "Footer": {
      "navigation": {
        "login": "Iniciar sessió"
      }
    }
  }
}
```

### 11.9 — Implementation Sequence (Within This Step)

1. Add i18n keys to all 3 locale files (`ca.json`, `es.json`, `en.json`)
2. Extend `NavbarLabels` in `types/props.ts` (add `login`, `logout`, `userMenu`)
3. Update `Navbar` Server Component to pass new labels
4. Update `NavbarClient` to import `useAuth` and conditionally render:
   - Desktop: auth button / avatar dropdown
   - Mobile bottom bar: contextual icon swap
   - Mobile hamburger: auth section
5. Add "Iniciar sessió" link to footer navigation array
6. No new client boundaries needed (NavbarClient is already `"use client"`)

### Implementation Constraints

- **No barrel files** — import `useAuth` directly from `@components/hooks/useAuth`
- **No `UserIcon` import if not used** — only import `UserCircleIcon` from heroicons when needed
- **No `gray-*` colors** — use `text-foreground/60`, `bg-muted`, `border-border`
- **No hardcoded strings** — all text via `useTranslations()` or labels from server
- **Avatar dropdown** — must close on outside click and on route change (reuse `isMenuOpen` pattern with `useRef`)
- **No layout shift** — avatar/button should have fixed dimensions to avoid CLS
- **`Link` from `@i18n/routing`** for all navigation links

---

Cross-check of every relevant skill against the plan:

| Skill                          | Status        | How Addressed                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-implementation-checklist` | ✅            | Steps explicitly require searching for existing patterns before coding. No new utility without checking `utils/`, `lib/`, `types/` first.                                                                                                                       |
| `type-system-governance`       | ✅            | All types in `types/auth.ts` and `types/props.ts`. No inline types. ESLint catches violations. `unknown` over `any`.                                                                                                                                            |
| `react-nextjs-patterns`        | ✅            | Pages are Server Components. Forms are `"use client"` at leaf level. `useRef` for flags. No `next/dynamic` with `ssr: false`. No barrel files. Navbar auth uses existing client boundary (Step 11).                                                             |
| `design-system-conventions`    | ✅            | All UI uses semantic classes: `btn-primary`, `btn-outline`, `heading-2`, `card-bordered`, `rounded-input`, `rounded-badge`, `label`, `stack`, `flex-center`. No `gray-*`. Avatar uses `bg-primary text-primary-foreground`. Nav auth uses `text-foreground/60`. |
| `i18n-best-practices`          | ✅            | `Link` from `@i18n/routing`. `useTranslations("Auth")` in client components. `getTranslations()` in server pages. Keys in all 3 locale files.                                                                                                                   |
| `url-canonicalization`         | ✅            | Auth pages are top-level routes (`/iniciar-sessio`, `/registre`), NOT inside `app/[place]/`. No `searchParams` in listing pages. `?redirect=` on login page is safe (not a listing page).                                                                       |
| `api-layer-patterns`           | ✅            | No direct external API calls. Future auth API will use internal routes (`app/api/auth/*`) → external wrappers with `fetchWithHmac`. NoopAdapter makes no API calls.                                                                                             |
| `security-headers-csp`         | ✅            | No new external domains needed. No inline scripts. Auth cookie is httpOnly (XSS-safe despite `unsafe-inline` CSP). No secrets exposed client-side. Future adapter API calls use `fetchWithHmac`.                                                                |
| `bundle-optimization`          | ✅            | No new npm dependencies. AuthProvider is tiny (~50 lines of client code). Forms are leaf client components. Pages are server-rendered. No barrel files (no manifest bloat).                                                                                     |
| `filter-system-dev`            | N/A           | Auth is not a filter.                                                                                                                                                                                                                                           |
| `service-worker-updates`       | N/A           | No SW changes needed.                                                                                                                                                                                                                                           |
| `env-variable-management`      | ✅ (deferred) | No env vars needed for NoopAdapter. When a real provider is added, its env vars must update 4 locations (code, SST, workflow, GitHub secrets).                                                                                                                  |
| `data-validation-patterns`     | ✅            | Zod schemas defined in `lib/validation/auth.ts` (Step 10): `AuthResponseSchema`, `AuthUserSchema`, `AuthErrorSchema` with parse functions and safe fallbacks. Ready for when backend is live.                                                                   |
| `testing-patterns`             | ✅            | `MockAuthAdapter` (Step 9) enables full Vitest test suite without any provider. Tests cover login, register, errors, conditional rendering, state transitions. E2E with Playwright for redirect flow.                                                           |

---

## Performance Impact Assessment

| Concern                       | Impact                            | Mitigation                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle size**               | ~2-3 KB gzipped (context + forms) | No npm deps added. Server Components for pages. Client code only in leaf forms.                                                                                                                                     |
| **First Load JS**             | Negligible                        | AuthProvider is tiny. Forms only load on `/iniciar-sessio` and `/registre` pages.                                                                                                                                   |
| **Navbar impact**             | ~0 KB added to NavbarClient       | NavbarClient is already `"use client"`. Adding `useAuth()` call + conditional render adds ~20 lines, no new deps. `UserCircleIcon` is already importable from `@heroicons/react/24/outline` (already a dependency). |
| **ISR/Caching**               | Zero risk                         | Auth pages are not listing pages. No `searchParams` in `app/[place]/`.                                                                                                                                              |
| **Client-reference-manifest** | No bloat                          | No barrel files. Direct imports only. Auth components never imported from listing pages.                                                                                                                            |
| **Runtime**                   | One `useEffect` on mount          | `getSession()` call is async. Noop returns immediately. No polling.                                                                                                                                                 |
| **Core Web Vitals**           | No impact                         | No layout shift (loading state). No blocking scripts. No new external resources.                                                                                                                                    |

## Security Considerations

| Concern                      | Approach                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Auth tokens in client**    | Never. httpOnly cookies only (adapter-managed).                                                                                     |
| **XSS risk**                 | CSP uses `unsafe-inline` but tokens are in httpOnly cookies (not accessible to JS).                                                 |
| **CSRF**                     | `sameSite: "lax"` cookies (established pattern). Adapter handles CSRF tokens if needed.                                             |
| **Secrets in client bundle** | None. `AuthAdapter` runs client-side but never handles secrets. Real signing happens server-side in API routes via `fetchWithHmac`. |
| **Rate limiting**            | On API routes (server-side). `RateLimiter` type from `types/rate-limit.ts`. Deferred until real endpoints exist.                    |
| **Session validation**       | Deferred to adapter. No proxy/middleware coupling.                                                                                  |

---

## What This Does NOT Include (Deferred)

- Choosing a specific auth provider
- Backend auth API endpoint **implementation** (contract is defined in Step 10, but no Java code)
- Backend User entity / Spring Security / JWT setup
- Protected route middleware (use client-side `<RequireAuth>` later)
- Profile page (no backend data to display)
- Password reset flow (provider-specific)
- Email verification UI (provider-specific)
- OAuth callback handling (provider-specific)
- Session refresh/token rotation logic (provider-specific)
- Role-based access control (no backend role model)

All of these become trivial to add once the adapter interface is defined and a real provider is plugged in.

---

## Risks & Considerations

- **Over-abstraction**: The adapter interface is intentionally minimal (6 methods + 1 property). If it tries to cover every possible provider pattern upfront, it becomes hard to implement. Start with the smallest useful contract.
- **Server-side auth gap**: The adapter pattern works for client-side state. If server-side session validation is needed (e.g., protecting `app/api/user/*` routes), the adapter pattern may need a server-side counterpart. This is inherently provider-specific — e.g., Supabase uses `createServerClient`, Auth.js uses `getServerSession()`. Cross that bridge when a provider is chosen.
- **SSR hydration mismatch**: Auth state is `"loading"` during SSR. Components must show nothing auth-dependent until client hydration completes. The `status === "loading"` check in `useAuth()` prevents conditional rendering mismatches.
- **NoopAdapter UX**: With the placeholder adapter, login/register forms will show a "not configured" error on submit. This is intentional — it compiles and runs but clearly signals that a real provider is needed.
