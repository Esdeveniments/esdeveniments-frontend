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
- Fails soft: any non-2xx response or network error is caught and returns `[]`. No thrown
  error reaches a render path — this mirrors the Places "Where to eat" section's own
  documented behavior ("Fails soft (200 + empty result) on any upstream error; the section
  hides").
- No client-side caching decisions beyond whatever wrapper convention `fetchEvents` already
  uses (`React.cache` per-request dedupe) — no new Redis/cache-key scheme needed for this
  provisional call; revisit once real traffic and a real endpoint exist.

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
- Reuses `EventsAroundServer` entirely for rendering: dedup, horizontal `HorizontalScroll`,
  `CardHorizontalServer`, JSON-LD `ItemList` schema — all for free. No new carousel
  primitive, no new card component.

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
- No pagination/max-count decided for the carousel — deferred to plan/implementation;
  `EventsAroundServer` doesn't cap `events.length` today (only JSON-LD schema slices to 10),
  so an unexpectedly large promoted list would need a cap added at the fetch layer, not the
  render layer.
- Auto-derived scope means a promoted event's audience is capped by its own town/comarca
  for this MVP — the "everywhere" tier described in the original ask has no purchase path
  yet; this is a known, explicitly deferred gap, not an oversight.
