---
applyTo: "test/**/*.{test,spec}.{ts,tsx}"
---

# Testing Conventions

- Vitest + jsdom + React Testing Library. Copy the closest existing test; see the `testing-patterns` skill.
- `test/setup.ts` sets `HMAC_SECRET` and `BACKEND_SERVICE_SECRET` and mocks `next-intl`, `next-intl/server` and `connection()`. Don't override them.
- `vitest.config.ts` auto-aliases `next-intl*` and `server-only` to `test/mocks/*`: import them normally.
- Mock backend calls with `vi.mock("@lib/api/fetch-wrapper", ...)`, not `fetch`.
- Run one file with `yarn test test/<file>`. Use Node 22.
