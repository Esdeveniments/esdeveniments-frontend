# Auth/profile/favorites-tabs analytics + doc sync — design

Date: 2026-08-02
Status: implemented

Note: the "Verified gaps" and "D." sections below describe the state
*before* this spec was implemented (e.g. `useEventAnalytics.ts` had zero
call sites at the time this was written). Both are now fixed by this PR —
left in the past-tense-implied wording it was authored with, as a record
of what the plan set out to fix, not the current state of the code.

## Context

Between commits `dcda2d6b`..`b263bad8` on `develop`, the app grew a full Logto-based
auth system, a profile page with tabs, an edit-profile/avatar flow, and a
past-favourites tab. None of it has analytics instrumentation, and none of it
is documented in the top-level project docs. This spec covers closing both
gaps in one pass.

Verified gaps (not assumed):

- 6 auth-gate components carry `data-analytics-action="..."` attributes that
  look wired but are read by nothing in the codebase (dead markup).
- Login is also reachable from the navbar (3 spots) and the footer (1 spot),
  none instrumented.
- Login/logout is a server-side OIDC redirect (Logto) — no client-side event
  fires on success or failure. The callback route already produces
  `?auth_error=reason` on failure, but nothing consumes it.
- Profile page, edit-profile page, avatar upload, and the two new past-tabs
  have zero custom events. Tab switches themselves are ordinary route
  navigations, so the existing generic GA `page_view` already covers them —
  not a gap.
- `app/[locale]/e/[eventId]/hooks/useEventAnalytics.ts` is fully dead code
  (zero call sites anywhere), pre-existing and unrelated to this feature
  work, folded into this pass per user decision.
- `README.md` / `AGENTS.md` have zero mention of Logto/auth/profile/favorites-tabs.
  `AGENTS.md`'s skill table has no auth entry. `api-layer-patterns/SKILL.md`
  documents a stale pre-Logto `POST /api/auth/register` HMAC pattern.
  `docs/README.md` indexes an unrelated, finished Oct-2025 design-migration
  project.
- `/registre` is linked from `PublishAuthGate` but has no route/rewrite
  serving it — likely a dead signup link. **Flagged, not fixed** — unrelated
  to analytics/docs.
- No client-visible UI currently reacts to `auth_error` — this spec only adds
  the analytics event, not an error toast. **Flagged, not fixed.**
- Logto's hosted UI doesn't let the app distinguish login vs. signup intent,
  so `auth_success`/`auth_failure` can't be split into separate funnels.

## A. Auth click + funnel tracking

One new client component, `components/analytics/AuthEventTracker.tsx`,
mounted once in `app/[locale]/layout.tsx` next to `<GoogleScripts />`.

1. **Delegated click listener** (mount-once `document` click listener):
   `event.target.closest("[data-analytics-action]")` → fires
   `sendGoogleEvent("auth_gate_click", { action })`. Activates the 6 existing
   dead attributes with no changes to those files. Extends the same
   attribute (new, this spec) to:
   - Navbar: `navbar_login_desktop`, `navbar_login_mobile_icon`,
     `navbar_login_mobile_menu`, `navbar_logout_desktop`,
     `navbar_logout_mobile`.
   - Footer: `footer_login`.
