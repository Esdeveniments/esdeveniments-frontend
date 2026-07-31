# Favourites: past events (Preferits Passats)

**Date:** 2026-07-31

---

## Context

`/preferits` currently shows only active (upcoming/in-progress) favourites for
everyone. Expired favourites are auto-pruned: `FavoritesAutoPrune` computes
`eventIdsToRemove`/`slugsToRemove` from expired events and POSTs them to
`/api/favorites/prune`, which removes cookie slugs (guest branch) or
issues backend DELETEs (authenticated branch, added in PR #430).

This was a deliberate quota-protection measure: `docs/plans/2026-07-30-profile-events-split.md`
assumed `MAX_FAVORITES=10` counted every stored favourite, active or past, and
that keeping expired ones around would let a user get permanently stuck at
the cap. That assumption turned out to be wrong — verified directly against
`Esdeveniments/esdeveniments-backend` on `develop` (the branch preprod
deploys): `UserFavoriteEventServiceImpl.addFavorite()` has no count check, no
409, no cap logic anywhere. A whole-repo search for `MAX_FAVORITES`/limit/quota
in the favourites domain returns zero hits, across every branch. The
frontend's `409 MAX_FAVORITES_REACHED` handling in `route.ts` is checking for
a status the backend never returns.

Goal: show past favourites in a dedicated tab, mirroring the existing profile
Propers/Passats pattern (`/perfil/[username]` + `/perfil/[username]/passats`),
and stop pretending there's a hard backend-enforced cap for authenticated
users while there isn't one.

Prerequisite this design assumes already shipped: `lib/api/favorites-external.ts`
sends the required `period=active|past` param and merges both (PR #438,
merged to `develop`).

## Scope

**In scope:**
- New `/preferits/passats` route for authenticated users, showing past
  favourites, structured like the profile Propers/Passats pattern.
- `Tabs` header added to `/preferits` (authenticated users only).
- Stop auto-pruning expired favourites for authenticated users.
- Split `MAX_FAVORITES` into a guest-only cookie cap (unchanged, still 10)
  and a higher, client-side-only soft limit for authenticated users.
- DRY the tab-item-building and events-section-rendering code shared between
  the profile and favourites Propers/Passats patterns.

**Out of scope:**
- Any backend change. Nothing here asks Gerard for anything.
- Guests getting past favourites. Guests keep today's behaviour exactly:
  single flat `/preferits` page, cookie storage, prune-on-expire, cap of 10.
- Pagination / "load more" beyond the first page, matching the profile
  pattern's own current v1 scope (`ProfileEventsSection`'s comment: "load
  more... is a follow-up; v1 renders the first page").
- Removing the soft limit for authenticated users entirely (explicitly
  rejected in review — a raised soft limit was requested instead).

## Architecture

Mirror the profile pattern exactly:

- `/preferits` (existing route, `app/[locale]/preferits/page.tsx`) becomes
  the "active" tab: same content as today, `Tabs` header added above it for
  authenticated users only.
- New `app/[locale]/preferits/passats/page.tsx`, same shape as
  `app/[locale]/perfil/[username]/passats/page.tsx`: `Tabs` header (active
  tab = "past") + the past-favourites list.
- `components/ui/common/tabs/index.tsx` (`Tabs`) is reused unchanged — it's
  already generic (`TabItem[]`, route-based `<Link>` nav), not
  profile-specific.

A single page with client-side tab-switching was considered and rejected:
`Tabs`'s own code comment explains it's deliberately route-based (a client
`usePathname`-driven switch would need a client component and mishandle
locale-prefixed/prefix-matching hrefs).

## Data layer

**Shared tab-items builder.** New `components/partials/period-tabs.ts`
exports `buildPeriodTabItems({ activeHref, pastHref, activeLabel, pastLabel,
activeCount, pastCount }): TabItem[]` — the generic two-tab shape.
`components/partials/profile-tabs.ts`'s `buildProfileTabItems` becomes a
thin wrapper over it (maps `profile.upcomingEventCount`/`pastEventCount` and
`tProfile("tabUpcoming"/"tabPast")` into the generic call). New
`components/partials/favorites-tabs.ts`'s `buildFavoritesTabItems` does the
same for favourites, its own translation namespace/counts.

**Shared rendering, separate fetching.** `components/partials/ProfileEventsSection.tsx`
currently mixes fetching (`fetchUserEvents`) and rendering (empty-state vs
`List`/`CardServer`). Extract the rendering half into a presentational
`EventsSection` component (props: `events`, `emptyTitle`, `sectionLabel`,
`testId`, `initialIsFavorite?: boolean` — defaults false for profile, true
for favourites, matching how `preferits/page.tsx` already hardcodes
`initialIsFavorite` on `<CardServer>` today). `ProfileEventsSection` keeps
fetching, hands off to `EventsSection`. New `FavoritesEventsSection` fetches
via favourites, hands off to the same `EventsSection`. This touches
currently-working profile code, not just new favourites code.

**Splitting the merged fetch.** `lib/api/favorites-external.ts` already has a
private `fetchFavoritesPeriod` helper (added in PR #438) doing single-period
calls. Export it publicly (renamed `listFavoriteEventsByPeriodExternal`) so
each tab page fetches only its own period directly — one call instead of the
merge-then-filter both current call sites do today. The merged
`listFavoriteEventsExternal` stays for `/api/favorites` GET only (needs both
periods for the SWR heart-icon-state check in `FavoriteButton`, which must
know if ANY favourite, active or past, matches a given card).

**Tab counts.** Each page needs both totals for its `TabItem.count`s. New
`getFavoritesTabCounts(accessToken)` helper (shared by both preferits pages):
one real fetch for the current page's own period at full size, one cheap
`size=1` fetch for the other period (Spring Data's `Page.getTotalElements()`
reflects the full count regardless of requested `size`, so this is a cheap,
correct way to get just the number).

**`MAX_FAVORITES` split.** `utils/constants.ts`'s `MAX_FAVORITES = 10` stays
exactly as-is, scoped to guest/cookie code only (`utils/favorites.ts`,
`app/api/favorites/migrate/route.ts`, `app/api/favorites/prune/route.ts`
guest branch — none of these change). New `MAX_FAVORITES_AUTHENTICATED = 50`
constant for authenticated fetch `size`s and the new soft-limit check.

**Soft limit enforcement (authenticated).** Client-side only, in
`components/ui/common/favoriteButton/index.tsx`: before POSTing an add,
compare the already-fetched SWR favourites count (`favoritesData.favorites.length`)
against `MAX_FAVORITES_AUTHENTICATED`. No new network round-trip. Not
race-proof across multiple tabs/devices — accepted, since this is explicitly
a soft UX guard, not a real backend rule (there is no real backend rule to
enforce). Reuses the existing `t("maxReached", {max})` copy/analytics event,
parameterized with the new max.

**Stop auto-pruning for authenticated users.** `preferits/page.tsx`'s
`loadFavoritesData()` stops computing `eventIdsToRemove` from expired events
for the authenticated branch — that computation goes away entirely (not
just skipped-and-unused). Guests keep today's `slugsToRemove` behaviour
(expired + not-found slugs) completely unchanged.

## Error handling & edge cases

- **Backend failure on `/preferits/passats`**: same `backendUnavailable`
  error state as `/preferits` today (`data-testid="favorites-page-error"`,
  same copy), driven by `listFavoriteEventsByPeriodExternal` returning
  `null` on failure.
- **Guest visiting `/preferits/passats` directly** (typed URL, bookmarked,
  etc.): past favourites are logged-in only. Gate the page using the same
  pattern as `EditProfileAuthGate`/`PublishAuthGate`
  (`app/[locale]/perfil/edita/EditProfileAuthGate.tsx`) — same shape, own
  copy, redirect to `/iniciar-sessio?redirect=/preferits/passats`.
- **Guests on `/preferits`**: unchanged. No `Tabs` header renders at all;
  single flat page exactly like today. `Tabs` only renders for authenticated
  users on both routes.
- **Soft-limit reached (authenticated)**: existing `maxReached` UI/copy in
  `FavoriteButton`, parameterized with `MAX_FAVORITES_AUTHENTICATED` instead
  of `MAX_FAVORITES`.

## Testing

- New `test/period-tabs.test.ts` (or extend `test/profile-tabs.test.ts`'s
  pattern) covering `buildPeriodTabItems`.
- New `test/favorites-tabs.test.ts` covering `buildFavoritesTabItems`.
- Extend `test/favorites-external.test.ts` with a direct
  `listFavoriteEventsByPeriodExternal` single-period test (distinct from the
  existing merge tests).
- Update `test/favorites-page-auto-prune.test.ts`: replace assertions of
  authenticated expiry-pruning with assertions that no prune call happens
  for authenticated users; guest-path assertions stay as-is.
- Extend `test/FavoriteButton.test.tsx` with the soft-limit check.
- New tests for `/preferits/passats` SSR (error/empty/populated states),
  mirroring however `/preferits` is tested today.
- `test/profile-events-section.test.tsx` (existing) must keep passing
  unmodified through the `ProfileEventsSection`/`EventsSection` split — it's
  the regression check that the extraction didn't change profile behaviour.

## Open items for the implementation plan (not blocking this spec)

- Exact wiring of the auth gate on `/preferits/passats` (SSR redirect vs.
  client component like `EditProfileAuthGate`) — precedent exists, exact
  mechanism decided during implementation planning.
- Final copy for the empty-past-favourites state
  (`App.Favorites` needs new translation keys, e.g. mirroring
  `Components.Profile.noPastEvents`).
