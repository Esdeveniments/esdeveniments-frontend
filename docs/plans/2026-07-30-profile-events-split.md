# Profile & favorites: upcoming/past split, Wallapop-style tabs

**Date:** 2026-07-30

---

## Context

A user reported that an organizer's profile renders an empty event list even though the
profile itself loads fine. Root cause, confirmed in code: `ProfilePageShell` fetches
**page 0 (20 events)** from the backend and *then* applies `filterActiveEvents`
(`components/partials/ProfilePageShell.tsx:26-28`). Every event on that page had expired,
so the section renders `NoEventsFound`. Filtering after paginating is the bug: a user with
25 past events and 3 upcoming ones sees nothing at all.

The product answer we agreed with Gerard is not "filter harder" but a real split:
**Propers** (upcoming) and **Passats** (past). Past events stay visible as public proof of
what an organizer has actually run. Same idea for favourites, so people don't feel they
lose what they saved. The visual target is the Wallapop public profile: a header card with
stats, then a count-over-label underline tab bar, then the card grid.

Backend split lands from Gerard; this plan is the frontend plus the exact contract to
confirm with him.

## Three findings that change the scope

**1. Past favourites contradict what shipped three commits ago.** PR #430
(`08a07b21 fix(favorites): prune expired favorites for authenticated users`) actively
*deletes* expired favourites: `/preferits` computes `eventIdsToRemove` from expired events
and `FavoritesAutoPrune` POSTs them to `/api/favorites/prune`, which issues backend
DELETEs. A "Preferits passats" tab cannot exist until that pruning stops. And
`MAX_FAVORITES = 10` (`utils/constants.ts:11`) counts *every* stored favourite, so keeping
past ones would silently eat the quota: save 10 things, wait a month, and you can no longer
save anything. Backend rule change required, see the contract below.

That quota is also why **past favourites are logged-in only**. The guest cookie holds 10
slugs and nothing else; it cannot express "this one is past so it doesn't count against the
cap" without inventing structure inside the cookie. Leaving guests on today's behaviour
keeps their prune path untouched, and "log in and you won't lose them" becomes a real
reason to register instead of a marketing line.

**2. Favourites need no backend split at all.** The cap is 10 and both code paths already
fetch the whole list in one call (`listFavoriteEventsExternal(token, 0, MAX_FAVORITES)`,
cookie path likewise). Splitting 10 items in memory with the existing `isEventActive` is
free. Tell Gerard to build the split only for `/users/{username}/events`; favourites is
frontend work plus the cap rule.

**3. Favourites keep a single flat URL.** `/preferits` serves both guests and logged-in
users, as it does today. Nesting it under `/perfil/[username]/preferits` would buy nothing
and cost several things: the navbar href would have to flip after hydration (auth is
client-side), every visit would need a redirect, and the path depends on `username`, which
LESSONS.md already records coming back empty when `enrichWithBackendProfile` masked a 401.
Wallapop itself uses a flat `/app/favorites`; it's the sidebar chrome that makes it feel
like the account area, not the path. The dashboard feel is a rendering concern, not a
routing one.

## Not building (and why)

- **The private sidebar dashboard** (Wallapop images 2/4/5/6: Compras, Ventas, Tu Catálogo,
  Estadísticas). It's the right long-term direction, but it fixes nothing today and is a
  much larger surface. The tab primitive built here is what it would be made of.
- **Per-event metrics** (views, chats, favourites received, i.e. Wallapop's Estadísticas
  table). No backend for it. Note that profile-level `totalEventVisits` *does* already exist
  in the DTO and is rendered nowhere, so that one is free and is included.
- **Favourites search, sort, lists and profiles tabs** (Wallapop image 5). Ten items.
- **An "Info" tab** on the profile. Bio, website and joined date already live in the header.
- **An auth gate on the heart icon.** Wallapop opens a login when guests favourite something;
  we keep saving to cookie and nudging afterwards, with `/api/favorites/migrate` merging on
  sign-in. Wallapop can wall it because a favourite there is tied to a transaction and their
  brand pull gets people to log in anyway. Most traffic here arrives from Google looking for
  what's on this weekend, and a login wall on a heart loses them.

