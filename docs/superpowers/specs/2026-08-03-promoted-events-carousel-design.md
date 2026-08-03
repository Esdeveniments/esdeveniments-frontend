# Promoted Events Carousel (phase 2 of event promotion)

Date: 2026-08-03
Status: Approved for implementation planning
Branch: `feat/promoted-events-carousel` (based on `feat/event-promotion-checkout`)

## Problem

Phase 1 (`feat/event-promotion-checkout`, already shipped on this branch's base) added the
upsell modal, the `/e/[eventId]/promote` page, and the Server Action that hands off to
Gerard's backend for Stripe checkout. It explicitly left "how promoted surfaces to the
frontend" undecided — no field on `EventSummaryResponseDTO`, no lookup endpoint, zero
changes to list rendering. That's this phase: once an event is promoted, show it in a
carousel — on the homepage, and on every event listing page — similar to how e.g. Vilaweb's
"Agenda del Maresme" surfaces a region's events today.

## Source of truth / what's confirmed vs. still open

- No backend endpoint exists yet for "give me the active promoted events for X". The
  closest existing thing, `app/api/promotions/active/route.ts`, is a placeholder that
  returns `null` with a `TODO: replace with real database lookup` comment — and it's for
  the unrelated restaurant-promotion feature, not events.
- `EventSummaryResponseDTO` (`types/api/event.ts`) has no promotion/featured field. The only
  existing "special card in a list" mechanism is `AdEvent`/`isAd` — Google AdSense banners
  injected at deterministic positions (`insertAds` in `lib/api/events.ts`) — a different
  domain (third-party ad revenue, not paid event boosts) and not reused here.
- The existing restaurant-promotion product (`config/pricing.ts`, `types/sponsor.ts`) already
  has a real geo-scope model: `town` / `region` / `country` tiers × duration. Event
  promotion (phase 1) does not — `getEventPromotionOptions()` returns a single flat €5
  fee, no scope choice at all.
- Decision (confirmed with user): scope is **auto-derived** from the event's own location
  for this MVP, not a purchasable choice. No changes to the phase-1 checkout flow. The
  *purchased promotion record* (backend-owned) should still carry a scope field
  (`town`/`region`/`everywhere` + slug) from day one so that turning scope into a paid
  tier later is a pricing/config change, not a rearchitecture — but since that record and
  its creation live entirely in Gerard's backend (per phase 1's "all payment logic lives
  in the backend" boundary), this repo has nothing to build for that part. This phase only
  *reads*.
- **Terminology note**: this repo's own `PlaceType` (`types/common.ts`) is
  `"region" | "town" | ""` — "comarca" (the Catalan administrative unit, e.g. Maresme) is
  what this codebase already calls a **region**. `PromotionScope` below uses `region`, not
  "comarca", to match the existing type rather than introduce a second word for the same
  thing.
- **Explicit divergence from the literal ask, called out so it isn't mistaken for the real
  thing later**: the original request enumerated three purchasable surface tiers ("if only
  appears in Cardedeu town, or homepage, or all pages"). What ships here, `PromotionScope`,
  is a **query-side surface descriptor** ("which page is asking"), not the **purchased
  tier** ("what the buyer paid for") — those happen to share vocabulary (town/homepage/
  everywhere) but are different types. No purchase path for "all pages" reach exists yet;
  every promoted event is only fetchable via its own town/region/homepage scope in this
  phase, regardless of what a future buyer might want to pay extra for.
- An old, unrelated remote branch (`origin/cursor/implement-featured-events-section-for-
  user-promotion-7ea0`) already has commits mentioning a "featured events" section and
  Stripe promotions. Checked and rejected as a base: it diverged from `main` in August
  2025, touches 989 files, deletes ~144k lines relative to current `main` — an abandoned,
  unrelated rewrite, not a usable starting point.

## Scope

**In scope**
1. A new, isolated data-fetch function for "active promoted events for a given surface"
   (homepage, or a specific town/region), built against a provisional contract — same
   approach phase 1 took with the checkout endpoint before it existed.
2. A reusable `PromotedEventsSection` server component, rendered on the homepage and on
   every event listing page, hidden entirely when there's nothing to show for that scope.
3. A small "Promoted" disclosure pill on cards inside this carousel only.
4. i18n strings for the new section heading + pill label.

**Explicitly out of scope**
- Any change to the phase-1 checkout flow, pricing config, or `/e/[eventId]/promote` page.
  Scope selection/pricing tiers are a future, backend-driven change.
- The real backend endpoint itself (owned by Gerard's Spring Boot backend, not this repo).
- A "Promoted" filter/toggle in the existing filter system.
- Sorting/reordering organic listing results — this is an additional carousel, not a
  reordering of the existing grid.

## Data contract (provisional, isolated)

New file `lib/api/promotedEvents.ts` (kept separate from `lib/api/events.ts`, which is
already 800+ lines and has an unrelated set of responsibilities):

```ts
export type PromotionScope =
  | { type: "homepage" }
  | { type: "town" | "region"; slug: string };

export async function getActivePromotedEvents(
  scope: PromotionScope,
): Promise<EventSummaryResponseDTO[]>
```

- Calls a placeholder endpoint, e.g. `GET ${apiUrl}/events/promotions/active?scope=<type>&slug=<slug>`
  (query shape marked provisional/isolated in a comment, exactly like `createPromotionCheckout`
  was marked in phase 1 — a field-name or shape mismatch once Gerard's real endpoint ships
  is a one-file fix).
- **Feature-flag short-circuit (performance + noise control).** The endpoint this calls
  does not exist yet — every call is a guaranteed miss until Gerard ships it. Rather than
  make that network round trip on every homepage/listing-page render forever, gate the
  entire function on `process.env.PROMOTED_EVENTS_ENABLED === "true"` (default off/unset):
  when off, return `[]` immediately with **no fetch call at all** — not "call and fail
  fast," genuinely skip the network hop. This is not a permanent compatibility shim; it's a
  dark-launch gate for a dependency that doesn't exist yet, flipped on once the real
  endpoint is confirmed. Without it, every page on the site pays a doomed round trip on
  every cache miss, indefinitely, with no ship date attached.
- **Failures are quiet, not `captureException`-worthy.** Unlike `fetchEventsInternal`
  (which reports failures via Sentry because a broken `/events` fetch is a real incident),
  a non-2xx from this placeholder endpoint during the pre-launch gap is the *expected*
  outcome, not an exception. Log via `console.warn` (or nothing) and return `[]`; do not
  wire this into Sentry until the flag is flipped on and the endpoint is real — otherwise
  every deploy alerts on a "failure" that's actually just "not built yet."
- **Request mechanics copy `fetchEventsInternal` exactly** (`lib/api/events.ts:128-139`), not
  `createPromotionCheckout`'s mutation path — this is a public GET, not an authenticated
  mutation, so there's no `requireMutationAuth()`/`skipBodySigning`:
  ```ts
  const response = await fetchWithHmac(finalUrl, {
    next: { revalidate: 300, tags: ["promoted-events"] },
    headers: { Accept: "application/json" },
  });
  ```
  `revalidate: 300` (5 min) is shorter than `fetchEvents`'s `600` since a promotion activating
  should surface reasonably quickly; adjust once real traffic patterns exist. Same
  `tags: ["promoted-events"]` convention as `fetchEvents`'s `tags: ["events"]`, for future
  on-demand revalidation.
- **cacheComponents (PPR) compatibility.** `next.config` has `cacheComponents: true`, and
  `app/[locale]/[place]/page.tsx` already wraps its dynamic event fetch in a `Suspense`
  boundary so the static shell can flush first (see the comment at `page.tsx:80`). The new
  promoted-events fetch reuses that same existing Suspense boundary — it does not add a new
  one, and it does not fetch anything outside it. This keeps the static-shell/dynamic-content
  split intact; it does not introduce a second, uncached, un-suspended request per page load
  the way a naive addition would.
- Fails soft: any non-2xx response or network error is caught and returns `[]`. No thrown
  error reaches a render path — this mirrors the Places "Where to eat" section's own
  documented behavior ("Fails soft (200 + empty result) on any upstream error; the section
  hides").
- **Cap at the fetch layer, not the render layer**: `getActivePromotedEvents` slices its
  result to `.slice(0, 8)` before returning (constant, e.g. `MAX_PROMOTED_EVENTS = 8`,
  colocated in the same file). `EventsAroundServer` itself never caps `events.length` (only
  its JSON-LD schema slices to 10), so an unbounded promoted list would otherwise be a
  layout/payload problem, not just a hypothetical one.

## Component

New `components/ui/promotedEvents/PromotedEventsSection.tsx` — server component:

```ts
async function PromotedEventsSection({ scope }: { scope: PromotionScope })
```

- Calls `getActivePromotedEvents(scope)`. If empty, returns `null` (no wrapper markup at
  all — matches `EventsAroundServer`'s own empty-hides-itself behavior, so nesting two
  "hide if empty" checks is harmless, not redundant guard-of-a-guard).
- Otherwise renders a heading (new `Components.PromotedEvents` i18n namespace — no
  "see more" link, since there's no dedicated "all promoted events" page, and no
  `DateFilterBadges`, since this isn't a date-filterable section), copying the exact JSX
  shape of the existing "Popular Now Section" in
  `components/ui/serverEventsCategorized/index.tsx:511-529` (`<div className="container
  content-auto-section"><section className="py-section-y border-b"><SectionHeading .../>
  <EventsAroundServer .../></section></div>`) — the closest existing sibling to what this
  component needs, right down to `showJsonLd`:
  ```tsx
  <EventsAroundServer
    events={promotedEvents}
    layout="horizontal"
    isPromoted
    showJsonLd
    title={t("title")}
    jsonLdId={`promoted-events-${scopeKey}`}
  />
  ```
  where `scopeKey = scope.type === "homepage" ? "homepage" : `${scope.type}-${scope.slug}``
  — this also becomes `HorizontalScroll`'s `hintStorageKey` (via `jsonLdId` passthrough in
  `EventsAroundServer`), so it must be unique per page or the first-scroll-nudge sessionStorage
  flag would incorrectly carry over between e.g. Cardedeu's and Mataró's promoted carousels.
  `showJsonLd` is included (reversing an earlier draft of this doc that considered omitting
  it to avoid "duplicate `ItemList` schema" risk): the same page already renders multiple
  overlapping `ItemList` blocks today (Popular Now + one per `FeaturedPlaceSection`), so this
  isn't a new risk this design introduces — it's the codebase's already-accepted norm, and
  the JSON-LD data source (`EventsAroundServer`) is the one being reused here anyway.
- Reuses `EventsAroundServer` entirely for rendering: dedup, horizontal `HorizontalScroll`,
  `CardHorizontalServer`, JSON-LD `ItemList` schema — all for free. No new carousel
  primitive, no new card component.
- `initialIsFavorite` is not passed (same as `FeaturedPlaceSection`'s existing call path
  today — verified, not a regression this design introduces). Promoted cards render hearts
  identically to comarca-carousel cards.

**Threading the "Promoted" pill.** `EventsAroundServer` gets one new optional prop,
`isPromoted?: boolean`, applied uniformly to every card it renders in a given call (not a
per-event flag — if you're inside `PromotedEventsSection`'s carousel, every card in it is
promoted, so there is nothing to distinguish per-item). Passed through to
`CardHorizontalServer`, which gets the same optional prop and renders a small pill next to
the existing `CategoryBadge`. **Styling: `badge-primary`**, an existing DESIGN.md token
(`badge-primary: { background: colors.primary, color: colors.on-primary, rounded: full,
... }`) — not invented for this feature. It's already the exact class used for this exact
purpose elsewhere: `components/ui/restaurantPromotion/PromotedRestaurantCard.tsx:36` renders
`<span className="badge-primary">{t("badge")}</span>` as that feature's own "this is a paid
promotion" disclosure badge. Copying it here keeps one visual language for "promoted/paid"
across both promotion features instead of inventing a second one. No changes to
`EventSummaryResponseDTO`, no `ListEvent`-style union — this stays a rendering-only flag,
avoiding the schema bloat the `isAd`/`AdEvent` mechanism has for an unrelated reason (that
one needs a union because ad placeholders are spliced into an otherwise-organic array; here
the whole array passed to `EventsAroundServer` is already 100% promoted events).

## Placement

- **Homepage**: NOT `app/[locale]/page.tsx` directly — that file only fetches data and
  delegates all layout to `<ServerEventsCategorized>`. The actual insertion point is
  inside `components/ui/serverEventsCategorized/index.tsx`, in the JSX block that today
  renders "Popular Now" then "Featured Places" (`index.tsx:509-539`). Insert
  `<PromotedEventsSection scope={{ type: "homepage" }} />` **before** the "Popular Now"
  block — paid placements lead organic-popularity content, which itself already leads the
  per-region "Featured Places" carousels.
- **Every listing page**: `app/[locale]/[place]/page.tsx` (`PlacePageGate`) delegates its
  layout to `PlacePageShell` (`components/partials/PlacePageShell.tsx`), which is what
  actually renders `HybridEventsList` (`PlacePageShell.tsx:354`) — that's the insertion
  point, prepended above `HybridEventsList`, not `page.tsx` itself. Scope is built from
  `getPlaceTypeAndLabelCached(place)` (`@utils/helpers`, already called in
  `generateMetadata` and reused for the page body). Its declared return type,
  `PlaceTypeAndLabel.type`, is `"town" | "region" | ""` — but **verified against the actual
  implementation** (`getPlaceTypeAndLabel`, `utils/location-helpers.ts:209-292`): every
  branch returns `"town"` or `"region"` (empty place → `"region"`/"Catalunya";
  `fetchPlaceBySlug` hit → `"town"`/`"region"` from the DTO's type; every fallback down to
  the final catch-all → `"town"`) — there is no code path that returns `""`. The `""` member
  of `PlaceType` is not reachable from this function; it exists for some other consumer of
  the shared type, not this one. `PromotionScope`'s mapping is therefore total in practice,
  but the insertion code still guards it defensively rather than casting past the type
  checker: `if (!placeTypeLabel.type) return null;` before building `scope` — cheap,
  correct, and honest that the branch is believed unreachable rather than pretending the
  type union doesn't include it. The `[byDate]` and `[byDate]/[category]` child routes reuse
  the same `PlacePageShell`, so no separate wiring is needed for those.
- Both cases: the section renders nothing when `getActivePromotedEvents` returns `[]` —
  no "no promoted events" empty state, no layout shift beyond a normal conditional render.

## Performance

- **No LCP competition.** The homepage's actual LCP element is a raw `<img
  fetchPriority="high">` hero background (`serverEventsCategorized/index.tsx:205-212`),
  entirely separate from event-card images. Every existing card carousel on this page,
  including "Popular Now" and every `FeaturedPlaceSection`, is already explicitly
  `usePriority={false}` (`index.tsx:351`, comment: "Homepage images are below the fold -
  don't use priority loading"). `PromotedEventsSection` matches that convention —
  `usePriority={false}` — regardless of where in the stack it sits; it does not introduce
  a second priority image competing with the hero.
- **Zero new client bundle.** `PromotedEventsSection`, `getActivePromotedEvents`, and every
  component it reuses (`EventsAroundServer`, `HorizontalScroll`, `CardHorizontalServer`)
  are server components or already-shipped client code — no new client-side JS ships for
  the base carousel. The "Promoted" pill is a static server-rendered `<span>`, same cost
  class as the existing `CategoryBadge`.
- **Render-cost deferral for free.** The homepage insertion point reuses the
  `content-auto-section` wrapper class already used by sibling sections (`content-
  visibility: auto`), so this section gets the same off-screen render-cost deferral without
  any new CSS.
- **The real cost is the extra network call**, addressed above by the feature-flag
  short-circuit: while `PROMOTED_EVENTS_ENABLED` is unset/false (its state through this
  entire phase, until Gerard ships the real endpoint), `getActivePromotedEvents` returns
  `[]` with zero network I/O — so shipping this phase today has **no** performance cost on
  any page. The cost only appears once the flag is flipped on, at which point the existing
  `next: { revalidate: 300 }` caching bounds it to one upstream call per scope per 5-minute
  window, not per request.

## SEO

- **No new URLs, no sitemap change.** This adds cards linking to already-indexed
  `/e/[slug]` pages — nothing new to crawl or list in `utils/sitemap.ts`.
- **Duplicate internal links are not a duplicate-content issue.** The same event may now
  be linked from both its organic listing position and the promoted carousel on one page.
  Multiple internal links to the same URL on a page is normal and not penalized — this is
  purely a UX/redundancy question, not an SEO one.
- **`rel="sponsored"` does not apply here.** That attribute exists for paid *outbound*
  links to third parties (Google's link-scheme guidance on advertising). These are internal
  `/e/[slug]` navigations to the site's own content, not paid backlinks — calling this out
  so it isn't reflexively added by a future contributor who sees "paid promotion" and
  reaches for `rel="sponsored"` out of habit.
- **JSON-LD**: see "Component" above — `showJsonLd` stays on, matching sibling sections.

## Analytics

- **Click tracking needs zero new props or component changes.** `CardHorizontalServer`
  already wraps its link in `data-analytics-event-name="select_event"` with
  `data-analytics-event-id`/`data-analytics-event-slug` (`CardLayout.tsx:40`, consumed by
  the delegated click listener in `app/GoogleScriptsHeavy.tsx`). That listener already
  merges in ambient context from the nearest ancestor `[data-analytics-container="true"]`
  element — exactly the pattern `components/ui/hybridEventsList/index.tsx:59-61` uses today
  (`data-analytics-container="true" data-analytics-context="events_list" data-analytics-
  place-slug={place}`). `PromotedEventsSection` wraps its `EventsAroundServer` call in the
  same kind of container:
  ```tsx
  <div data-analytics-container="true" data-analytics-context="promoted_carousel"
       data-analytics-place-slug={scope.type === "homepage" ? "homepage" : scope.slug}>
    <EventsAroundServer ... />
  </div>
  ```
  Every click on a promoted card automatically fires `select_event` with `context:
  "promoted_carousel"` and the right `place_slug` — no changes to `CardLayout`,
  `CardHorizontalServer`, or the GA listener's attribute whitelist.
- **Impression/view tracking is explicitly out of scope for this phase.** The one existing
  impression-tracking hook, `useListingAnalytics` (`components/hooks/useListingAnalytics.ts`),
  is hardcoded to the organic grid's DOM shape (`container.querySelector("section")`) and a
  fixed `context: "listing"` — it doesn't fit a horizontal carousel's DOM, and adapting it
  is new, non-trivial client code for a nice-to-have metric. Flagging this as a deliberate
  non-goal, not a silent gap: "carousel was shown" impressions aren't tracked, only clicks.

## Testing

- **Unit (Vitest), new `test/lib/api/promotedEvents.test.ts`** — matching this codebase's
  existing convention of testing pure/isolated functions rather than rendering async server
  components in Vitest (see `test/events-around-server.test.tsx`, which tests the exported
  `dedupeEvents` helper, not a rendered tree):
  - `getActivePromotedEvents` returns `[]`, with no fetch call at all, when
    `PROMOTED_EVENTS_ENABLED` is unset/false.
  - Returns `[]` (not a throw) on non-2xx and on network error, once the flag is on.
  - Builds the right query string per scope variant (`homepage` vs `town`/`region` + slug).
  - Caps results at `MAX_PROMOTED_EVENTS` even if the (mocked) backend returns more.
  - Does not call `captureException`/Sentry on a routine non-2xx (only `console.warn`, or
    silent).
- **Unit: any extracted pure helper** (e.g. a `scopeKey(scope)` function, if pulled out
  rather than inlined) gets the same direct-function-call test treatment.
- **No RSC render tests for `PromotedEventsSection` itself** — consistent with how
  `FeaturedPlaceSection`/`EventsAroundServer` aren't render-tested today either; behavior
  is covered via `getActivePromotedEvents`'s unit tests (does it return data) plus manual/
  `agent-browser` verification during implementation (does it render correctly).
- **E2E: honest scoping.** `getActivePromotedEvents` is a **server-side** fetch to the
  external backend (same shape as `fetchEventsInternal`) — Playwright's `page.route()` only
  intercepts *browser*-initiated requests. Existing e2e mocks (`e2e/filters-client-fetch.spec.ts`,
  `e2e/load_more_with_filters.spec.ts`) all mock `/api/events`, a client-visible route; there
  is no existing pattern in this repo for mocking a direct SSR-to-backend call, and building
  one is out of scope here. Consequently, a "carousel populated with real promoted events"
  E2E test isn't feasible until real staging backend data exists (same constraint phase 1
  hit with the checkout endpoint). Scope for this phase: one regression assertion, in a new
  `e2e/promoted-events-carousel.spec.ts`, that the homepage and one listing page still render
  their existing content correctly with the feature flag off (today's actual production
  state) — i.e., this change doesn't break anything, not that the new carousel works
  end-to-end. Full E2E coverage of the populated carousel is a follow-up once
  `PROMOTED_EVENTS_ENABLED` is flipped on against real backend data.

## i18n

New keys (added to `messages/ca.json`, `es.json`, `en.json`, mirroring the `App.EventPromote`
namespace precedent from phase 1):
- `Components.PromotedEvents.title` — carousel heading (e.g. "Esdeveniments destacats").
- `Components.PromotedEvents.pill` — the disclosure pill label (e.g. "Patrocinat").

## Risks / open questions carried forward (not blocking this implementation)

- Real endpoint contract (query param names, response shape, whether `slug` needs to be a
  town or also accept region/province) is unknown until Gerard defines it — isolated to
  `getActivePromotedEvents`, one-file fix if it differs.
- Auto-derived scope means a promoted event's audience is capped by its own town/region
  for this MVP — the "everywhere"/"all pages" tier described in the original ask has no
  purchase path yet (see the divergence note above); known, explicitly deferred, not an
  oversight.
- `PROMOTED_EVENTS_ENABLED` needs an entry in `.env.example` and in prod env config at
  deploy time — flagged here so it isn't forgotten; flipping it on is a deliberate, separate
  follow-up once Gerard's endpoint exists, not part of this phase. Checked `utils/env.ts`:
  there's no central zod-validated env schema to register with (it's a handful of direct
  `process.env.X` reads, e.g. `E2E_TEST_MODE`) — a plain `process.env.PROMOTED_EVENTS_ENABLED
  === "true"` read is consistent with that convention, and it's server-only (no
  `NEXT_PUBLIC_` prefix), which is correct since it's never read client-side.
- No impression/view analytics (see "Analytics" above) — click-only for this phase.
