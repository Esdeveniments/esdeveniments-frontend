# Event Promotion Checkout (Wallapop-style upsell)

Date: 2026-08-03
Status: Approved for implementation planning

## Problem

Right after a user publishes an event, there's no offer to boost its reach. We want a
post-publish upsell modal (Wallapop-style) leading to a dedicated promotion page, where
confirming payment hands off to Gerard's Spring Boot backend, which owns the Stripe
session, the pending order, and the webhook that activates the promotion. This app's job
is: show the upsell, collect the "yes", get a Stripe URL from the backend, and redirect.

## Source of truth for the backend contract

Gerard (backend, Spring Boot) described the flow directly (verbatim, translated):

> Owner-only for now (not decided if others can promote later). Button on the event page
> → Next.js page → user confirms a price (pricing methodology not decided yet — could be
> per-day, or start-date-to-event-date, TBD) → frontend POSTs to something like
> `api/events/{eventId}/promotions/checkout` → backend validates user + event, computes
> price, creates a PENDING order record, creates a Stripe Checkout Session, returns the
> URL → frontend redirects to Stripe → user pays → Stripe redirects to **our** page
> *and* separately fires a webhook to Spring Boot → webhook flips the order to
> successful and the event to paid → frontend, seeing "paid", would show it promoted —
> or, "we'd build an endpoint to give me the promoted ones" (not decided: a reordered
> list vs. a dedicated endpoint) → a scheduled job later reverts to free at expiry.

This confirms the endpoint shape (`POST /events/{eventId}/promotions/checkout` →
`{ url }`) but confirms nothing else is finalized: pricing methodology, whether
non-owners can promote, and how "promoted" surfaces to the frontend are all explicitly
undecided on the backend side. No OpenAPI spec, staging URL, or Postman collection
exists yet (confirmed with the user). This design treats the endpoint contract as
provisional and isolates it behind a single function so a field-name or shape mismatch,
once the real endpoint ships, is a one-file fix.

## Scope

**In scope**
1. Post-publish upsell modal in `app/[locale]/publica/page.tsx`.
2. `/e/[eventId]/promote` page: benefits, static flat fee (€5, MVP placeholder), "Confirm
   and Pay".
3. Server Action that POSTs to the backend checkout endpoint and returns the Stripe URL
   for the client to redirect to.
