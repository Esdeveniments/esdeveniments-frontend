---
applyTo: "app/api/**/*.ts"
---

# Internal API Route Rules

- Middle layer of the API proxy: `lib/api/*.ts` → **`app/api/*` route** → `lib/api/*-external.ts` (`fetchWithHmac`, Zod, safe fallback). See AGENTS.md › API layer and the `api-layer-patterns` skill.
- Call the matching `*-external.ts` wrapper; never call the backend directly.
- Set `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` on success. Pick the TTL per route (see existing routes, e.g. `app/api/events/route.ts`); use `no-store` on errors.
- Handle errors with `handleApiError` (`utils/api-error-handler.ts`); return JSON errors, never raw exceptions.
- Never add `next: { revalidate }` to external fetches (one cache entry per URL).