## Backend: what Gerard needs to know before he builds

Gerard owns the contract. These three facts were verified against the live API on
2026-07-30 and change what he'd choose to build, so send them before he starts.

1. **`profileSlug` is dead code.** It's fully plumbed through the frontend (`types/event.ts`,
   `buildEventsQuery` in `utils/api-helpers.ts:235`, `app/api/events/route.ts:38`,
   `useEvents`, `HybridEventsList`) but the backend ignores it:
   `/api/events?size=1&profileSlug=zzz-no-such-user-9999` returns byte-identical results to
   the unfiltered call. `docs/api-spec-profiles.md:50` lists `EventSpecification.filterByProfile()`
   as planned-but-unbuilt, so this was always the intent.
2. **`from` / `to` already work on `/events`.** `?from=2019-01-01&to=2019-12-31` returns 11
   events, all dated 2019. Past events are queryable today.
3. **`/events` already defaults to upcoming-only.** No params and `from=<today>` both return
   exactly 3926. That's why listing pages never show expired events.

So the only missing capability is "scope events to a user", and it can land in either place:

- **Option A**: `status=upcoming|past` on `/users/{username}/events` (the endpoint the profile
  already uses). Semantically clean, small blast radius.
- **Option B**: make `profileSlug` filter on `/events` and lean on the `from`/`to` that already
  work. Costs less frontend: `/api/events` is already an allowlisted public GET,
  `HybridEventsList` already has SSR + `useSWRInfinite` load-more + dedup + analytics and
  already accepts a `profileSlug` prop, and each query returns its own `totalElements` so the
  tab counts need nothing added to the profile DTO.

Whichever he picks, two things must hold:

- **Sort order.** Past events read most-recent-first ("de més a menys", as Gerard put it).
  `/events` almost certainly sorts ascending always, so this needs saying explicitly.
- **The past boundary must match `utils/event-status.ts` `computeTemporalStatus`**: an event
  is past only once its **end** has passed (all-day events compare at day level, timed events
  at timestamp level). A naive `startDate < now` marks a three-day festival past on its
  opening morning.

Worth asking for either way: `upcomingEventCount` / `pastEventCount` on
`GET /users/{username}`. `eventCount` and `totalEventVisits` already exist in
`UserPublicResponseDTOSchema` (`lib/validation/user.ts:16-18`). Option B could derive these
from `totalElements`, but see the PPR section: a count taken from a list response drags the
tab bar out of the static shell, so the cached profile is the better source even when a
cheaper one exists.

### Where the frontend branches

Only two places. Everything else in this plan is identical either way, so implementation is
not blocked on the answer:

| | Option A | Option B |
|---|---|---|
| Data call | `fetchUserEvents(username, 0, 20, status)` | `fetchEvents({ profileSlug, to })` |
| Load more (Phase 4) | new internal route + new client list | reuse `HybridEventsList`, near-zero work |
| Tab counts | profile DTO fields, in the static shell | `totalElements`, fresh but streams in after the shell |
| API gate | needs a new narrow GET pattern | nothing, `/api/events` is already public |

Build Phase 1 and the Phase 2 restructure now; swap the fetch call in when he ships.

Favourites cap rule (blocks the Preferits/Passats tab only):

- `MAX_FAVORITES` (10) must count **upcoming favourites only**; past ones stay stored and
  never trigger the 409.
- Backend keeps at most ~20 past favourites per user, evicting oldest first, so rows can't
  grow forever now that we stop pruning.

## Phase 1: tab primitive + design tokens

No tab component exists in the repo (no Radix; `@headlessui/react` is used in exactly one
modal). DESIGN.md documents no tab pattern either, so we define one rather than inventing a
variant per page.

**`components/ui/common/tabs/index.tsx`** (client, ~40 lines; it needs `usePathname` to know
the active tab, but has no state and fetches nothing).

```tsx
// props live in types/props.ts
type TabItem = { id: string; href: string; label: string; count?: number };
type TabsProps = { items: TabItem[]; active: string; ariaLabel: string };
```

