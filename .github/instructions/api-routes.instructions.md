---
applyTo: "app/api/**/*.ts"
---

# Internal API Route Rules

- Middle layer of the API proxy: `lib/api/*.ts` → **`app/api/*` route** → `lib/api/*-external.ts` (`fetchWithHmac`, Zod, safe fallback). See AGENTS.md › API layer and the `api-layer-patterns` skill.
- Backend-proxy routes call the matching `*-external.ts` wrapper; never call the backend directly. Other routes (auth, image-proxy, webhooks, push, Turso-backed handlers) follow their own module; see the `auth-patterns` skill for auth.
- Set `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` only on successful public GETs. Pick the TTL per route (see existing routes, e.g. `app/api/events/route.ts`). Per-user, auth and mutation responses use `no-store`.
- Don't let the CDN cache a backend failure. If the wrapper hides it behind a fallback (`[]`, `null`), use a status-bearing result like `fetchEventsExternalResult` and answer non-2xx JSON with `Cache-Control: no-store`.
- Handle thrown errors with `handleApiError` (`utils/api-error-handler.ts`) and set `no-store` on the response; return JSON errors, never raw exceptions.
- Never add `next: { revalidate }` to `fetchWithHmac` in external wrappers (one cache entry per URL).
