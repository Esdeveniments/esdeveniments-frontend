---
applyTo: "test/**/*.{test,spec}.{ts,tsx}"
---

# Testing Conventions

- Test framework: **Vitest** with jsdom environment. Use React Testing Library for component tests.
- Follow **Arrange → Act → Assert** pattern.
- Use `vi.mock()` and `vi.fn()` for mocking; clear mocks between tests with `beforeEach(() => vi.clearAllMocks())`.
- Test bootstrap in `test/setup.ts` seeds `HMAC_SECRET` — do not override.
- Place unit/integration tests under `test/`; E2E tests (Playwright) under `e2e/`.
- Run with `yarn test` (all), `yarn test:watch` (watch mode), `yarn test:coverage` (coverage).
- next-intl mocks live in `test/mocks/next-intl.ts` and `test/mocks/next-intl-server.ts` — import from there.