4. `/e/[eventId]/promote/success` and `/e/[eventId]/promote/cancel`: static, no
   verification (Stripe's own docs: fulfillment must come from the webhook, not the
   redirect — and that webhook is Gerard's, not ours).
5. Analytics for the funnel.

**Explicitly out of scope**
- Pricing lookup/config — hardcoded constant, marked as MVP-provisional. Gerard: "no sé,
  ja ho pensarem" (pricing methodology not decided).
- Duplicate-checkout / already-promoted guard — no lookup endpoint exists for this yet
  (the closest analog, `/api/promotions/active`, is an explicit `TODO` placeholder for
  an unrelated restaurant-promotion feature and must not be reused here).
- "Appears at top of list" sorting or a "Promoted" badge — no field for this exists on
  `EventSummaryResponseDTO`/`EventDetailResponseDTO`, and Gerard hasn't decided whether
  it's a reordered list or a separate endpoint. Zero changes to list rendering or DTOs.
- Non-owner promotion.
- Any webhook, Stripe SDK usage, or Stripe secret key in this repo. Two other Stripe
  integrations already exist here (`/api/sponsors/*` for place banner ads, and a stubbed
  `/api/promotions/*` + `/api/leads/restaurant` for restaurant-promotion leads) — both do
  Stripe entirely inside Next.js with their own DB/webhook. This feature does not touch
  either; it is a third, backend-owned pattern and must not be confused with those two.

## Files

**New**
- `app/[locale]/e/[eventId]/promote/page.tsx` — Server Component. Fetches event +
  current user in parallel (`fetchEventBySlug`, `getCurrentUser`), `notFound()` if
  `currentUser?.id !== event?.owner?.id` — exact pattern copied from
  `app/[locale]/e/[eventId]/edita/page.tsx`. Passes both `event.id` and `event.slug` to
  the client component (the Server Action needs both — see "Checkout flow" below).
- `app/[locale]/e/[eventId]/promote/PromoteEventClient.tsx` — client component: benefits
  list (pinned top), static price, "Confirm and Pay" button, loading/error state.
- `app/[locale]/e/[eventId]/promote/actions.ts` — `"use server"`,
  `createPromotionCheckoutAction(eventId: string, slug: string): Promise<PromotionCheckoutResult>`
  — see "Checkout flow" for the full contract.
- `app/[locale]/e/[eventId]/promote/success/page.tsx` — static thank-you page.
- `app/[locale]/e/[eventId]/promote/cancel/page.tsx` — static cancel page.
- `app/[locale]/publica/PromoteUpsellModal.tsx` — the modal, colocated like
  `PublishAuthGate.tsx` / `CompleteProfileGate.tsx` in the same route folder.
- `app/[locale]/e/[eventId]/components/EventPromoteAction.tsx` — owner-only "Promote"
  entry point on the event detail page itself, mirroring `EventEditAction.tsx` exactly
  (client-side `useAuth()` check, `ownerId`/`slug` props, no extra round-trip). Gerard's
  own description of the flow starts with "hi hagi un botó de promocionar esdeveniment...
  a la pàgina d'esdeveniment" — the modal is the *post-publish* upsell path, this is the
  *always-available* path for an owner revisiting their own event later. Missing this
  was a scope gap caught in review.
- `app/[locale]/e/[eventId]/page.tsx` — render `EventPromoteAction` next to
  `EventEditAction` (wherever that already renders — same sidebar/mobile-detail slot).

**Modified**
- `lib/api/events.ts` — new `createPromotionCheckout(id: string, successUrl: string,
  cancelUrl: string): Promise<{ url: string }>`, same shape as
  `updateEventById`/`deleteEventById`: `requireMutationAuth()` for the Bearer token,
  `fetchWithHmac` with `skipBodySigning: true`, POST to
  `${apiUrl}/events/${id}/promotions/checkout` with `{ successUrl, cancelUrl }` as the
  JSON body (see "Return pages" for why the frontend, not the backend, builds these).
  Throws on failure — the Server Action wrapping it is what converts that into a
  discriminated result (matching how `createEventAction` wraps `createEvent`'s throw).
- `types/api/event.ts` — extend `E2EEventExtras` with an optional `owner?:
  EventDetailResponseDTO["owner"]`. Needed so `createE2EEvent` can stamp an owner
  matching the E2E-authenticated user (see "Testing").
- `app/[locale]/publica/page.tsx` — in `buildE2EExtras()`, populate the new `owner` field
  from the authenticated user already available via `useAuth()` in this file. Around line
  625, replace the unconditional `router.push('/e/${slug}')` after a successful publish
  with: show `PromoteUpsellModal`, navigate on either button (see "Modal" below for the
  exact close/navigate sequencing).
- `lib/api/events.ts` (`createE2EEvent`) — set `owner: extras?.owner` on the constructed
  E2E event object.
- `messages/ca.json`, `es.json`, `en.json` — new `App.EventPromote` namespace (mirroring
  `App.EventEdit` — verified this naming convention against `messages/ca.json:204-219`),
  plus a few new keys under `App.Publish` for the modal copy.

**Not touched**
- `proxy.ts`, `utils/api-gate.ts` — the checkout call goes through a Server Action, which
  bypasses the `/api/*` HMAC gateway entirely (same as `createEventAction`). No
  allowlist/middleware change needed. (Verified: the one place in this codebase where a
  browser-initiated mutation to `/api/events/*` exists — `DELETE /api/events/[slug]` —
  needed an explicit regex carve-out in `gateApiRequest`. The Server Action route avoids
  that class of change entirely.)
- No new `app/api/*` route. No Stripe SDK/webhook/secret in this repo for this feature.

## Modal (Wallapop-style)

Reuses the shared `Modal` component (`components/ui/common/modal`) unchanged, but its
close/navigate sequencing must be exact:

- **"Promote Event"** is the modal's `actionButton`. Its `onActionButtonClick` handler
  calls `router.push('/e/${slug}/promote')` and then **explicitly returns `false`**.
  This matters: `Modal` (`components/ui/common/modal/index.tsx:92-102`) calls
  `setOpen(false)` automatically after `onActionButtonClick` resolves, *unless* the
  handler returns `false`. Without the explicit `return false`, the sequence would be:
  push to `/promote` → Modal's own `setOpen(false)` still fires on the (now unmounting,
  or about-to-unmount) component → in practice this is a redundant state update racing
  the navigation, not a correctness bug per se, but it's exactly the escape hatch Modal
  documents for "don't auto-close, I'm handling it" — using it here removes the race
  entirely rather than relying on unmount timing to save us.
- **"Keep it free"** is a plain button inside the modal body (not wired through
  `actionButton`) → calls `setOpen(false)` then `router.push('/e/${slug}')` directly
  (today's existing post-publish behavior, unchanged).
- Backdrop/back-arrow dismiss falls back to the same "keep it free" path (`setOpen`'s
  default `onClose` already routes there) — no separate analytics event for that edge,
  matching how the existing preview modal in the same file already behaves.

Copy (from the brief): "Boost your event! Promote your event now to reach way more
people and appear at the top of the platform." Exact translated strings live in
`messages/*.json` under `App.Publish.promoteUpsell.*`.

## Checkout flow

**Server Action signature and ownership check.** Copied verbatim from the pattern in
`app/[locale]/e/[eventId]/edita/actions.ts` (`editEvent(eventId, slug, data)`), which
exists precisely to prevent a client from passing an `eventId` it doesn't actually own
alongside a `slug` it does:

```ts
type PromotionCheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

async function createPromotionCheckoutAction(
  eventId: string,
  slug: string,
): Promise<PromotionCheckoutResult>
```

Inside the action: resolve `event` via `fetchEventBySlug(slug)`, resolve `currentUser`
via `getCurrentUser()`, reject (`{ success: false, error: ... }`) unless `event.id ===
eventId` **and** `currentUser?.id === event.owner?.id` — both checks, exactly as
`editEvent` does at lines 24-47. `PromoteEventClient` therefore needs both `event.id` and
`event.slug` as props from the Server Component (`page.tsx` already has both from the
same `fetchEventBySlug` call the ownership gate already uses).

**The action returns a result, it does not throw.** `createPromotionCheckout` (the
`lib/api/events.ts` function) throws on non-2xx and on `requireMutationAuth()` failure —
same as `updateEventById`/`deleteEventById`. But unlike those two (which are called from
contexts that already handle thrown errors upstream), this Server Action is the last
stop before the client needs to render an error state, so it must catch and convert,
exactly like `createEventAction` does for `createEvent`'s 401/403 throws. This is not
optional: since Gerard's endpoint doesn't exist yet, a 404 (or any non-2xx) *is* the
realistic near-term demo path, and an uncaught throw from a Server Action reaches the
client as an opaque, Next.js-redacted rejection in production — not the "generic inline
error" this design promises.

**Building the request:** the action builds `successUrl`/`cancelUrl` itself (see "Return
pages" below for why) using `siteUrl` (`@config/index`) + `withLocalePath` + the known
`slug`, then calls `createPromotionCheckout(event.id, successUrl, cancelUrl)` → `POST
${apiUrl}/events/${id}/promotions/checkout` with `Authorization: Bearer <token>` and
`{ successUrl, cancelUrl }` as the JSON body → `{ url }`.

**Client-side redirect, with validation.** `PromoteEventClient` calls the action, and on
`{ success: true, url }` **validates `url` before redirecting** — it must parse as an
absolute `https://` URL (matching the precedent in `uploadEventImage`,
`lib/api/events.ts:489-498`, which validates its own returned URL rather than trusting it
blindly). This guards two real failure modes at once: a provisional/renamed backend field
silently producing `window.location.href = "/undefined"`, and an unvalidated redirect
target becoming an open-redirect surface. If validation fails, treat it the same as a
`{ success: false }` result — generic inline error, no partial redirect attempt.

No assumption is made about Gerard's error response shape/codes (none confirmed) — any
non-2xx surfaces as the same one generic inline error on the promote page ("Something
went wrong, try again"), no special-casing by status code.

## Return pages

`/e/[eventId]/promote/success` and `/e/[eventId]/promote/cancel`, static, mirroring the
existing `/patrocina/success` + `/patrocina/cancelled` precedent (feature-scoped, not
global). Per Stripe's own docs (confirmed via web search of stripe.com/docs): "customers
aren't guaranteed to visit the success page" — fulfillment must come from the webhook,
never the redirect. Since that webhook lives in Gerard's Spring Boot backend, these pages
do zero verification; they are purely "thank you" / "canceled, event stays free" copy
with a link back to the event.

**`success_url` / `cancel_url` are built by this app, not the backend, and sent in the
checkout POST body.** This reverses the original assumption in this design's first draft.
Reasoning: `/e/[eventId]/promote/success` uses `[eventId]` as a **slug** (confirmed —
this route param is a slug throughout the app, resolved via `fetchEventBySlug`; see the
canonical-slug `redirect()` logic in `app/[locale]/e/[eventId]/page.tsx`), plus a locale
prefix. The backend only ever receives the UUID (`event.id`) in the checkout request path
— it has no way to construct a slug-based, locale-prefixed URL like
`/es/e/estiu-al-carrer-2026/promote/success` from that UUID alone. So the frontend
computes both absolute URLs (via `siteUrl` + `withLocalePath` + the known `slug`) and
passes them to the backend as part of the checkout request; the backend's Stripe session
creation uses whatever it's given rather than constructing its own.

## Analytics (new)

Matching the existing `publish_*` naming already in `app/[locale]/publica/page.tsx`,
sent via `sendGoogleEvent` (imperative calls, matching the majority pattern in that file
— not the declarative `data-analytics-*` attribute pattern used inside `EventForm`):

- `promote_modal_shown` — `{ event_slug, source: "publica" }`
- `promote_modal_cta_click` — `{ event_slug, source: "publica" }`
- `promote_modal_dismiss` — `{ event_slug, source: "publica" }`
- `promote_page_view` — `{ event_slug, source: "promote" }`
- `promote_checkout_click` — `{ event_slug, source: "promote" }`
- `promote_checkout_redirect` — `{ event_slug, source: "promote" }` (fired right before
  the `window.location.href` redirect to Stripe; named `_redirect` rather than
  `_success` since no payment has happened yet at this point — actual payment success is
  only known to the backend via its webhook)
- `promote_checkout_error` — `{ event_slug, source: "promote", reason }`

## Testing

- Unit (Vitest): `createPromotionCheckout` and `createPromotionCheckoutAction` — env-guard
  + HMAC call shape, ownership-mismatch rejection, and the throw-to-result conversion.
  (Correction from an earlier draft of this doc: `updateEventById`/`deleteEventById`
  don't have dedicated unit tests today — they're exercised indirectly via mocks in
  `test/server-actions.test.ts` and `test/api-events-slug-cache.test.ts`. The new
  functions should get real direct unit tests, not just mocked call-sites, since this is
  a money-adjacent path.) Modal button branching (Promote vs. Keep it free navigate to
  the right paths, and the `actionButton` handler's `return false` is asserted so the
  race described above can't regress silently).
- E2E (Playwright): **this requires two changes to E2E infra, not just a new
  assertion.**
  1. `createE2EEvent` (`lib/api/events.ts`) never sets `owner`, so the new promote page's
     ownership gate would `notFound()` for every E2E-created event regardless of who's
     logged in. Fix: extend `E2EEventExtras` with `owner`, populate it in
     `buildE2EExtras()` (`publica/page.tsx`) from the already-authenticated E2E test
     user, and pass it through in `createE2EEvent`.
  2. `e2e/publish-integration.spec.ts`'s existing assertion
     (`page.waitForURL((url) => !url.pathname.includes("/publica"), ...)` right after
     clicking publish) currently races the new modal: the URL no longer changes on
     publish success, the modal appears instead. This existing test **must be updated**,
     not just extended — insert an explicit wait for the modal, then a "Keep it free"
     click, before the existing URL assertion can proceed. Add a second, separate test
     (or a branch in the same one) that instead clicks "Promote Event" and asserts landing
     on `/e/[slug]/promote`.

## Risks / open questions carried forward (not blocking this implementation)

- Real endpoint contract may differ once Gerard ships it (field names, auth, error
  shape, and whether it even accepts `successUrl`/`cancelUrl` in the body as this design
  assumes). Mitigated by isolating the call in one function
  (`createPromotionCheckout`) and by the client-side URL validation described above.
- Pricing is a hardcoded placeholder; will need a real config once Gerard's pricing
  methodology is decided.
- "Appears at top of list" has no frontend implementation — purely a backend ranking/
  endpoint decision still pending on Gerard's side.
- The existing preview-modal path in `publica/page.tsx` (`showPreview` →
  `onActionButtonClick` → `await onSubmit()`) already relies on the publish button's
  existing `isLoading`/spinner state (via `isPending` from `useTransition`) to cover the
  time between form submission and the new upsell modal appearing — this is pre-existing
  behavior this design relies on rather than changes, and is called out here so it isn't
  mistaken for an oversight if the gap is ever felt during a demo.

## Review history

This design went through one adversarial staff-engineer review pass (2026-08-03) before
implementation. Five blocking issues were found and fixed in this document: (1) the
modal's `actionButton` auto-close racing the "Promote Event" navigation — fixed by an
explicit `return false`; (2) the Server Action signature couldn't support an ownership
check with only `eventId` — fixed by adding `slug` and copying `editEvent`'s
double-check; (3) the action was designed to let `createPromotionCheckout` throw through
to the client — fixed with a discriminated result type; (4) `success_url`/`cancel_url`
can't be built from a UUID alone since the return routes use slugs — fixed by having the
frontend build and pass both URLs to the backend; (5) the existing E2E publish test and
`createE2EEvent`'s missing `owner` field would break/block the new promote-page
assertions — fixed by extending E2E test infra and explicitly updating (not just
extending) the existing test. All five are reflected in the sections above, not just
listed here.
