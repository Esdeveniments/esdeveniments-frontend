# Logto authentication setup

The frontend authenticates users with **Logto** via the OIDC Authorization
Code + PKCE flow, called directly against Logto's endpoints — **no `@logto/*`
SDK** (zero client-bundle cost). Sign-in/up, password reset, email
verification and MFA all live on Logto's hosted pages. We only hold the
session in HttpOnly cookies and read the user from the verified id_token.

## How the flow works

- `GET /api/auth/sign-in` → builds PKCE + state + nonce (short-lived HttpOnly
  cookies), redirects to Logto's authorize endpoint. Carries `ui_locales` so
  the hosted page matches the user's language.
- `GET /api/auth/callback` → verifies `state`, exchanges the code for tokens,
  **verifies the id_token signature against the issuer JWKS** (ES384 — see
  below), stores tokens in HttpOnly cookies, redirects back.
- `GET /api/auth/me` → returns the user derived from the **verified id_token**
  (no userinfo call), refreshing transparently when it expires.
- `GET /api/auth/sign-out` → clears cookies and ends the Logto session.
- `/iniciar-sessio` (any locale) is redirected into the flow by `proxy.ts`.

The locale-prefixed `/iniciar-sessio` redirect lives in `proxy.ts`, not a page,
because `cacheComponents` would otherwise prerender a page `redirect()` into a
meta-refresh.

### id_token is ES384, not RS256

The self-hosted Logto signs id_tokens with **ES384 (ECDSA P-384)**. The
verifier (`lib/auth/logto.ts`) supports ES256/384/512 and RS256/384/512 and
uses IEEE-P1363 signature encoding for ECDSA. Don't assume RS256.

### Access token vs id_token

When `LOGTO_API_RESOURCE` is set, the **access token** is a JWT scoped to that
resource (`aud=<resource>`) — it is **not** valid at Logto's userinfo
endpoint. That's why the session/user is derived from the **id_token**, leaving
the access-token cookie (`auth_token`) free to be the bearer the backend
validates via JWKS. Backend check: `iss = <LOGTO_ENDPOINT>/oidc`,
`aud = <LOGTO_API_RESOURCE>`, signature via `<LOGTO_ENDPOINT>/oidc/jwks`.

## Environment variables (all runtime, never `NEXT_PUBLIC_`)

| Var | Required | Notes |
|-----|----------|-------|
| `LOGTO_ENDPOINT` | yes | Instance base URL, e.g. `https://auth-preproduction.esdeveniments.cat`. HTTPS enforced in production. |
| `LOGTO_APP_ID` | yes | The Traditional Web app's ID for this environment. |
| `LOGTO_APP_SECRET` | yes | The app secret. Note: Logto secrets can start with `#` — **quote the value** in dotenv files. |
| `LOGTO_API_RESOURCE` | no | Backend API resource indicator. Makes the access token a backend-validatable JWT. |
| `LOGTO_API_SCOPES` | no | Space-separated API scopes requested alongside the resource. |
| `LOGTO_COOKIE_SECRET` | recommended | ≥32 chars. Encrypts session cookies at rest (AES-256-GCM). Unset → plaintext (a prod warning logs). |

## Best practice: one instance per environment

Use a **separate Logto instance per environment** (production, staging,
preproduction), each with its own database, users and signing keys, and **one
frontend app per instance**.

Do **not** create per-environment apps inside a single instance — they share
the user pool and signing keys, so it's fake isolation (a test signup lands
next to real users; a leaked staging key validates prod tokens).

Current state (Jun 2026): only the **preproduction** instance
(`auth-preproduction.esdeveniments.cat`) is deployed. It backs **dev +
staging**. Production auth is **pending a production Logto instance**
(`auth.esdeveniments.cat`); until it exists, do not mint prod secrets in the
preproduction instance.

### Per-app setup (each environment)

1. Create a **Traditional Web** application.
2. Redirect URIs: `<origin>/api/auth/callback` for every origin that env serves.
3. Post sign-out redirect URIs: `<origin>/`.
4. Copy App ID + secret into that environment's secret store.

Logto requires **exact** redirect URIs (no wildcards), so Vercel preview
deploys with dynamic `*.vercel.app` URLs can't complete the flow unless
previews use a fixed domain.

## The 5 secret locations (keep in sync)

Per `.github/skills/env-variable-management`, every `LOGTO_*` var must be set in:

1. **Code** — read via `process.env` (`lib/auth/logto.ts`, fail-fast).
2. **Env files** — `.env.example` (committed placeholders) and the gitignored
   `.env.development` / `.env.staging` / `.env.production` (`env-cmd` builds).
3. **Coolify** — runtime env on the staging + production apps.
4. **Deploy / CI workflows** — `prod-arch-smoke.yml` boots the auth routes and
   asserts `/api/auth/sign-in` → 307, so a missing `LOGTO_*` fails CI.
5. **GitHub Secrets** — `LOGTO_*_STAGING` (and `LOGTO_*` for prod once it exists).

## CI guard

`prod-arch-smoke.yml` starts the app against Redis with the staging Logto env
and asserts `/api/auth/sign-in` returns a 307 to `/oidc/auth`. Because
`getLogtoConfig()` throws on any missing `LOGTO_*`, a forgotten or typo'd
secret turns into a 500 and fails the PR before deploy.
