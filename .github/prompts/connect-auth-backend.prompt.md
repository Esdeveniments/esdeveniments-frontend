---
description: Connect the frontend auth system to the real backend API
mode: agent
tools: ["bash", "file_search", "grep", "glob"]
---

# Connect Auth to Backend API

## Git Workflow

**Base branch:** `cursor/development-environment-setup-1108` (the PR #234 branch with the auth adapter pattern)

Before starting any implementation:

```bash
git checkout cursor/development-environment-setup-1108
git pull origin cursor/development-environment-setup-1108
git checkout -b feat/connect-auth-backend
```

When done, push and open a PR targeting `cursor/development-environment-setup-1108`:

```bash
git push -u origin feat/connect-auth-backend
gh pr create --base cursor/development-environment-setup-1108 --title "feat: connect auth to backend API" --body "Implements real AuthAdapter calling backend auth endpoints via three-layer proxy pattern."
```

## Goal

Replace the mock/noop `AuthAdapter` with a real adapter (`api-adapter.ts`) that calls the **esdeveniments backend auth endpoints** via the project's three-layer API proxy pattern. The frontend auth system (adapter → AuthProvider → useAuth) is already wired; we only need to implement the real adapter and its supporting layers.

---

## Backend Auth Endpoints (Preproduction)

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://api-preproduction.esdeveniments.cat`)

All endpoints require HMAC headers (`x-timestamp`, `x-hmac`) — use `fetchWithHmac` from the existing codebase.

### POST `/api/auth/login`

**Request** (`LoginRequestDTO`):
```json
{ "email": "string", "password": "string" }
```

**Response** (`AuthResponseDTO`):
```json
{
  "accessToken": "string",
  "tokenType": "string",
  "expiresAt": "2026-01-01T00:00:00Z",
  "user": {
    "id": 1,
    "email": "string",
    "name": "string",
    "role": "USER" | "ADMIN",
    "emailVerified": true
  }
}
```

### POST `/api/auth/register`

**Request** (`RegisterRequestDTO`):
```json
{ "email": "string", "password": "string", "name": "string" }
```

**Response** (`AuthMessageResponseDTO`):
```json
{ "message": "string" }
```

### GET `/api/auth/me`

Requires `Authorization: Bearer <accessToken>` header.

**Response** (`AuthenticatedUserDTO`):
```json
{
  "id": 1,
  "email": "string",
  "name": "string",
  "role": "USER" | "ADMIN",
  "emailVerified": true
}
```

### POST `/api/auth/password/forgot`

**Request** (`EmailRequestDTO`):
```json
{ "email": "string" }
```

**Response** (`AuthMessageResponseDTO`):
```json
{ "message": "string" }
```

### POST `/api/auth/password/reset`

**Request** (`ResetPasswordRequestDTO`):
```json
{ "token": "string", "newPassword": "string" }
```

**Response** (`AuthMessageResponseDTO`):
```json
{ "message": "string" }
```

### GET `/api/auth/verification/confirm?token=<token>`

**Response** (`AuthMessageResponseDTO`):
```json
{ "message": "string" }
```

### POST `/api/auth/verification/resend`

**Request** (`EmailRequestDTO`):
```json
{ "email": "string" }
```

**Response** (`AuthMessageResponseDTO`):
```json
{ "message": "string" }
```

---

## Existing Frontend Auth Architecture

The auth system uses an **adapter pattern** that decouples the UI from the auth backend:

```
AuthAdapter (interface)  →  AuthProvider (React context)  →  useAuth() hook  →  UI components
```

### Key files

| File | Purpose |
|------|---------|
| `types/auth.ts` | All auth types: `AuthAdapter`, `AuthUser`, `AuthResult`, `LoginCredentials`, `RegisterCredentials`, etc. |
| `lib/auth/AuthProvider.tsx` | React context provider — receives an adapter, exposes `login`, `register`, `logout`, `status`, `user` |
| `lib/auth/adapter.ts` | `noopAdapter` — returns "not-configured" for all operations |
| `lib/auth/mock-adapter.ts` | `createMockAdapter()` — in-memory mock for dev |
| `lib/auth/DevAuthProvider.tsx` | Wraps `AuthProvider` with mock adapter in dev, noop in prod |
| `lib/validation/auth.ts` | Zod schemas: `AuthResponseSchema`, `AuthUserSchema`, `AuthErrorSchema` + parsers |
| `components/hooks/useAuth.ts` | `useAuth()` hook — reads `AuthContext` |
| `components/ui/auth/LoginForm.tsx` | Login form component |
| `components/ui/auth/RegisterForm.tsx` | Register form component |

### Current `AuthUser` type

```typescript
interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  profileSlug?: string;
}
```

### Current `AuthAdapter` interface

```typescript
interface AuthAdapter {
  readonly supportedMethods: readonly AuthMethod[];
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(credentials: RegisterCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): AuthUnsubscribe;
}
```

### Backend `AuthenticatedUserDTO` (what the API returns)

```typescript
{
  id: number;        // Backend uses number, frontend uses string
  email: string;
  name: string;      // Backend uses "name", frontend uses "displayName"
  role: "USER" | "ADMIN";
  emailVerified: boolean;
}
```

---

## Implementation Plan

### 1. Create API external wrapper: `lib/api/auth-external.ts`

Following the three-layer proxy pattern:
- Env guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback
- Use `fetchWithHmac` for all calls (HMAC signing + 10s timeout)
- Parse responses with Zod schemas from `lib/validation/auth.ts`
- Return typed results, never throw on read endpoints

Functions to implement:
- `loginExternal(email, password)` → calls `POST /api/auth/login`
- `registerExternal(email, password, name)` → calls `POST /api/auth/register`
- `getMeExternal(accessToken)` → calls `GET /api/auth/me` with Bearer header
- `forgotPasswordExternal(email)` → calls `POST /api/auth/password/forgot`
- `resetPasswordExternal(token, newPassword)` → calls `POST /api/auth/password/reset`
- `confirmEmailExternal(token)` → calls `GET /api/auth/verification/confirm`
- `resendVerificationExternal(email)` → calls `POST /api/auth/verification/resend`

### 2. Create internal API routes: `app/api/auth/*/route.ts`

- `app/api/auth/login/route.ts` — POST, calls `loginExternal`
- `app/api/auth/register/route.ts` — POST, calls `registerExternal`
- `app/api/auth/me/route.ts` — GET, calls `getMeExternal` (forwards Authorization header)
- `app/api/auth/password/forgot/route.ts` — POST, calls `forgotPasswordExternal`
- `app/api/auth/password/reset/route.ts` — POST, calls `resetPasswordExternal`
- `app/api/auth/verification/confirm/route.ts` — GET, calls `confirmEmailExternal`
- `app/api/auth/verification/resend/route.ts` — POST, calls `resendVerificationExternal`

Cache headers: `no-store` for all auth routes (no caching).

### 3. Create the real adapter: `lib/auth/api-adapter.ts`

Implement `AuthAdapter` that:
- Calls internal API routes (via `fetch` to `/api/auth/*`)
- Stores `accessToken` in memory (NOT localStorage for security) + optionally in an httpOnly cookie via a `/api/auth/session` route
- Maps backend `AuthenticatedUserDTO` → frontend `AuthUser`:
  - `id`: number → string (`String(id)`)
  - `name` → `displayName`
  - `role` / `emailVerified`: store in extended user or separate state
- `getSession()`: calls `/api/auth/me` with stored token
- `onAuthStateChange()`: notifies listeners on login/logout/session changes
- Handles token expiry (`expiresAt`) — clear session when expired

### 4. Update Zod schemas: `lib/validation/auth.ts`

Align schemas with actual backend DTOs:
- `AuthResponseSchema` needs `accessToken`, `tokenType`, `expiresAt`, `user` (with `AuthenticatedUserDTO` shape)
- `AuthenticatedUserDTO` schema: `id` (number), `email`, `name`, `role` (enum), `emailVerified` (boolean)
- Add `AuthMessageResponseSchema`: `{ message: string }`

### 5. Update `types/auth.ts`

- Add `AuthenticatedUserDTO` type matching backend response
- Add `role` field to `AuthUser` (or keep it separate)
- Add `emailVerified` to `AuthUser`
- Consider adding `ForgotPasswordCredentials`, `ResetPasswordCredentials` types
- Add error codes from backend: `"email-not-verified"`, `"account-locked"`, etc.

### 6. Wire up in layout: `app/[locale]/layout.tsx`

Replace `DevAuthProvider` with a production-ready provider:
- In development: keep `DevAuthProvider` (mock adapter)
- In production: use `AuthProvider` with the new `apiAdapter`
- The adapter selection should happen in a single provider component

### 7. Token/session management decisions

Key decisions to make:
- **Token storage**: Memory-only (lost on refresh) vs httpOnly cookie (survives refresh)
  - If cookie: need a `POST /api/auth/session` internal route to set/clear httpOnly cookie
  - If memory: `getSession()` can't restore on page refresh — user appears logged out
- **Token refresh**: Backend doesn't seem to have a refresh endpoint — handle expiry by logging out
- **CSRF protection**: If using cookies, consider CSRF token

### 8. Update HMAC middleware allowlist

In `proxy.ts`, the HMAC middleware likely needs the new `/api/auth/*` routes either:
- Allowlisted (if they're public-facing internal routes called from client)
- Or enforced (if they should only be called from the frontend with HMAC)

Check current allowlist pattern and decide.

---

## Mapping: Backend DTO → Frontend Types

| Backend field | Frontend field | Notes |
|---------------|---------------|-------|
| `AuthenticatedUserDTO.id` (number) | `AuthUser.id` (string) | `String(id)` |
| `AuthenticatedUserDTO.name` | `AuthUser.displayName` | Rename |
| `AuthenticatedUserDTO.email` | `AuthUser.email` | Direct |
| `AuthenticatedUserDTO.role` | `AuthUser.role` (new) | Add to type |
| `AuthenticatedUserDTO.emailVerified` | `AuthUser.emailVerified` (new) | Add to type |
| `AuthResponseDTO.accessToken` | Stored in adapter memory/cookie | Not in AuthUser |
| `AuthResponseDTO.expiresAt` | Used for auto-logout | Track in adapter |

---

## Constraints & Rules

1. **Follow the three-layer proxy pattern** (skill: `api-layer-patterns`):
   - Client code → internal API route → external wrapper with `fetchWithHmac`
2. **All types in `types/`** (skill: `type-system-governance`)
3. **Zod validation** for all API responses (skill: `data-validation-patterns`)
4. **No secrets in client code** — `HMAC_SECRET` stays server-side, token management must be secure
5. **Safe fallbacks** — auth failures should gracefully degrade, not crash the app
6. **Server Components by default** — auth pages are already server components with client form leaves
7. **Use `fetchWithHmac`** for external calls (10s timeout, HMAC signing)
8. **Use `safeFetch`** or plain `fetch` for internal route calls from the client adapter (no HMAC needed client→internal)
9. **Test with Vitest** — add tests for the new adapter and external wrapper

---

## Files to Create

```
lib/api/auth-external.ts          — External wrapper (fetchWithHmac → backend)
lib/auth/api-adapter.ts           — Real AuthAdapter implementation
app/api/auth/login/route.ts       — Internal route: login
app/api/auth/register/route.ts    — Internal route: register
app/api/auth/me/route.ts          — Internal route: get current user
app/api/auth/password/forgot/route.ts   — Internal route: forgot password
app/api/auth/password/reset/route.ts    — Internal route: reset password
app/api/auth/verification/confirm/route.ts  — Internal route: confirm email
app/api/auth/verification/resend/route.ts   — Internal route: resend verification
test/auth-api-adapter.test.ts     — Tests for the real adapter
```

## Files to Modify

```
types/auth.ts                     — Add role, emailVerified, backend DTO types
lib/validation/auth.ts            — Align Zod schemas with real backend DTOs
app/[locale]/layout.tsx           — Wire real adapter in production
proxy.ts                          — Update HMAC middleware allowlist if needed
```
