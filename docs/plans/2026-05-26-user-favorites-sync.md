# Plan — Backend `name`+`username` user model + server-side favorites

**Branch base:** `cursor/development-environment-setup-1108` (head `1a87396d`)
**New branch:** `feat/user-favorites-sync`
**Backend swagger:** https://api-preproduction.esdeveniments.cat/v3/api-docs
**Date:** 2026-05-26

---

## Phase 0 — Documentation discovery (done)

### Backend contract (verified against live swagger)

| Endpoint | Method | DTO | Notes |
|---|---|---|---|
| `/api/auth/register` | POST | `RegisterRequestDTO { email, password, name }` → `AuthMessageResponseDTO { message }` | unchanged |
| `/api/auth/login` | POST | `LoginRequestDTO { email, password }` → `AuthResponseDTO { accessToken, tokenType, expiresAt, user }` | unchanged |
| `/api/auth/me` | GET | → `AuthenticatedUserDTO { id: uuid, email, name, username, role, emailVerified }` | **changed**: adds `username`, `id` is `uuid` (string) not number |
| `/api/users/{username}` | GET | → `UserPublicResponseDTO { id, name, username }` | **new**, minimal public profile |
| `/api/users/me/favorites/events` | GET (`page`,`size`) | → `PagedResponseDTO<EventSummaryResponseDTO>` | **new**, paged |
| `/api/users/me/favorites/events/{eventId}` | GET | → `FavoriteStatusResponseDTO { favorite: bool }` | **new** |
| `/api/users/me/favorites/events/{eventId}` | POST | — | **new**, idempotent add |
| `/api/users/me/favorites/events/{eventId}` | DELETE | — | **new** |

### Role enum gains `"ORGANIZATION"` (was `USER` \| `ADMIN`).

### Pre-existing bugs to fix during migration

1. `types/api/auth.ts` declares `AuthenticatedUserDTO.id: number` — swagger says `string`/uuid. Fix while editing.
2. `types/api/auth.ts` `AuthenticatedUserDTO` does not list `username` — add.

### Existing patterns to copy from

- HMAC + Bearer fetch wrapper: `lib/api/fetch-wrapper.ts` via `fetchWithHmac` (already forwards `Authorization` header — see usage in `lib/api/auth-external.ts:91-105` `getMeExternal`).
- External API client with Zod validation: `lib/api/auth-external.ts` is the reference shape — wraps `fetchWithHmac`, parses with a `parseX` helper, returns `{ data, error, status }`.
- Zod validator pattern: `lib/validation/auth.ts` (`parseAuthUser`, `parseAuthResponse`).
- Cookie-backed favorites store (guest path): `utils/favorites.ts` + `utils/favorites-queue.ts`.
- Existing routes to follow: `app/api/auth/me/route.ts` (bearer forwarding), `app/api/favorites/route.ts` (cookie path).

### Anti-patterns to avoid

- **Do not** invent `displayName`, `slug`, `avatarUrl`, `bio`, `joinedDate`, `totalEvents`, `socialLinks` on the new user/profile DTO — backend public DTO is `{ id, name, username }` only.
- **Do not** call `next/link`; use `@i18n/routing` (project rule).
- **Do not** add `searchParams` to listing pages (CLAUDE.md $300 incident).
- **Do not** import Zod in client bundles — keep all parsers under `lib/validation/*` and call them from server-only modules. See zod-bundle baseline from `1a87396d`.
- **Do not** add `next: { revalidate }` to auth/favorites fetches — they are per-user.

### Resolved open question (assumed default — flag if wrong)

- **Q1 — Profile DTO shrinkage:** assume **(a) strip UI to match new endpoint** (`{ id, name, username }`). Hide bio/avatar/cover/socials/totalEvents until backend grows the DTO. Keep `ProfileClaimCta` since it doesn't read from the DTO. → If you want option (b) instead, change before Phase 4.
- **Q2 — Cookie → server merge on login:** best-effort POST per cookie ID; ignore individual failures; clear cookie after attempting all. Single batch on `login` success.
- **Q3 — Username immutability:** assume immutable (no rename redirects). Revisit if backend exposes rename.
- **Q4 — Events posted by user feed:** deferred — not yet in swagger.

---

## Phase 1 — Branch + type alignment

**Goal:** correct DTOs and internal types so the rest of the work compiles against truth.

### Tasks

1. Create branch: `git switch -c feat/user-favorites-sync cursor/development-environment-setup-1108`.
2. Edit `types/api/auth.ts`:
   - `AuthenticatedUserDTO`: `id: string` (uuid), add `username: string`, keep `name`, `role`, `emailVerified`.