- Renders `<nav>` containing `Link` from `@i18n/routing`, never `next/link`.
- **Server component. The active tab is a parameter, not a discovery.** Each page renders the
  strip and passes `active` directly, because a page already knows which tab it is. The
  alternative (put the strip in the layout and read `usePathname`) drags in a client
  component and two bugs that are then permanently possible: `usePathname` from
  `next/navigation` returns the locale-prefixed path while `Link` hrefs are unprefixed, so
  nothing matches on `/es`; and comparing with `startsWith` keeps Propers lit while you're on
  `/passats`, since one href is a prefix of the other. Passing `active` makes both
  unreachable rather than carefully avoided, and keeps the strip out of the client bundle.
- Hrefs build the username with `encodeURIComponent`, matching `lib/api/profiles.ts:31`.
- Rail: `border-b border-border`, full width. Item: `border-b-2 -mb-px`, `px-element-gap py-sm`.
- Count on top in `heading-3`, label underneath in `body-small`, the Wallapop image-3 stack.
- Active: `border-primary`, `text-foreground-strong`, `aria-current="page"`.
  Inactive: `border-transparent`, `text-foreground/80`.
- Count omitted when `undefined`, so a missing backend field degrades to a label-only tab.
- Wrapped in the existing `components/ui/common/HorizontalScroll.tsx` for narrow screens.
- **No `role="tablist"` / `role="tab"` / `aria-selected`**, despite the component's name.
  Those roles promise a tabpanel that swaps in place; these are links that navigate to a new
  URL, so announcing them as ARIA tabs misleads screen reader users about what Enter will do.
  `<nav>` plus `aria-current="page"` is the correct pairing for link-based navigation.

Add the spec to **DESIGN.md** (`tab-bar` / `tab-bar-active`) alongside the existing
`badge-*` and `card-*` specs, plus the empty-state pattern DESIGN.md is also missing.

## Phase 2: profile Propers / Passats + stats header

Tabs are **routes**, not client state. Each tab is its own static ISR render, no
`searchParams` anywhere (the $300 incident rule, AGENTS.md:172-186), deep-linkable, zero JS
to switch. `/perfil/[username]` stays the canonical upcoming URL, so existing SEO is
untouched.

```
app/[locale]/perfil/[username]/layout.tsx        NEW   header + tabs, wraps both views
app/[locale]/perfil/[username]/page.tsx          EDIT  upcoming list + JSON-LD
app/[locale]/perfil/[username]/passats/page.tsx  NEW   past list, noindex
```

- **layout.tsx** (server): `getUserByUsernameCached(username)`, then `ProfileHeader` +
  `ProfileClaimCta` + `{children}`. That reader is `"use cache"`, so the page fetching the
  same profile costs nothing extra.
  **The tab strip lives in the pages, not here.** Tabs need per-status counts, and a layout
  cannot receive data from the page below it, so putting them here would force either a
  second fetch in the layout or counts read off the hours-stale cached profile. Rendering
  them in each page puts the strip where the data already is, and lets the page pass
  `active` instead of deriving it. Cost is three duplicated lines per page, which is the
  cheaper side of the trade.
  Two constraints here, both easy to get wrong:
  - **The 404 stays in the pages, not the layout.** `notFound()` thrown from a layout
    resolves to the *parent* segment's boundary, which would bypass the existing
    `app/[locale]/perfil/[username]/not-found.tsx` and render the generic app 404. The
    layout must instead tolerate `profile === null` by rendering `{children}` bare; the page
    below still calls `notFound()` and its output is what the user sees.
  - **Do not wrap the header in `<Suspense>`.** `getUserByUsernameCached` is `"use cache"`
    specifically so the profile prerenders *outside* a Suspense boundary; the comment at
    `lib/api/profiles.ts` spells this out. Adding a boundary would push the header out of the
    static shell and make it stream for no reason.
- **page.tsx**: keeps `generateMetadata` and the breadcrumb + Person JSON-LD (schema stays on
  the indexable URL only), renders `<ProfileEventsSection username status="upcoming">`.
- **passats/page.tsx**: `robots: "noindex, follow"` in `generateMetadata`, self-referential
  canonical, no JSON-LD. Metadata is the right mechanism here and no `proxy.ts` change is
  needed: its `THREE_SEGMENT_NOINDEX_RE` (`proxy.ts:554`) requires a date keyword in the
  middle segment (`avui|dema|setmana|cap-de-setmana`), so it does not match
  `/perfil/{username}/passats`. This mirrors how `/preferits` already sets its own robots tag.
