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
  (`town`/`comarca`/`everywhere` + slug) from day one so that turning scope into a paid
  tier later is a pricing/config change, not a rearchitecture — but since that record and
  its creation live entirely in Gerard's backend (per phase 1's "all payment logic lives
  in the backend" boundary), this repo has nothing to build for that part. This phase only
  *reads*.
- **Explicit divergence from the literal ask, called out so it isn't mistaken for the real
  thing later**: the original request enumerated three purchasable surface tiers ("if only
  appears in Cardedeu town, or homepage, or all pages"). What ships here, `PromotionScope`,
  is a **query-side surface descriptor** ("which page is asking"), not the **purchased
  tier** ("what the buyer paid for") — those happen to share vocabulary (town/homepage/
  everywhere) but are different types. No purchase path for "all pages" reach exists yet;
  every promoted event is only fetchable via its own town/comarca/homepage scope in this
  phase, regardless of what a future buyer might want to pay extra for.
- An old, unrelated remote branch (`origin/cursor/implement-featured-events-section-for-
  user-promotion-7ea0`) already has commits mentioning a "featured events" section and
  Stripe promotions. Checked and rejected as a base: it diverged from `main` in August
  2025, touches 989 files, deletes ~144k lines relative to current `main` — an abandoned,
  unrelated rewrite, not a usable starting point.

## Scope

**In scope**
1. A new, isolated data-fetch function for "active promoted events for a given surface"
   (homepage, or a specific town/comarca), built against a provisional contract — same
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
  | { type: "town" | "comarca"; slug: string };

export async function getActivePromotedEvents(
  scope: PromotionScope,
): Promise<EventSummaryResponseDTO[]>
```

- Calls a placeholder endpoint, e.g. `GET ${apiUrl}/events/promotions/active?scope=<type>&slug=<slug>`
  (query shape marked provisional/isolated in a comment, exactly like `createPromotionCheckout`
  was marked in phase 1 — a field-name or shape mismatch once Gerard's real endpoint ships
  is a one-file fix).
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
  `DateFilterBadges`, since this isn't a date-filterable section) followed by:
  ```tsx
  <EventsAroundServer
    events={promotedEvents}
    layout="horizontal"
    isPromoted
    title={t("title")}
    jsonLdId={`promoted-events-${scopeKey}`}
  />
  ```
  where `scopeKey = scope.type === "homepage" ? "homepage" : `${scope.type}-${scope.slug}``
  — this also becomes `HorizontalScroll`'s `hintStorageKey` (via `jsonLdId` passthrough in
  `EventsAroundServer`), so it must be unique per page or the first-scroll-nudge sessionStorage
  flag would incorrectly carry over between e.g. Cardedeu's and Mataró's promoted carousels.
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
`CardHorizontalServer`, which gets the same optional prop and renders a small pill (i18n
label, new namespace key) next to the existing `CategoryBadge`, visually distinct (different
color token) so it isn't confused with a category. No changes to `EventSummaryResponseDTO`,
no `ListEvent`-style union — this stays a rendering-only flag, avoiding the schema bloat the
`isAd`/`AdEvent` mechanism has for an unrelated reason (that one needs a union because ad
placeholders are spliced into an otherwise-organic array; here the whole array passed to
`EventsAroundServer` is already 100% promoted events).

## Placement

- **Homepage** (`app/[locale]/page.tsx`, inside `HomeContent`): one
  `<PromotedEventsSection scope={{ type: "homepage" }} />` near the top — before the first
  `FeaturedPlaceSection` (comarca-style carousels), so paid placements lead, matching how
  promoted content is conventionally surfaced.
- **Every listing page** (`app/[locale]/[place]/page.tsx` and its `[byDate]` /
  `[byDate]/[category]` children): same component, scoped to that page's resolved place —
  reusing whatever this page already uses to resolve a `place` slug into town-vs-comarca
  (the existing `placeTypeLabel` logic already visible in `page.tsx`, used today for the
  SEO breadcrumb's town→comarca relationship) — prepended above the existing event grid,
  not interleaved into it.
- Both cases: the section renders nothing when `getActivePromotedEvents` returns `[]` —
  no "no promoted events" empty state, no layout shift beyond a normal conditional render.

## Testing

- Unit (Vitest), new `test/lib/api/promotedEvents.test.ts`: `getActivePromotedEvents`
  returns `[]` on non-2xx and on network error (fail-soft contract), builds the right query
  string per scope variant (`homepage` vs `town`/`comarca` + slug).
- Unit: `PromotedEventsSection` renders `null` on an empty result, renders
  `EventsAroundServer` with `isPromoted` set on a non-empty result (mirrors existing
  `EventsAroundServer`/card test conventions already in `test/`).
- Unit: `CardHorizontalServer`/pill rendering — pill shows only when `isPromoted` is true,
  uses the i18n label, doesn't collide with `CategoryBadge`.
- No E2E change needed — this phase adds a new, independently-hidden section; it doesn't
  touch the publish/promote checkout flow that `e2e/publish-integration.spec.ts` covers.

## i18n

New keys (added to `messages/ca.json`, `es.json`, `en.json`, mirroring the `App.EventPromote`
namespace precedent from phase 1):
- `Components.PromotedEvents.title` — carousel heading (e.g. "Esdeveniments destacats").
- `Components.PromotedEvents.pill` — the disclosure pill label (e.g. "Patrocinat").

## Risks / open questions carried forward (not blocking this implementation)

- Real endpoint contract (query param names, response shape, whether `slug` needs to be a
  town or also accept region/province) is unknown until Gerard defines it — isolated to
  `getActivePromotedEvents`, one-file fix if it differs.
- Auto-derived scope means a promoted event's audience is capped by its own town/comarca
  for this MVP — the "everywhere"/"all pages" tier described in the original ask has no
  purchase path yet (see the divergence note above); known, explicitly deferred, not an
  oversight.