3. Edit `types/auth.ts`:
   - `AuthRole`: add `"ORGANIZATION"` member.
   - `AuthUser`: drop `displayName`, `profileSlug`. Add `name: string`, `username: string`. Keep `id`, `email`, `role?`, `emailVerified?`, `avatarUrl?` (UI-only field, never sent by backend; keep optional for future).
   - `RegisterCredentials`: rename `displayName` → `name`.
4. Add `types/api/user.ts`:
   ```ts
   export interface UserPublicResponseDTO {
     id: string;
     name: string;
     username: string;
   }
   ```
5. Add `types/api/favorites.ts`:
   ```ts
   import type { EventSummaryResponseDTO, PagedResponseDTO } from "./event"; // confirm exact path
   export interface FavoriteStatusResponseDTO { favorite: boolean; }
   export type FavoriteEventsPageDTO = PagedResponseDTO<EventSummaryResponseDTO>;
   ```
   - Verify `PagedResponseDTO<T>` + `EventSummaryResponseDTO` already exist (grep `types/api`); reuse, don't redeclare.

### Verification

- `yarn typecheck` passes after this phase only if downstream usages compile. Expect breakage in adapter/UI — that's Phase 2/3's job. Run typecheck and **save the error list** as the Phase-2 work queue.
- `grep -rn "displayName\|profileSlug" --include='*.ts' --include='*.tsx'` enumerates every site to migrate.

### Anti-pattern guards

- Don't add fields that aren't in swagger to user DTOs (`avatarUrl`, `bio`, etc.).

---

## Phase 2 — Auth adapter + validation migration

**Goal:** auth round-trip uses the new DTO shape end-to-end.

### Tasks

1. `lib/validation/auth.ts` — update Zod schema for `AuthenticatedUserDTO`:
   - `id: z.string().uuid()`, `name: z.string()`, `username: z.string()`, `email: z.string()`, `role: z.enum(["USER","ADMIN","ORGANIZATION"])`, `emailVerified: z.boolean()`.
   - Keep `parseAuthUser`, `parseAuthResponse`, `parseAuthMessageResponse`, `parseAuthError` exports stable.
2. `lib/auth/api-adapter.ts` — DTO→`AuthUser` mapper:
   - `name = dto.name`, `username = dto.username` (no client-side slug derivation).
   - Register flow: forward `name` field name (already correct in `lib/api/auth-external.ts:registerExternal`, but verify after type rename in `RegisterCredentials`).
3. `lib/auth/mock-adapter.ts` — update fixtures to include `username`. Pick `username: "razzmatazz"` so the mock profile page still resolves.
4. Update consumers of `AuthUser.displayName` / `.profileSlug` (use Phase 1 grep output). Likely sites:
   - `components/hooks/useAuth.ts`
   - `components/ui/auth/*` (forms display name field → label "Nom")
   - `components/partials/ProfilePageShell.tsx`
   - `lib/auth/AuthProvider.tsx`, `DevAuthProvider.tsx`
   - Navbar/footer auth integration (`feat: navbar, mobile bar, hamburger, and footer auth integration` from `22ad42f6`)
5. Update i18n keys if any reference "displayName".

### Verification

- `yarn typecheck` clean (Phase 1 errors resolved).
- Update + run unit tests:
  - `test/auth-types.test.ts`, `test/auth-adapter.test.ts`, `test/auth-api-adapter.test.ts`, `test/auth-external.test.ts`.
- `grep -rn "displayName\|profileSlug"` returns zero hits in `lib/`, `components/`, `app/`, `types/`.

### Anti-pattern guards

- Don't derive `username` from `name` on the client — backend owns the slugification. We read what the API returns.

---

## Phase 3 — Profile page: switch to `/api/users/{username}`

**Goal:** profile route resolves against the live user endpoint, stripped to the fields the public DTO actually returns.

### Tasks

1. New API client `lib/api/users-external.ts`:
   - `getUserByUsernameExternal(username: string): Promise<UserPublicResponseDTO | null>`
   - Mirror the structure of `lib/api/auth-external.ts:getMeExternal` (`fetchWithHmac`, 404 → null, validation via new `parseUserPublic`).
   - Add `parseUserPublic` to a new `lib/validation/user.ts`.