- **`components/partials/ProfilePageShell.tsx`** dissolves. Header, CTA and JSON-LD move to
  the layout and page; the list becomes
  **`components/partials/ProfileEventsSection.tsx`** (`{ username, status }`), which fetches
  and renders `List` + `CardServer`, or `NoEventsFound`. **Delete the `filterActiveEvents`
  call**: the backend becomes the source of truth, and running it on the past tab would empty
  the list.

  This module is the seam that absorbs Gerard's contract choice. Its callers know
  `{ username, status }` and nothing about whether that becomes
  `status=past` on `/users/{username}/events` or `profileSlug=X&to=yesterday` on `/events`.
  Both pages, both tabs, and the tests all cross that one interface, so switching options is
  a one-file change and needs no test rewrite. Worth keeping the interface at `status`
  (a domain word) rather than leaking `from`/`to` dates through it.
- **`lib/api/users-external.ts` `getUserEventsExternal`**: add the optional `status` param to
  the query string. **`lib/api/profiles.ts`**: `fetchUserEvents` is
  `cache(getUserEventsExternal)`, so the new argument joins the dedupe key for free.

**Stats row in `ProfileHeader`** (Wallapop image 3, right side of the header card):
`eventCount` publicats, `upcomingEventCount` propers, joined date. Each stat hides when its
field is `undefined`.

**Where each count comes from decides whether the tab bar is in the static shell.** See the
PPR section below: counts from the cached profile render instantly with the shell, counts
from a list response cannot. Take the profile DTO counts and accept up to an hour of drift.

One judgment call to flag: `totalEventVisits` is public data on the DTO, but on a site this
size "12 visites" reads worse than showing nothing. Recommend rendering it **owner-only**,
reusing the `user?.username === username` client check that
`components/ui/profile/ProfileOwnerActions.tsx` already does. Say the word and it goes public.

**i18n**, new keys under `Components.Profile` in all three of `messages/{ca,en,es}.json`:
`tabUpcoming`, `tabPast`, `noUpcomingEvents`, `noPastEvents`, `statsPublished`,
`statsUpcoming`, `statsVisits`, `pastTitle`, `pastMetaDescription`.

## Cache Components / PPR constraints

`next.config.js:76` sets `cacheComponents: true` on Next 16.2.6, so every route here is a
static shell plus streamed dynamic holes. Three consequences that cut across the phases:

