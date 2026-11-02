---
applyTo: "app/api/**/*.ts"
---

# Internal API Route Rules

- These routes are the proxy for client components:
  1. Client component → calls internal route
  2. **Internal route** (`app/api/*`) → calls external wrapper, sets cache headers
  3. External wrapper (`lib/api/*-external.ts`) → HMAC signing, Zod parsing, safe fallback
- Server readers (`lib/api/*.ts`) mostly call the external wrapper directly, because these routes do not exist during `next build` (see `lib-api.instructions.md`).
- Always call the corresponding `*-external.ts` wrapper — never call the external API directly.
- Set `Cache-Control` headers with appropriate TTLs (events 600s, news 60s, categories 3600s).
- Use `stale-while-revalidate` for resilience.
- Handle errors gracefully — return a structured JSON error response, never let raw exceptions leak.
- NEVER add `next: { revalidate }` to fetches in external wrappers — this causes unbounded cache growth (one entry per unique URL).
