---
name: auth-patterns
description: Logto OIDC auth flow, useAuth() contract, session cookies, and the auth-CTA analytics convention. Use for anything touching login/logout, session state, or auth-gated pages/routes.
---

# Auth Patterns Skill

## Purpose

Document how authentication works in this app so new auth-gated features
follow the existing Logto OIDC flow instead of reinventing it, and don't
regress the session-sync and analytics conventions already in place.

## The flow (server-side OIDC, not a client SDK)

We integrate with Logto directly over standard OAuth 2.0 / OpenID Connect —
no `@logto/*` SDK — to keep the client bundle untouched. All of it lives in
`lib/auth/logto.ts` (server-only) and four route handlers:

1. `GET /api/auth/sign-in` — starts Authorization Code + PKCE. Stashes
   `state`/`codeVerifier`/`nonce`/`returnTo` in short-lived HttpOnly cookies,
   redirects to Logto.
2. `GET /api/auth/callback` — verifies `state`, exchanges the code for
   tokens, verifies the `id_token`, sets session cookies, redirects to
   `returnTo` with a one-shot `?auth_success=1` marker. On any failure,
   redirects to `/?auth_error=<reason>` instead (never back to
   `/iniciar-sessio`, which would auto-restart sign-in and loop).
3. `GET /api/auth/sign-out` — clears session cookies, redirects to Logto
   end-session.
4. `GET /api/auth/me` — returns the current session user from the cookies;
   `AuthProvider` calls this once on mount to hydrate client state.

Entry points: `/iniciar-sessio` (proxy-rewritten to `/api/auth/sign-in` — see
`LOGIN_ENTRY_PATTERN` in `proxy.ts`). There is currently **no working
`/registre` route** — it's referenced from `PublishAuthGate` but nothing
serves it. Logto's own hosted UI is where the actual login/signup choice
happens; the app cannot distinguish login vs. signup intent client-side.

## `useAuth()` — the only way client code reads session state

```tsx
const { status, user, isAuthenticated, isLoading, signIn, logout, refetchUser } = useAuth();
```

- `status`: `"loading" | "authenticated" | "unauthenticated"`.
- `signIn(redirectTo?)` / `logout()`: both do a full `window.location.assign`
  to a `/api/auth/*` route — this is a real navigation, not a fetch.
- Never call `/api/auth/*` routes directly from a component; go through
  `useAuth()`.

### The hydrate-once gotcha

`AuthProvider` fetches `/api/auth/me` **exactly once**, on mount. `user`
never updates on its own after that. Any mutation that changes
session-derived fields (profile PATCH, avatar upload/remove) **must** call
`await refetchUser()` afterward — `router.refresh()` is not enough, it only
re-runs Server Component data fetching, and `AuthProvider` sits above the
router boundary. See `EditProfileForm.tsx` / `EditProfileAvatar.tsx` for the
pattern.

## Gating a page or component behind auth

Server pages: check the session cookie server-side (`getAccessTokenFromCookies`
from `@utils/auth-cookies`) and render an `*AuthGate` component when absent —
see `PublishAuthGate.tsx`, `EditProfileAuthGate.tsx`,
`PastFavoritesAuthGate.tsx` for the shape. Client components: use
`useAuth().isAuthenticated` / `.status` — see `ProfileOwnerActions.tsx`,
`ProfileClaimCta.tsx`.

## Auth-CTA analytics: `data-analytics-action`

Every login/logout entry point (auth gates, navbar, footer, inline nudges)
carries `data-analytics-action="<name>"`. One delegated click listener
(`components/analytics/AuthEventTracker.tsx`, mounted once in
`app/[locale]/layout.tsx`) picks up **any** element with that attribute
anywhere in the DOM and fires `auth_gate_click` with `{ action }` — no
per-component wiring needed. When adding a new login/logout touchpoint, just
add the attribute; don't wire a new click handler.

`AuthEventTracker` also fires `auth_success` / `auth_failure` once per page
load, reading the one-shot `auth_success` / `auth_error` query params the
callback route sets.

## Related

- Full Logto instance/env setup: [`docs/logto-auth-setup.md`](../../../docs/logto-auth-setup.md)
- Env vars: `env-variable-management` skill, "Auth (Logto) env vars" section
- Known gotchas (service worker caching `/api/auth/me`, CSRF origin allowlist
  on `/api/favorites`, `request.nextUrl.origin` vs. proxy headers): see
  `LESSONS.md`
