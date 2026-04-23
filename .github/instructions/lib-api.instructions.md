---
applyTo: "lib/api/**/*.ts"
---

# Client Library & External Wrapper Rules

## Client libraries (`lib/api/*.ts` — non-`-external` files)

- Call internal API routes via `getInternalApiUrl()` — never the external API directly.
- Use query builders (`buildEventsQuery`, `buildNewsQuery`) from `utils/api-helpers.ts` — never construct URLSearchParams manually.
- **CRITICAL:** Check `isBuildPhase` from `@utils/constants` and call the `*-external.ts` wrapper directly during build (internal routes don't exist at build time).

## External wrappers (`lib/api/*-external.ts`)

- Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (empty array, null, etc.).
- Use `fetchWithHmac` for all external calls (built-in 10s timeout, HMAC signing).
- Parse responses with Zod schemas from `lib/validation/`.
- Return safe fallback DTOs on error — never throw from read endpoints.
- NEVER add `next: { revalidate, tags }` — this causes unbounded cache growth (one entry per unique URL).