2. Rewrite `lib/api/profiles-external.ts` to delegate to `getUserByUsernameExternal` — or delete it and update callers directly. Decide based on call-site count; if ≤3 call sites, delete and inline.
3. Update `lib/api/profiles.ts` (server-only wrapper) to use the new client.
4. Update `types/api/profile.ts`:
   - Replace `ProfileDetailResponseDTO` / `ProfileSummaryResponseDTO` with a thin alias of `UserPublicResponseDTO`, or delete the file if no other consumer survives.
5. Update `lib/validation/profile.ts` — replace with re-export of `parseUserPublic`, or delete.
6. Update UI:
   - `components/ui/profile/ProfileHeader.tsx` — render `name` and `@username`. Remove bio/avatar/cover/website/joinedDate/totalEvents/socials sections (keep them commented-out with `// TODO(backend): waiting on richer user DTO` only if you want — per code-quality rules, prefer **delete**).
   - `components/partials/ProfilePageShell.tsx` — drop props that no longer exist.
   - `components/ui/profile/ProfileClaimCta.tsx` — keep (logic doesn't read removed fields).
   - `components/ui/profile/ProfileOwnerActions.tsx` — gate by `session.user.username === routeUsername` instead of `profileSlug`.
7. Route param rename: if the dynamic segment is `[slug]`, rename to `[username]` (verify under `app/[locale]/`); update `generateStaticParams`, `not-found`, `loading`, `metadata`, and all internal links.
8. Sitemap `app/server-profile-sitemap.xml/route.ts` — temporarily emit an empty `<urlset>` until backend exposes a username list endpoint. (Mark with one-line TODO + open issue.)
9. `app/api/profiles/[slug]/route.ts` — rename to `[username]` and delegate to new client. If it's only used by internal SSR fetches we could delete entirely; check callers first.

### Verification

- `yarn typecheck && yarn lint` clean.
- `e2e/auth-profile.flow.spec.ts` — update assertions to match stripped UI, then run.
- Manual: hit `/profile/<username>` for the mock user (`razzmatazz` from mock-adapter) in dev and confirm renders.
- `grep -rn "profileSlug\|ProfileDetailResponseDTO\|ProfileSummaryResponseDTO"` → zero.

### Anti-pattern guards

- Do not synthesize `bio`/`avatarUrl` from nothing. If the field isn't on `UserPublicResponseDTO`, the UI doesn't render it.
- Do not preserve the mocked rich profile data in `MOCK_PROFILES` — delete with the old client.

---

## Phase 4 — Favorites: server-backed when authenticated

**Goal:** authenticated users' favorites round-trip through the backend; guests keep the cookie path; cookie → server migration runs once on login.

### Tasks

1. New `lib/api/favorites-external.ts`:
   - `listFavoritesExternal(accessToken, page, size): Promise<FavoriteEventsPageDTO | null>`
   - `isFavoriteExternal(accessToken, eventId): Promise<boolean>`
   - `addFavoriteExternal(accessToken, eventId): Promise<{ ok: boolean; status: number }>`
   - `removeFavoriteExternal(accessToken, eventId): Promise<{ ok: boolean; status: number }>`
   - Pattern: copy structure from `lib/api/auth-external.ts:getMeExternal` (HMAC + Bearer forwarding, JSON parse, no `next.revalidate`).
2. New `lib/validation/favorites.ts`:
   - `parseFavoriteStatus(input): boolean | null`
   - `parseFavoriteEventsPage(input): FavoriteEventsPageDTO | null`
3. New service `utils/favorites-service.ts` (server-callable):
   - Inputs: `{ session?: AuthUser | null; accessToken?: string }`
   - `list()` — authed → backend paged call (consolidate first N pages or return paged shape; pick one — see decision below); guest → cookie IDs.
   - `add(id)`, `remove(id)`, `has(id)` — branch on session.
   - **Decision:** for the listing page, request `size=50` page 0 in v1; pagination UI is out of scope. Document with TODO if user count grows.
4. Update API routes `app/api/favorites/route.ts` + `app/api/favorites/prune/route.ts`:
   - If session bearer present → delegate to favorites-external; else → existing cookie logic.
   - For `prune`: authed users don't need prune (server keeps state); make it a no-op for authed.
5. Update `components/ui/common/favoriteButton/index.tsx` and `FavoriteButtonOverlay.tsx`:
   - Same UX (optimistic UI, `queueFavoriteRequest`); call `/api/favorites` which now branches server-side. **Client code does not change behavior** — keep changes minimal here.
6. Update preferits page server-fetch (`app/[locale]/preferits/page.tsx` or equivalent) to use `favorites-service.list()`. Authed users get rich event objects directly from backend; guests get cookie-ID array, then existing event-fetch path resolves them.
7. Login-side migration:
   - In `lib/auth/api-adapter.ts` `login` (and any auth callback that lands an authed session), after a successful login: read `parseFavoritesCookie`, POST each ID via `addFavoriteExternal`, then `cookieStore.delete(FAVORITES_COOKIE_NAME)`. Wrap in `try/catch`, swallow per-ID failures (log), single best-effort batch.
   - Add unit test covering migration path.
8. `utils/favorites-queue.ts` — keep as-is; it serializes client requests regardless of branch.

### Verification

- Unit tests:
  - Update `test/favorites-cookie.test.ts`, `test/favorites-actions.test.ts`, `test/favorites-page-auto-prune.test.ts`, `test/FavoriteButton.test.tsx`, `test/favorites-heart-visibility.test.tsx` to cover both branches via mocked session.
  - New `test/favorites-external.test.ts` mocking `fetchWithHmac`.
  - New `test/favorites-login-migration.test.ts`.
- E2E:
  - `e2e/favorites.flow.spec.ts` — adapt for guest flow.
  - New `e2e/favorites-authed.flow.spec.ts` covering: login → add favorite → reload → still there → logout → cookie empty.
  - `e2e/cache-control-favorites-cookie.spec.ts` — verify Cache-Control still set correctly for guest cookie path; assert no-store for authed responses.
- `yarn typecheck && yarn lint && yarn test` clean.

### Anti-pattern guards

- Don't write favorites to **both** cookie and server when authed — single source of truth.
- Don't synchronously block login on the migration POSTs — fire them and resolve; failures don't fail the login.
- Don't import `favorites-external.ts` from client components — it's bearer-token code, server-only.
- Don't drop `queueFavoriteRequest` — the multi-button race it solves still exists.

---

## Phase 5 — Verification

### Static checks
- `yarn typecheck` — zero errors.
- `yarn lint` — zero errors.
- `grep -rn "displayName\|profileSlug\|ProfileDetailResponseDTO\|ProfileSummaryResponseDTO\|MOCK_PROFILES"` — zero hits in `lib/`, `app/`, `components/`, `types/`.
- `grep -rn "from \"zod\"" --include='*.tsx'` in `app/` and `components/` — confirm no zod regressions in client bundle (per `1a87396d` baseline).
- `yarn analyze` (or whatever the bundle baseline script is) — confirm no new client chunks materially larger than `cursor/development-environment-setup-1108` baseline.

### Tests
- `yarn test` — all unit suites green.
- `yarn e2e` (or per-spec) — auth-profile and favorites flows green.

### Manual smoke (dev server)
- Register a fresh user → verify `username` shows in profile dropdown.
- Hit `/<username>` route — public profile renders with `name` + `@username`.
- Logged out, favorite 3 events via heart icon → cookie holds IDs.
- Log in → cookie cleared, GET `/api/users/me/favorites/events` returns the 3 events.
- Toggle a favorite while authed → reload → state preserved.
- Log out → cookie state untouched (does not repopulate from server).

### Anti-pattern grep gate (final)
```
grep -rn "next: { revalidate" lib/api/{auth,favorites,users}-external.ts  # → zero
grep -rn "MOCK_PROFILES" .                                                 # → zero
grep -rn "displayName" types/ lib/ components/ app/                        # → zero
```

---

## Out of scope (defer)

- **Events posted by a user** — Gerard has not shipped the endpoint yet; track as a follow-up.
- **Pagination UI on `/preferits`** — Phase 4 ships `size=50, page=0`. Add real pagination when users actually hit the limit.
- **Username rename + old-username redirects** — backend doesn't expose rename today.
- **Username-list sitemap** — needs a backend index endpoint; Phase 3 ships empty sitemap.

## Risks

1. `AuthenticatedUserDTO.id` was `number` in our types but `uuid` per swagger — call sites that did arithmetic / numeric comparisons will fail at typecheck. Phase 1 catches this; fix at the call site, don't paper over.
2. `fetchWithHmac` body-signing semantics for the new favorite endpoints (empty body on POST/DELETE). Confirm by inspecting `lib/api/fetch-wrapper.ts` before Phase 4; if `skipBodySigning` is needed for empty bodies, match what `loginExternal` does.
3. If backend stops returning `emailVerified` for `ORGANIZATION` role users, Zod schema will reject the response. Mark as `.optional()` if you see a 500 from `getMeExternal` during smoke.
