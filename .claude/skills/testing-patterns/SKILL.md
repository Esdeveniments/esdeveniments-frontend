---
name: testing-patterns
description: How unit tests (Vitest + jsdom + React Testing Library) and E2E tests (Playwright) are set up in this repo — mocks, setup, commands, and real example specs to copy. Use when writing or fixing a test, mocking next-intl or fetchWithHmac, testing SEO tags, sitemaps or canonical URLs, or running E2E against local or remote.
---

# Testing Patterns

Commands and the Node version: AGENTS.md › Commands. Add tests only for behavior you add or fix; copy the closest existing test instead of writing from scratch.

## Unit tests (Vitest)

- Files: `test/**/*.{test,spec}.{ts,tsx}` (`vitest.config.ts`, jsdom). Run one file: `yarn test test/url-filters.test.ts`. Watch: `yarn test:watch`.
- `test/setup.ts` runs first. It sets `HMAC_SECRET` and `BACKEND_SERVICE_SECRET`, deletes `API_URL` (so `NEXT_PUBLIC_API_URL` stubs win), mocks `next-intl`, `next-intl/server`, `connection()` from `next/server` and `next/root-params` (`locale` → `"ca"`), and polyfills `Blob.arrayBuffer`. Don't override these secrets.
- `vitest.config.ts` aliases `server-only`, `next-intl`, `next-intl/server`, `next-intl/navigation` and `next-intl/routing` to `test/mocks/*` (so `@i18n/routing` gets mocked `Link`/router too). Import them normally in tests; don't import from `test/mocks/`.
- Backend calls: mock the wrapper module, not `fetch`:
  `vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }))` (see `test/events-api-outage.test.ts`, `test/lib/api/promotions.test.ts`).

### Examples to copy

| Testing | Look at |
| --- | --- |
| URL building/parsing (`buildCanonicalUrlDynamic(filters, dynamicCategories?)`) | `test/url-filters.test.ts`, `test/url-parsing.test.ts` |
| Filter config | `test/filter-system.test.ts` |
| Internal API route handlers | `test/api-events.test.ts`, `test/api-auth-me.route.test.ts` |
| External wrapper fallbacks | `test/events-api-outage.test.ts`, `test/fetch-wrapper.test.ts` |
| Metadata / robots meta | `test/build-page-meta-robots.test.ts`, `test/seo-meta.test.ts`, `test/i18n-seo.test.ts` |
| Sitemaps | `test/sitemap-content.test.tsx` |
| Components (RTL) | `test/components/`, `test/search-component.test.tsx` |
| Client i18n namespaces | `test/i18n-client-namespaces.test.ts` |

## E2E tests (Playwright)

- Specs: `e2e/*.spec.ts` (`<feature>.spec.ts` or `<feature>.flow.spec.ts`), helpers in `e2e/helpers/`. Use `data-testid` selectors.
- `yarn test:e2e` uses `playwright.config.ts`: base URL `http://localhost:3000`, reuses a server already listening there, otherwise starts `yarn dev`. To prove behavior, start `yarn build && yarn start` first (see `verify-que-fer`).
- Remote: `PLAYWRIGHT_TEST_BASE_URL=https://staging.esdeveniments.cat yarn test:e2e --config playwright.remote.config.ts e2e/smoke.spec.ts`.
- Debug: `yarn test:e2e:debug`, `yarn test:e2e:ui`. Needs API credentials for data.
- Pages live under `app/[locale]/` (listing: `app/[locale]/[place]/page.tsx`). `/robots.txt` is a route (`app/robots.txt/route.ts`); sitemaps are routes (`app/sitemap.xml`, `app/server-*-sitemap.xml`, `app/sitemap-events`, `app/sitemap-places`). Assert what the route really returns; read it first.

### Examples to copy

| Testing | Spec |
| --- | --- |
| Canonical URLs and redirects | `e2e/canonical-urls.spec.ts` |
| hreflang and JSON-LD locale | `e2e/hreflang-and-jsonld-locale.spec.ts`, `e2e/jsonld-list-and-detail.spec.ts` |
| Listing robots / noindex | `e2e/listing-robots.spec.ts` |
| Sitemaps and feeds | `e2e/sitemaps_and_feeds.flow.spec.ts`, `e2e/news-sitemaps.spec.ts` |
| Hybrid list + ads | `e2e/ads-hybrid-rendering.spec.ts`, `e2e/load_more_with_filters.spec.ts` |
| Filters | `e2e/filters.flow.spec.ts`, `e2e/filters-client-fetch.spec.ts` |
| Smoke | `e2e/smoke.spec.ts` |
| Real Logto login and session | `e2e/auth-session-integration.spec.ts` (`helpers/login.ts`) |
| Sign-up and onboarding (new account) | `e2e/signup-onboarding-integration.spec.ts` (`helpers/inbox.ts`) |
| Sponsor purchase, cancel and live banner | `e2e/payment.sponsor-flow.spec.ts` (`helpers/stripe.ts`, `helpers/turso.ts`) |
| Promotion leave, resume, pay and go live | `e2e/promotion-integration.spec.ts` |

### Opt-in specs that touch real services

| Spec | Turned on by | Runs in |
| --- | --- | --- |
| `payment.*.spec.ts` | `RUN_PAYMENT_E2E=1` + test `STRIPE_*`/`TURSO_*` | `ci.yml`, PRs to `main` |
| `*-integration.spec.ts` | `E2E_STAGING_EMAIL`/`E2E_STAGING_PASSWORD` | `e2e-integration.yml`, nightly |
| Promotion payment test | also `E2E_PROMOTION_STRIPE_SECRET_KEY` (test key of the backend's Stripe account) | same |
| `signup-onboarding-integration.spec.ts` | `RUN_SIGNUP_E2E=1`; creates a preproduction account each run (nothing can delete it yet) | same |

- **Stripe Checkout**: never fill the card form. Stripe's hosted page answers automation with hCaptcha ([Stripe: automated testing](https://docs.stripe.com/automated-testing)). Drive our UI to `checkout.stripe.com`, then pay with `payCheckoutSession` (what `stripe trigger` does), follow `success_url`, and for our own webhook forward Stripe's real event with `waitForCheckoutCompletedEvent` + `signStripePayload`. No Stripe webhook endpoint reaches CI or localhost.
- **Return URLs** use the configured public origin (`NEXT_PUBLIC_SITE_URL` on a production build, the backend's `PROMOTIONS_FRONTEND_BASE_URL`), not the app under test. `routeReturnsToApp` redirects them back so the session cookies still apply.
- **Sign-up** reads Logto's 6-digit code from a disposable [mail.tm](https://mail.tm) inbox (`helpers/inbox.ts`, rate-limited to 8 requests/s; credit mail.tm where it is used). Logto's identifier box has no accessible name: use `input[name="identifier"]`.
- Specs that type a password or send a secret through `request` call `test.use({ trace: "off" })`: traces keep `fill()` values and API request headers (LESSONS.md).
