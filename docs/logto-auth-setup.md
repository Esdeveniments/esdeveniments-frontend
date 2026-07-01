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
previews use a fixed domain. Production runs on Coolify/Docker, not Vercel
(see `LESSONS.md`), so treat Vercel auth as opt-in: it needs a stable alias
with its callback registered, the `LOGTO_*` env on the Vercel project, and
the preview protection-bypass so the OIDC round-trip isn't 401-walled.

### Origins to register, per environment

The callback is derived from the request host (`getRequestOrigin`), so each
host that serves the app needs its own exact entries in the instance's app:

| Environment | Origin | Redirect URI | Post sign-out URI |
| --- | --- | --- | --- |
| Local dev | `http://localhost:3000` | `http://localhost:3000/api/auth/callback` | `http://localhost:3000/` |
| PR preview | `https://pr-<id>.esdeveniments.cat` | `…/api/auth/callback` | `…/` |
| Staging | `https://staging.esdeveniments.cat` | `…/api/auth/callback` | `…/` |
| Production | `https://www.esdeveniments.cat` | `…/api/auth/callback` | `…/` (prod instance) |

Production canonicalizes to `www`; the apex `esdeveniments.cat` redirects
there at the edge, so `www`'s callback is the one to register. If the apex is
ever served directly (not redirected), register `https://esdeveniments.cat/api/auth/callback`
and post sign-out `https://esdeveniments.cat/` too.

Forget a host's callback and that environment fails closed with Logto's
`redirect_uri mismatch` — the single most common setup miss.

## The 5 secret locations (keep in sync)

Per `.github/skills/env-variable-management`, every `LOGTO_*` var must be set in:

1. **Code** — read via `process.env` (`lib/auth/logto.ts`, fail-fast).
2. **Env files** — `.env.example` (committed placeholders) and the gitignored
   `.env.development` / `.env.staging` / `.env.production` (`env-cmd` builds).
3. **Coolify** — runtime env on the staging + production apps.
4. **Deploy / CI workflows** — `prod-arch-smoke.yml` boots the auth routes and
   asserts `/api/auth/sign-in` → 307, so a missing `LOGTO_*` fails CI.
5. **GitHub Secrets** — `LOGTO_*_STAGING` (and `LOGTO_*` for prod once it exists).

## Guards — two layers so a missing env can't ship

`getLogtoConfig()` throws on any missing **required** `LOGTO_*` (`LOGTO_ENDPOINT`,
`LOGTO_APP_ID`, `LOGTO_APP_SECRET`; the API-resource and cookie-secret vars are
optional), which turns a sign-in into a 500 (no redirect). Two smokes assert
sign-in 307s to `/oidc/auth`, so that 500 is caught — once before merge, once
on the live environment:

1. **PR gate** — `prod-arch-smoke.yml` (PRs to `develop`/`main`) boots the app
   against Redis with the `LOGTO_*_STAGING` GitHub secrets and asserts
   `/api/auth/sign-in` → 307 `/oidc/auth`. A missing or typo'd **secret** fails
   the PR. This proves the *code* boots; it can't see the target Coolify env.
2. **Deploy gate** — `deploy-coolify.yml`, after the new container is live,
   hits `${DEPLOY_URL}/api/auth/sign-in` and **hard-fails the deploy** if it
   doesn't 307 to Logto (or if the `redirect_uri` carries an internal host).
   This runs against the real runtime env, so a `LOGTO_*` var forgotten in
   **Coolify → Application → Environment** turns the deploy red with a pointer
   to fix it — it does not ship green.

Consequence to know before merging: once auth is mandatory, the deploy gate
will fail any environment whose Coolify app lacks `LOGTO_*`. Set staging's vars
(and the `LOGTO_*_STAGING` GitHub secrets) before/with the merge to `develop`;
set production's (against the prod instance) before promoting to `main`.

## Manual test procedure (agent-browser)

**Test on the Coolify PR preview (`https://pr-<N>.esdeveniments.cat`), not
localhost.** Localhost is a false green for this feature: the proxy-origin bug
and the CSRF-403 below are both invisible there (see `LESSONS.md`). Use
localhost only for `yarn typecheck && yarn lint && npx vitest run` and the
happy-path login shape. Previews don't auto-rebuild on push — a Coolify
"redeploy" re-runs the pinned commit; confirm the live build first:

```bash
curl -s "https://pr-<N>.esdeveniments.cat/sw.js" | grep -c 'api/auth/'   # >0 = new build
```

Login / sign-up round-trip (a fresh agent-browser session):

```bash
s=test
agent-browser --session $s open "https://pr-<N>.esdeveniments.cat/iniciar-sessio"
agent-browser --session $s wait --load networkidle   # → proxy.ts → /api/auth/sign-in → Logto hosted page
agent-browser --session $s snapshot -i                # identifier textbox + "Sign in"
agent-browser --session $s fill @e4 "<test-username>"
agent-browser --session $s click @e1
agent-browser --session $s wait --load networkidle
agent-browser --session $s snapshot -i                # password step
agent-browser --session $s fill @e5 "<test-password>"
agent-browser --session $s click @e3                  # Continue → callback → lands logged in
```

Sign-up is the same via the "Create account" link (`/register`): username →
password → straight back logged in. This Logto instance's sign-in is
**phone + SMS by default** on some configs; if you only see a phone field you
can't self-register headlessly — use an existing test account.

Verify session (in-browser fetch — must be an async IIFE, no top-level await):

```bash
cat <<'EOF' | agent-browser --session $s eval --stdin
(async()=>{const r=await fetch('/api/auth/me',{credentials:'include'});return{status:r.status,body:await r.json()};})()
EOF
# expect 200 {user:{username:"…",...}}; navbar shows the user menu
```

Logout must land back on **our** origin before the next check — after sign-out
the browser sits on the Logto domain, so a relative `fetch('/api/auth/me')`
would hit `auth-preproduction…` (404), not the app:

```bash
agent-browser --session $s click @eNN                 # LOG OUT (re-snapshot for the ref)
agent-browser --session $s open "https://pr-<N>.esdeveniments.cat/en"
cat <<'EOF' | agent-browser --session $s eval --stdin
(async()=>{const r=await fetch('/api/auth/me?cb='+Date.now(),{credentials:'include',cache:'no-store'});return{status:r.status};})()
EOF
# expect 401. A stale 200 here = the service worker served it (see LESSONS.md);
# the ?cb= param, or curl (no SW), tells the truth. cache:'no-store' does NOT bypass the SW.
```

Favorites (same eval POST, logged in and out):

```bash
cat <<'EOF' | agent-browser --session $s eval --stdin
(async()=>{const r=await fetch('/api/favorites',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventSlug:'x',eventId:'1',shouldBeFavorite:true})});return{status:r.status,body:await r.text()};})()
EOF
```

agent-browser gotchas (the ones a fresh agent trips on):
- Quote every URL — a bare `?` breaks in zsh.
- HttpOnly cookies aren't in `document.cookie`; dump them via
  `agent-browser --session $s cookies get` (CDP), not JS.
- To inspect what the SW cached: `eval` `caches.keys()` then
  `caches.open(n).keys()` and grep the URLs.