2. **Success/failure one-shot tracker**: reads `auth_success` / `auth_error`
   from `useSearchParams()` once (same one-shot-URL-marker pattern as
   `edit_suggested=true` on the event page), fires `sendGoogleEvent("auth_success", {})`
   or `sendGoogleEvent("auth_failure", { reason })`, then strips the param via
   `router.replace`. Needs a `Suspense` boundary (same reason
   `GoogleAnalyticsPageview` has one).
   - `app/api/auth/callback/route.ts`: add `auth_success=1` to the success
     redirect URL (mirrors the existing `fail()` helper's `auth_error=reason`).

## B. Page-view + funnel events

- `FavoritesPageTracker.tsx`: add optional `period?: "active" | "past"` prop
  (default `"active"`), included in the `favorites_page_view` payload. Reused
  on `/preferits` (existing) and `/preferits/passats` (new) — no duplicate
  component.
- New trackers, same shape as `FavoritesPageTracker`:
  - `app/[locale]/perfil/[username]/ProfilePageTracker.tsx` →
    `profile_page_view` (`username`, `is_own_profile`, `upcoming_count`).
  - `app/[locale]/perfil/[username]/passats/PastEventsPageTracker.tsx` →
    `profile_past_events_page_view` (`username`, `is_own_profile`, `past_count`).
  - `app/[locale]/perfil/edita/EditProfilePageTracker.tsx` →
    `edit_profile_page_view` (`is_onboarding`).
- `EditProfileForm.tsx` (`onSubmit`): `edit_profile_submit_attempt` →
  `edit_profile_submit_blocked` (`reason: "username_taken" | "session_expired"`)
  / `edit_profile_submit_error` (`reason: "generic"`) /
  `edit_profile_submit_success` (`is_onboarding`, `redirected`).
- `EditProfileAvatar.tsx`: `avatar_upload_start` → `avatar_upload_error`
  (`reason: "unsupported_type" | "too_large" | "upload_failed"`) /
  `avatar_upload_success`; `avatar_remove_success` / `avatar_remove_error`.

## C. CTA session tracking (existing `cta_session` mechanism, reused)

Add `"profile_edit_cta"` and `"profile_claim_cta"` to `TRACKED_CTA_IDS` in
`types/analytics.ts`. Wire `useTrackedCta` into `ProfileOwnerActions.tsx` and
`ProfileClaimCta.tsx`, same shape as `FavoriteButton`/`HeroCTA`/`CalendarList`
(wrap the `Link` in a `<div ref={ctaRef}>`, call `trackClick()` on click). No
new event name.

## D. `useEventAnalytics.ts`

Move the `view_event_page` tracking effect (currently inline in
`EventClient.tsx`) into `useEventAnalytics(event)`. `EventClient.tsx` calls
the hook instead of running the effect inline. Behavior-identical; the hook
stops being orphaned.

## E. Docs

- New `.github/skills/auth-patterns/SKILL.md`: Logto OIDC flow, `useAuth()`
  contract, the hydrate-once/`refetchUser()` gotcha (from `LESSONS.md`), the
  4 auth routes, the `data-analytics-action` convention this spec
  establishes. Added to `AGENTS.md`'s skill table.
- `api-layer-patterns/SKILL.md`: remove the stale `POST /api/auth/register`
  HMAC example; point to `auth-patterns` instead.
- `AGENTS.md`: `LOGTO_*` in Local Setup env vars; one line on auth
  architecture under Architecture Overview.
- `README.md`: `LOGTO_*` in the Environment section.
- `docs/README.md`: rewritten as a real index of the current `docs/` folder
  (Auth & Profiles, Incidents, Design, Plans). The Oct-2025 migration content
  is not deleted — it already lives in full in `design-system-overview.md` /
  `implementation-reference.md`; this file stops being their stale front door.

## Testing

- Unit tests (Vitest + RTL), mocking `sendGoogleEvent` and asserting call
  args — same style as `test/publica-analytics.test.tsx`:
  - `AuthEventTracker`: delegated click fires `auth_gate_click` with the
    right `action`; ignores clicks without the attribute; `auth_success` /
    `auth_failure` fire once and strip the query param.
  - `FavoritesPageTracker`'s new `period` prop.
  - `EditProfileForm` / `EditProfileAvatar` funnel events.
  - `useEventAnalytics` still fires `view_event_page` (adapt existing
    coverage from `EventClient`'s current inline test, if any).
- `yarn lint && yarn typecheck && yarn test` before opening the PR.
- GA only fires on `isProdHost` / non-E2E, so no live-browser GA
  verification is possible in dev — same limitation `GoogleScripts.tsx`
  already documents. Verification is via unit tests, not manual browsing.

## Out of scope (flagged only)

- `/registre` dead signup route.
- Missing UI reaction to `auth_error` (toast/message).
- Login vs. signup funnel split (not possible with current Logto wiring).