**Fetching user events is permanently dynamic.** `fetchWithHmac` opens with
`await connection()` (`lib/api/fetch-wrapper.ts:9`), so `getUserEventsExternal`, and
therefore `fetchUserEvents`, can never be prerendered. `ProfileEventsSection` must sit inside
`<Suspense>` on both pages with a card-grid skeleton. This is already how it works today
(`ProfilePageShell` renders inside the page's Suspense gate); the restructure just has to not
lose it. The profile header is the opposite case: `getUserByUsernameCached` is `"use cache"`
so it belongs in the shell, outside any boundary.

**This is what settles the tab counts, and it argues for Option A.** Counts taken from a list
response inherit that response's dynamism, so the tab bar would leave the static shell and
stream in, and first paint would show a page with no tabs. Counts read from the `"use cache"`
profile render instantly with the shell. So `upcomingEventCount` / `pastEventCount` on the
profile DTO are worth asking Gerard for even though Option B could derive them from
`totalElements`. Up to an hour of drift on a number is a smaller cost than a tab bar that
pops in after the shell.

**Never let the temporal split run inside a `use cache` boundary.** `computeTemporalStatus`
reads the current time, and non-deterministic values inside `use cache` are evaluated once at
build time, which would freeze "past versus upcoming" at deploy. Two places to watch: the
profile is safe because the backend owns the split after this change, and the favourites
pages are safe because reading cookies makes them dynamic anyway. AGENTS.md states the
general rule (`await connection()` before branching on `Date.now()`); the point here is that
`partitionByTemporalStatus` must never migrate into a cached function later.

## Phase 3: favourites Propers / Passats

Same route-as-tab shape, both `noindex`, both dynamic (session/cookie), no backend split,
and `/preferits` stays the one URL for everyone.

```
app/[locale]/preferits/layout.tsx           NEW   static heading only, no data
app/[locale]/preferits/page.tsx             EDIT  upcoming only
app/[locale]/preferits/passats/page.tsx     NEW   past only, authed only
app/[locale]/preferits/loadFavoritesData.ts NEW   extracted loader, shared by both
```

**The layout must stay data-free.** `loadFavoritesData` reads cookies *and* goes through
`fetchWithHmac`, so calling it from a layout outside `<Suspense>` would collapse the static
shell for the whole route under `cacheComponents`. The heading is static; the count and the
tab strip render inside each page's Suspense boundary, where the data already is.

- `loadFavoritesData` (~130 lines, currently inline in a `page.tsx` that is already 241 lines)
  moves out so both routes share it, wrapped in `React.cache()` (the layout needs it for the
  heading count and the page needs it for the list; uncached, the guest path would fan out its
  `fetchEventBySlugWithStatus` calls, up to 10 at concurrency 5, twice per render).

  **Narrow its result type while moving it.** Today it returns five loosely-related fields
  (`events`, `uniqueFavoritesCount`, `slugsToRemove`, `eventIdsToRemove`, `backendUnavailable`)
  and the caller has to know which apply to the authed branch versus the cookie branch, and
  that `backendUnavailable` means "render an error" rather than "render an empty list". With a
  second caller and a past/upcoming split layered on, that's four rules replicated across two
  routes. Return a discriminated union instead:

  ```ts
  type FavoritesView =
    | { kind: "unavailable" }
    | { kind: "ready"; upcoming: Event[]; past: Event[];
        upcomingCount: number; cap: number; canSeePast: boolean; prune: PruneRequest };
  ```

  Callers switch on `kind` and cannot render an empty list when the backend is down. The
  logged-in-only rule for past favourites becomes `canSeePast`, decided once. `upcomingCount`
  is the counter fix below, decided once. `prune` bundles the two removal lists so no caller
  can pass cookie slugs down the authed path.
- Split in memory with **one partition, not two predicates**. Add to `utils/event-helpers.ts`,
  next to the existing `filterActiveEvents` / `isEventActive`:

  ```ts
  partitionByTemporalStatus(events) → { upcoming: Event[], past: Event[] }
  ```

  A sibling `filterPastEvents` predicate would be the obvious move, and it's the wrong one:
  two independent predicates can drift, so totality becomes a rule someone has to remember
  rather than something the code guarantees. An event whose date fails to parse would fall
  out of both lists and silently vanish, and this backend does emit timezone-naive date
  strings (see `parseBackendDateAsUtcMs`). A partition built on `isEventActive` makes
  `upcoming.length + past.length === events.length` true by construction, which is also a
  one-line property test.
- **`countLabel`** (`"{count}/{max} desats"`) must count **upcoming favourites only** once past
  ones stop consuming the cap, otherwise the counter tells users they're full when they aren't.
- **Guests**: no tab bar at all (there is only one view), the current cookie prune of expired
  favourites stays exactly as it is, and a single-line nudge under the heading carries the
  login CTA. Rendering a Passats tab that only bounces guests to a login would be a tab that
  does nothing, so it's out.
- **Logged in**: two tabs, and the auto-prune of expired favourites stops. Concretely,
  `collectExpiredEventKeys(events, e => e.id)` becomes `[]` for the authed branch, so
  `eventIdsToRemove` is always empty. `slugsToRemove` survives for the cookie branch's
  genuinely-missing slugs (404s), which is orphan cleanup rather than expiry.
  `FavoritesAutoPrune` and `/api/favorites/prune` stay in place; only the input changes.
- **Guests hitting `/preferits/passats` directly** (bookmark, shared link) `redirect()` to
  `/preferits`. Server-side, using `redirect` from `@i18n/routing` so the locale survives.
- **Gate**: do not merge the prune removal until Gerard's cap counts upcoming only, or a user
  with 10 stale favourites can't save anything new. Phase 3 is its own PR for exactly this.
- Add a "Preferits" link to the owner's own profile (`ProfileOwnerActions` already knows when
  you're the owner) pointing at `/preferits`, which is the profile-to-favourites connection
  without touching routing.
- **i18n**, new keys under `App.Favorites`: `tabUpcoming`, `tabPast`, `pastTitle`,
  `pastEmptyTitle`, `pastEmptyDescription`, `guestSyncNudge`.

## Phase 4: "Veure'n més" on the profile

The 20-item first page is already flagged as a known gap (`ProfilePageShell.tsx:15-17`). With
the split, an active organizer's Passats tab will exceed 20 immediately, so this stops being
optional.

```
app/api/users/[username]/events/route.ts     NEW  internal route (page, size, status)
components/ui/profile/ProfileEventsList.tsx  NEW  client, SSR page seeded via fallbackData
```

- The route mirrors `app/api/users/[username]/route.ts`: HMAC signing server-side, zod
  validation, `Cache-Control: public, s-maxage=300, stale-while-revalidate=1800` to match the
  sibling users route (a longer TTL means an event that just ended can keep showing under
  Propers for that long).
- **The API gate will block this route as written.** `utils/api-gate.ts` classifies users with
  `/^\/api\/users(\/[^\/]+)?$/`, a single segment, so `/api/users/{u}/events` fails it and
  browser calls get rejected. Add a **narrow, GET-only** pattern for exactly this path. Do not
  widen the existing pattern to `(\/[^\/]+)*`: that would also expose `/api/users/me/profile`
  and `/api/users/me/avatar` to unsigned requests, which are currently blocked precisely
  because they are two segments deep.
- Client list: `useSWRInfinite` keyed on `(username, status, page)`, seeded with the
  server-rendered first page as `fallbackData`, plus `revalidateFirstPage: false` and
  `revalidateOnMount: false`. Without those two, SWR refetches page 0 on every profile view
  and we pay for the SSR page twice. Stops when `last === true`. Reuses
  `components/ui/loadMoreButton/index.tsx`.
  `components/hooks/useEvents.ts` is hardwired to `/api/events` and its query shape, so it is a
  reference, not a dependency.
- Service worker: the new route falls under the existing `/api/` StaleWhileRevalidate
  catch-all (`public/sw-template.js:249`). That is correct here, since it's public,
  non-personalised data. Do **not** add it to the `NetworkOnly` block, which exists for auth
  and per-user routes (LESSONS.md). No version bump to do by hand: `prebuild` runs
  `scripts/generate-sw.mjs`, which substitutes `{{BUILD_VERSION}}` into the template on every
  build.

## Files at a glance

| Area | Files |
|---|---|
| New primitive | `components/ui/common/tabs/index.tsx`, DESIGN.md tab + empty-state specs |
| Profile routes | `app/[locale]/perfil/[username]/{layout,page}.tsx`, `.../passats/page.tsx` |
| Profile parts | `components/partials/ProfileEventsSection.tsx` (replaces `ProfilePageShell.tsx`), `components/ui/profile/{ProfileHeader,ProfileOwnerActions}.tsx` |
| Favourites | `app/[locale]/preferits/{layout,page}.tsx`, `.../passats/page.tsx`, `.../loadFavoritesData.ts` |
| API layer | `lib/api/users-external.ts`, `lib/api/profiles.ts`, `app/api/users/[username]/events/route.ts`, `proxy.ts` |
| Types & validation | `types/props.ts` (all new component props), `types/api/profile.ts`, `lib/validation/user.ts` (`upcomingEventCount`, `pastEventCount`, both `.nullish()`) |
| Utils | `utils/event-helpers.ts` (`partitionByTemporalStatus`) |
| i18n | `messages/{ca,en,es}.json` |

## Loose ends to settle during implementation

- **A zero-count tab: always show both.** Hiding the Passats tab at 0 makes the tab bar change
  shape between profiles, which reads as a bug, and since the count is an optional field we'd
  need a second rule for "unknown" versus "zero". Always showing both means no condition at
  all, and an empty tab is honest: this organizer is new.
- **If Gerard's work slips, there is a one-line stopgap.** Bumping `PROFILE_EVENTS_PAGE_SIZE`
  from 20 to 100 (`ProfilePageShell.tsx:17`) makes the existing post-fetch filter find
  upcoming events for any organizer with under 100 total, which is realistically all of them.
  It's a band-aid over the actual bug (filtering after paginating) and costs a fatter payload
  on every profile view, so it's only worth it if the backend is days away rather than hours.
- **Existing users already lost their data.** Anyone who opened `/preferits` since #430 shipped
  has had their expired favourites permanently deleted. Their Passats tab will be empty and
  that is not a bug. Worth saying out loud before QA reports it as one.
- **`types/props.ts`**: `ProfilePageShellProps` becomes orphaned when the shell dissolves.
  Remove it rather than leaving it behind.

## Verification

1. `yarn typecheck && yarn lint`, the gate named in `.claude/CLAUDE.md`, plus
   **`yarn i18n:check && yarn i18n:validate`**. Key parity is enforced, not advisory:
   `i18n:check` runs `@lingual/i18n-check` with `ca` as source against `missingKeys`, and both
   commands are wired into the lint-staged hook (`package.json:47-48`), so a commit that adds
   keys to `ca` alone is rejected. `yarn i18n:sync` scaffolds the `en`/`es` entries.
   `i18n:validate` separately checks that placeholders like `{count}` match what the code
   passes, which matters for the new `statsPublished` / `countLabel` strings.
2. Unit: `partitionByTemporalStatus` is total, i.e. `upcoming.length + past.length ===
   events.length` for every input **including an event with an unparseable date**, plus the
   all-day and timed boundary cases `computeTemporalStatus` distinguishes. Vitest, mirroring
   the existing `utils/event-status` tests.
3. **`test/profile-page-shell.test.tsx` needs rewriting, not repointing.** It imports
   `ProfilePageShell` directly and its fixtures are built around "future dates so
   filterActiveEvents keeps it", which is the exact behaviour being deleted. It becomes a test
   of `ProfileEventsSection` asserting that the `status` argument reaches `fetchUserEvents` and
   that whatever the backend returns is rendered unfiltered.
4. Add a gate test asserting `/api/users/{u}/events` passes the public GET check while
   `/api/users/me/profile` and `/api/users/me/avatar` still do not. That is the regression that
   a careless widening of the pattern would cause.
5. **The original bug, explicitly**: the reported profile (Gerard's link, all events expired
   20+ days ago) must show its past events under Passats and an empty state under Propers.
   Today both are empty. This is the acceptance test.
6. Browser check via the `agent-browser` skill against the dev server: tab switching, active
   underline, `aria-current`, keyboard tab order, mobile horizontal scroll, and the noindex
   header on `/perfil/[username]/passats` and `/preferits/passats`. Include **one non-default
   locale** (`/es/perfil/...`) to confirm the locale-prefixed hrefs resolve.
7. Favourites: verify writes on the **Coolify preview, not localhost**, since the
   `/api/favorites` CSRF origin allowlist passes on localhost and 403s elsewhere (LESSONS.md).
   Confirm an expired favourite survives a page load for an authed user instead of being
   deleted, and that a guest's expired favourite is still pruned as before.
8. **PPR shell check**, the one most likely to regress silently: view source on
   `/perfil/[username]` and confirm the header, the tab bar and their counts are present in
   the prerendered HTML while the card grid arrives as a streamed Suspense hole. If the tabs
   are missing from the shell, a count is being read from a dynamic fetch. Build output must
   show no "Uncached data was accessed outside of `<Suspense>`" error and no unintended
   switch to dynamic rendering.
9. Check the network tab on a profile load: exactly one request for the first page of events,
   not two.
10. E2E: extend the existing profile spec in `e2e/` for both tabs. Per LESSONS.md the deploy
    E2E gate is event-data-dependent and PPR returns 200 for missing events, so assert on
    `data-testid` content, not status codes.
11. Run the `doc-sync` skill at the end: LESSONS.md needs the reversal of #430's pruning
    recorded, AGENTS.md the new route shape.

## Sequencing

Phases 1 and 2 ship together as one PR. That fixes the reported bug and needs only Gerard's
`status` param. Phase 4 follows once that's green. Phase 3 ships last, gated on the
favourites cap rule. Phase 1 has no backend dependency and can start now.
