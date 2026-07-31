# Favourites Past Events (Preferits Passats) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/preferits/passats` tab showing authenticated users' past (expired) favourites, mirroring the existing profile Propers/Passats pattern, and stop auto-deleting expired favourites for authenticated users.

**Architecture:** New route `app/[locale]/preferits/passats/page.tsx` sibling to the existing `app/[locale]/preferits/page.tsx`, sharing a new `app/[locale]/preferits/layout.tsx` shell and a `Tabs` header (reusing `components/ui/common/tabs`, unchanged). Data comes from a newly-exported single-period fetch in `lib/api/favorites-external.ts` (the merged two-period fetch added in PR #438 stays, used only by `/api/favorites` GET). Tab-item-building and events-section-rendering are extracted into shared helpers used by both the profile and favourites Propers/Passats pages.

**Tech Stack:** Next.js App Router (Server Components), next-intl, Vitest, TypeScript.

## Global Constraints

- No backend changes. The `period=active|past` contract is already live (PR #438); this plan only adds a `passats` route consuming it.
- Guests get zero behaviour change: single flat `/preferits` page, cookie storage (`MAX_FAVORITES=10`, unchanged), prune-on-expire (unchanged), no `Tabs`, no `/preferits/passats` access (auth-gated).
- Authenticated users: stop auto-pruning expired favourites entirely (no more `eventIdsToRemove` deletion). New soft limit `MAX_FAVORITES_AUTHENTICATED=50`, enforced client-side only (no backend round-trip), not the guest `MAX_FAVORITES=10`.
- Match existing code style exactly (see files below) — no unrequested refactors beyond the DRY extractions this plan specifies.
- Run `yarn typecheck` after every task that touches `.ts`/`.tsx` files; run the specific new/changed test file after every test-writing step.

---

### Task 1: `MAX_FAVORITES_AUTHENTICATED` constant

**Files:**
- Modify: `utils/constants.ts:11`

**Interfaces:**
- Produces: `MAX_FAVORITES_AUTHENTICATED: number` — imported by `FavoriteButton`, `preferits/page.tsx`, `preferits/passats/page.tsx` in later tasks.

- [ ] **Step 1: Add the constant**

In `utils/constants.ts`, right after line 11 (`export const MAX_FAVORITES = 10;`):

```ts
export const MAX_FAVORITES = 10;
// Authenticated favourites are stored server-side with no real backend cap
// (verified against esdeveniments-backend/develop — UserFavoriteEventServiceImpl
// has no count check). This is a client-side-only UX guard, not a real limit,
// hence the much higher number than the guest cookie cap above.
export const MAX_FAVORITES_AUTHENTICATED = 50;
```

- [ ] **Step 2: Typecheck**

Run: `yarn typecheck`
Expected: no errors (unused export is fine, nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add utils/constants.ts
git commit -m "feat(favorites): add MAX_FAVORITES_AUTHENTICATED soft limit constant"
```

---

### Task 2: Export a single-period favourites fetch + count helper

**Files:**
- Modify: `lib/api/favorites-external.ts:64-100` (add two new exported functions after `listFavoriteEventsExternal`)
- Test: `test/favorites-external.test.ts` (extend)

**Interfaces:**
- Consumes: existing private `fetchFavoritesPeriod(base, accessToken, period, page, size)` and `favoritesBaseUrl()` in the same file (unchanged).
- Produces:
  - `listFavoriteEventsByPeriodExternal(accessToken: string, period: "active" | "past", page = 0, size = 50): Promise<FavoriteEventsPageDTO | null>`
  - `countFavoritesByPeriodExternal(accessToken: string, period: "active" | "past"): Promise<number | null>`

- [ ] **Step 1: Write the failing tests**

Add to `test/favorites-external.test.ts`, after the existing `describe("listFavoriteEventsExternal", ...)` block (before its closing `});`, i.e. add a new top-level `describe` block after it):

```ts
describe("listFavoriteEventsByPeriodExternal", () => {
  it("requests only the given period, not both", async () => {
    mockFetchWithHmac.mockResolvedValue(pagedResponse(page([activeEvent])));

    await listFavoriteEventsByPeriodExternal("token", "active", 0, 10);

    expect(mockFetchWithHmac).toHaveBeenCalledTimes(1);
    const url = mockFetchWithHmac.mock.calls[0][0] as string;
    expect(url).toContain("period=active");
    expect(url).not.toContain("period=past");
  });

  it("returns null when the backend call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ error: "backend_down" }, 500)
    );

    const result = await listFavoriteEventsByPeriodExternal("token", "past", 0, 10);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });
});

describe("countFavoritesByPeriodExternal", () => {
  it("returns totalElements from a size=1 fetch", async () => {
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse(page([activeEvent], 7))
    );

    const count = await countFavoritesByPeriodExternal("token", "active");

    expect(count).toBe(7);
    const url = mockFetchWithHmac.mock.calls[0][0] as string;
    expect(url).toContain("size=1");
  });

  it("returns null when the backend call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithHmac.mockResolvedValue(
      pagedResponse({ error: "backend_down" }, 500)
    );

    const count = await countFavoritesByPeriodExternal("token", "past");

    expect(count).toBeNull();
    errorSpy.mockRestore();
  });
});
```

Add the new imports to the top of the test file (alongside the existing `listFavoriteEventsExternal` import):

```ts
import {
  listFavoriteEventsExternal,
  listFavoriteEventsByPeriodExternal,
  countFavoritesByPeriodExternal,
} from "../lib/api/favorites-external";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test test/favorites-external.test.ts`
Expected: FAIL — `listFavoriteEventsByPeriodExternal is not a function` / `countFavoritesByPeriodExternal is not a function`.

- [ ] **Step 3: Implement**

In `lib/api/favorites-external.ts`, after the closing `}` of `listFavoriteEventsExternal` (currently ending at line 100), add:

```ts
export async function listFavoriteEventsByPeriodExternal(
  accessToken: string,
  period: "active" | "past",
  page = 0,
  size = 50
): Promise<FavoriteEventsPageDTO | null> {
  const base = favoritesBaseUrl();
  if (!base) return null;
  return fetchFavoritesPeriod(base, accessToken, period, page, size);
}

// Cheap count-only fetch: Spring Data's Page.getTotalElements() reflects the
// full count regardless of requested `size`, so size=1 is enough to read the
// count without downloading a full page of content — used for the "other"
// tab's count on /preferits and /preferits/passats.
export async function countFavoritesByPeriodExternal(
  accessToken: string,
  period: "active" | "past"
): Promise<number | null> {
  const page = await listFavoriteEventsByPeriodExternal(accessToken, period, 0, 1);
  return page?.totalElements ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test test/favorites-external.test.ts`
Expected: PASS (all tests, including the pre-existing merge tests).

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/api/favorites-external.ts test/favorites-external.test.ts
git commit -m "feat(favorites): export single-period fetch and count helpers"
```

---

### Task 3: Extract `buildPeriodTabItems` and refactor `buildProfileTabItems`

**Files:**
- Create: `components/partials/period-tabs.ts`
- Modify: `components/partials/profile-tabs.ts`
- Test: `test/period-tabs.test.ts` (new)
- Test: `test/profile-tabs.test.ts` (must keep passing unmodified — regression check)

**Interfaces:**
- Produces: `buildPeriodTabItems(input: { activeHref: string; pastHref: string; activeLabel: string; pastLabel: string; activeCount?: number; pastCount?: number }): TabItem[]` — used by `buildProfileTabItems` (this task) and `buildFavoritesTabItems` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `test/period-tabs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildPeriodTabItems } from "@components/partials/period-tabs";

describe("buildPeriodTabItems", () => {
  it("builds upcoming and past tabs with the given hrefs and labels", () => {
    const items = buildPeriodTabItems({
      activeHref: "/preferits",
      pastHref: "/preferits/passats",
      activeLabel: "Propers",
      pastLabel: "Passats",
    });

    expect(items).toEqual([
      { id: "upcoming", href: "/preferits", label: "Propers", count: undefined },
      { id: "past", href: "/preferits/passats", label: "Passats", count: undefined },
    ]);
  });

  it("passes through counts when present", () => {
    const items = buildPeriodTabItems({
      activeHref: "/preferits",
      pastHref: "/preferits/passats",
      activeLabel: "Propers",
      pastLabel: "Passats",
      activeCount: 5,
      pastCount: 12,
    });

    expect(items[0].count).toBe(5);
    expect(items[1].count).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/period-tabs.test.ts`
Expected: FAIL — cannot find module `@components/partials/period-tabs`.

- [ ] **Step 3: Implement `period-tabs.ts`**

Create `components/partials/period-tabs.ts`:

```ts
import type { TabItem } from "types/props";

// Generic two-tab (upcoming/past) shape shared by the profile and
// favourites Propers/Passats pages. Feature-specific wrappers
// (buildProfileTabItems, buildFavoritesTabItems) supply hrefs, labels, and
// counts from their own domain.
export function buildPeriodTabItems({
  activeHref,
  pastHref,
  activeLabel,
  pastLabel,
  activeCount,
  pastCount,
}: {
  activeHref: string;
  pastHref: string;
  activeLabel: string;
  pastLabel: string;
  activeCount?: number;
  pastCount?: number;
}): TabItem[] {
  return [
    { id: "upcoming", href: activeHref, label: activeLabel, count: activeCount },
    { id: "past", href: pastHref, label: pastLabel, count: pastCount },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/period-tabs.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor `buildProfileTabItems` to use it**

Replace the full contents of `components/partials/profile-tabs.ts`:

```ts
import type { UserPublicResponseDTO } from "types/api/user";
import type { TabItem, ProfileTranslator } from "types/props";
import { buildPeriodTabItems } from "./period-tabs";

// Shared by page.tsx and passats/page.tsx: the Propers/Passats tab items are
// identical on both routes, only which one is `active` differs (passed
// separately to <Tabs>).
export function buildProfileTabItems(
  profile: UserPublicResponseDTO,
  tProfile: ProfileTranslator,
): TabItem[] {
  return buildPeriodTabItems({
    activeHref: `/perfil/${encodeURIComponent(profile.username)}`,
    pastHref: `/perfil/${encodeURIComponent(profile.username)}/passats`,
    activeLabel: tProfile("tabUpcoming"),
    pastLabel: tProfile("tabPast"),
    activeCount: profile.upcomingEventCount,
    pastCount: profile.pastEventCount,
  });
}
```

- [ ] **Step 6: Run the existing profile-tabs test to confirm no regression**

Run: `yarn test test/profile-tabs.test.ts`
Expected: PASS, unmodified (output shape is identical to before the refactor).

- [ ] **Step 7: Typecheck**

Run: `yarn typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/partials/period-tabs.ts components/partials/profile-tabs.ts test/period-tabs.test.ts
git commit -m "refactor(profile): extract buildPeriodTabItems, shared by profile and favorites tabs"
```

---

### Task 4: `buildFavoritesTabItems`

**Files:**
- Create: `components/partials/favorites-tabs.ts`
- Test: `test/favorites-tabs.test.ts` (new)

**Interfaces:**
- Consumes: `buildPeriodTabItems` (Task 3), `ProfileTranslator` type (existing, `types/props.ts:538`).
- Produces: `buildFavoritesTabItems(counts: { activeCount?: number; pastCount?: number }, t: ProfileTranslator): TabItem[]` — used by `preferits/page.tsx` and `preferits/passats/page.tsx` (Tasks 9, 12).

- [ ] **Step 1: Write the failing test**

Create `test/favorites-tabs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import type { ProfileTranslator } from "types/props";

const stubTranslator = ((key: string) =>
  key === "tabUpcoming" ? "Propers" : "Passats") as ProfileTranslator;

describe("buildFavoritesTabItems", () => {
  it("builds tabs pointing at /preferits and /preferits/passats", () => {
    const items = buildFavoritesTabItems({}, stubTranslator);

    expect(items).toEqual([
      { id: "upcoming", href: "/preferits", label: "Propers", count: undefined },
      { id: "past", href: "/preferits/passats", label: "Passats", count: undefined },
    ]);
  });

  it("passes through counts when present", () => {
    const items = buildFavoritesTabItems(
      { activeCount: 5, pastCount: 12 },
      stubTranslator,
    );

    expect(items[0].count).toBe(5);
    expect(items[1].count).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/favorites-tabs.test.ts`
Expected: FAIL — cannot find module `@components/partials/favorites-tabs`.

- [ ] **Step 3: Implement**

Create `components/partials/favorites-tabs.ts`:

```ts
import type { TabItem, ProfileTranslator } from "types/props";
import { buildPeriodTabItems } from "./period-tabs";

// Shared by preferits/page.tsx and preferits/passats/page.tsx, mirroring
// buildProfileTabItems' role for the profile Propers/Passats pages.
export function buildFavoritesTabItems(
  counts: { activeCount?: number; pastCount?: number },
  t: ProfileTranslator,
): TabItem[] {
  return buildPeriodTabItems({
    activeHref: "/preferits",
    pastHref: "/preferits/passats",
    activeLabel: t("tabUpcoming"),
    pastLabel: t("tabPast"),
    activeCount: counts.activeCount,
    pastCount: counts.pastCount,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/favorites-tabs.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 6: Commit**

```bash
git add components/partials/favorites-tabs.ts test/favorites-tabs.test.ts
git commit -m "feat(favorites): add buildFavoritesTabItems"
```

---

### Task 5: New translation keys (ca/es/en)

**Files:**
- Modify: `messages/ca.json` (`App.Favorites` section)
- Modify: `messages/es.json` (`App.Favorites` section)
- Modify: `messages/en.json` (`App.Favorites` section)

**Interfaces:**
- Produces: translation keys consumed by `preferits/page.tsx`, `preferits/passats/page.tsx`, `PastFavoritesAuthGate.tsx` (Tasks 9, 11, 12): `tabUpcoming`, `tabPast`, `pastEmptyTitle`, `pastEmptyDescription`, `pastTitle`, `pastDescription`, `pastAuthGateTitle`, `pastAuthGateDescription`, `pastAuthGateLogin`.

- [ ] **Step 1: Add keys to `messages/ca.json`**

In the `App.Favorites` object (currently ending with `"errorDescription": "..."`), add these keys (comma after the existing last key):

```json
"tabUpcoming": "Propers",
"tabPast": "Passats",
"pastTitle": "Preferits passats - Esdeveniments.cat",
"pastDescription": "Els teus esdeveniments passats guardats",
"pastEmptyTitle": "Encara no tens esdeveniments passats desats",
"pastEmptyDescription": "Els esdeveniments que marquis amb el cor apareixeran aquí un cop hagin finalitzat.",
"pastAuthGateTitle": "Inicia sessió per veure els teus preferits passats",
"pastAuthGateDescription": "Els preferits passats només estan disponibles per a comptes amb sessió iniciada.",
"pastAuthGateLogin": "Iniciar sessió"
```

- [ ] **Step 2: Add keys to `messages/es.json`**

In the `App.Favorites` object, add:

```json
"tabUpcoming": "Próximos",
"tabPast": "Pasados",
"pastTitle": "Favoritos pasados - Esdeveniments.cat",
"pastDescription": "Tus eventos pasados guardados",
"pastEmptyTitle": "Aún no tienes eventos pasados guardados",
"pastEmptyDescription": "Los eventos que marques con el corazón aparecerán aquí una vez hayan finalizado.",
"pastAuthGateTitle": "Inicia sesión para ver tus favoritos pasados",
"pastAuthGateDescription": "Los favoritos pasados solo están disponibles para cuentas con sesión iniciada.",
"pastAuthGateLogin": "Iniciar sesión"
```

- [ ] **Step 3: Add keys to `messages/en.json`**

In the `App.Favorites` object, add:

```json
"tabUpcoming": "Upcoming",
"tabPast": "Past",
"pastTitle": "Past favorites - Esdeveniments.cat",
"pastDescription": "Your saved past events",
"pastEmptyTitle": "No past favorites yet",
"pastEmptyDescription": "Events you save with the heart will show up here once they've ended.",
"pastAuthGateTitle": "Sign in to see your past favorites",
"pastAuthGateDescription": "Past favorites are only available to signed-in accounts.",
"pastAuthGateLogin": "Sign in"
```

- [ ] **Step 4: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/ca.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/es.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); console.log('valid')"`
Expected: prints `valid`, no syntax errors.

- [ ] **Step 5: Run the i18n translations checker**

Run: `yarn i18n:check` (`package.json:27`: `i18n-check -s ca --locales messages --only invalidKeys,missingKeys ...`).
Expected: "No missing keys found!" / "No invalid translations found!" across all three locales.

- [ ] **Step 6: Commit**

```bash
git add messages/ca.json messages/es.json messages/en.json
git commit -m "feat(favorites): add translation keys for the past-favourites tab"
```

---

### Task 6: Extract `EventsSection` from `ProfileEventsSection`

**Files:**
- Create: `components/partials/EventsSection.tsx`
- Modify: `components/partials/ProfileEventsSection.tsx`
- Test: `test/profile-events-section.test.tsx` (must keep passing unmodified — regression check)

**Interfaces:**
- Produces: `EventsSection({ events: EventSummaryResponseDTO[], emptyTitle: string, sectionLabel: string, testId: string, initialIsFavorite?: boolean }): ReactElement` — used by `ProfileEventsSection` (this task) and `FavoritesEventsSection` (Task 7).

- [ ] **Step 1: Read the current test to know what must keep passing**

Run: `cat test/profile-events-section.test.tsx` and confirm what it asserts (testid, empty-state title, card rendering) before touching the component — this task must not change any of those observable behaviours, only where the code lives.

- [ ] **Step 2: Create `EventsSection`**

Create `components/partials/EventsSection.tsx`:

```tsx
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type { EventSummaryResponseDTO } from "types/api/event";

// Presentational half of ProfileEventsSection/FavoritesEventsSection: given
// already-fetched events, render the list or an empty state. Both callers
// fetch from different sources (profile events vs. favourite events) but
// share this exact rendering shape.
export default function EventsSection({
  events,
  emptyTitle,
  sectionLabel,
  testId,
  initialIsFavorite = false,
}: {
  events: EventSummaryResponseDTO[];
  emptyTitle: string;
  sectionLabel: string;
  testId: string;
  initialIsFavorite?: boolean;
}) {
  return (
    <section aria-label={sectionLabel} data-testid={testId}>
      {events.length === 0 ? (
        <NoEventsFound title={emptyTitle} />
      ) : (
        <List events={events}>
          {(event, index) => (
            <CardServer
              key={`${event.id}-${index}`}
              event={event}
              isPriority={index === 0}
              initialIsFavorite={initialIsFavorite}
            />
          )}
        </List>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Refactor `ProfileEventsSection` to delegate rendering**

Replace the full contents of `components/partials/ProfileEventsSection.tsx`:

```tsx
import { fetchUserEvents } from "@lib/api/profiles";
import { getTranslations } from "next-intl/server";
import EventsSection from "./EventsSection";
import type { ProfileEventsSectionProps } from "types/props";

// First page of the profile's event listing, scoped to upcoming or past by
// the backend. Client pagination ("load more") via /api/users/[username]/events
// is a follow-up; v1 renders the first page.
const PROFILE_EVENTS_PAGE_SIZE = 20;

export default async function ProfileEventsSection({
  username,
  status,
}: ProfileEventsSectionProps) {
  const [t, eventsResponse] = await Promise.all([
    getTranslations("Components.Profile"),
    fetchUserEvents(username, 0, PROFILE_EVENTS_PAGE_SIZE, status),
  ]);

  return (
    <EventsSection
      events={eventsResponse.content}
      emptyTitle={t(status === "past" ? "noPastEvents" : "noUpcomingEvents")}
      sectionLabel={t(status === "past" ? "tabPast" : "tabUpcoming")}
      testId="profile-events"
    />
  );
}
```

Note: the original inlined `key={index}` via `List`'s render prop (no explicit key on `CardServer` there) now gets an explicit `key={`${event.id}-${index}`}` inside `EventsSection`, matching the pattern `preferits/page.tsx` already uses today (Task 9 will remove that duplicate key logic from `preferits/page.tsx` once it also uses `EventsSection`). This is a safe, additive change (React keys don't affect rendered output or the test's assertions).

- [ ] **Step 4: Run the existing test to confirm no regression**

Run: `yarn test test/profile-events-section.test.tsx`
Expected: PASS, unmodified.

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 6: Commit**

```bash
git add components/partials/EventsSection.tsx components/partials/ProfileEventsSection.tsx
git commit -m "refactor(profile): extract EventsSection, shared by profile and favorites sections"
```

---

### Task 7: `FavoritesEventsSection`

**Files:**
- Create: `components/partials/FavoritesEventsSection.tsx`
- Test: `test/favorites-events-section.test.tsx` (new)

**Interfaces:**
- Consumes: `listFavoriteEventsByPeriodExternal` (Task 2), `EventsSection` (Task 6).
- Produces: `FavoritesEventsSection({ accessToken: string, status: "upcoming" | "past" }): Promise<ReactElement | null>` — used by `preferits/page.tsx` (Task 9) and `preferits/passats/page.tsx` (Task 12). Returns `null` when the backend call fails — the caller page handles the `backendUnavailable` error state itself (this component doesn't own that decision, matching how the merged fetch's null-on-failure is already handled at the page level today).

- [ ] **Step 1: Write the failing test**

Create `test/favorites-events-section.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { EventSummaryResponseDTO } from "types/api/event";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@lib/api/favorites-external", () => ({
  listFavoriteEventsByPeriodExternal: vi.fn(),
}));

vi.mock("@components/ui/card/CardServer", () => ({
  default: function CardServerMock() {
    return null;
  },
}));

vi.mock("@components/ui/list", () => ({
  default: function ListMock(props: { children?: unknown }) {
    return null;
  },
}));

vi.mock("@components/ui/common/noEventsFound", () => ({
  default: function NoEventsFoundMock() {
    return null;
  },
}));

function makeEvent(slug: string): EventSummaryResponseDTO {
  return {
    id: `id-${slug}`,
    hash: `hash-${slug}`,
    slug,
    title: `Title ${slug}`,
    type: "FREE" as const,
    url: "https://example.com",
    description: "desc",
    imageUrl: "https://example.com/img.jpg",
    startDate: "2030-01-01",
    startTime: null,
    endDate: "2030-01-02",
    endTime: null,
    location: "loc",
    visits: 0,
    origin: "MANUAL" as const,
    categories: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FavoritesEventsSection", () => {
  it("returns null when the backend call fails", async () => {
    const { listFavoriteEventsByPeriodExternal } = await import(
      "@lib/api/favorites-external"
    );
    vi.mocked(listFavoriteEventsByPeriodExternal).mockResolvedValue(null);

    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );

    const element = await FavoritesEventsSection({
      accessToken: "token",
      status: "past",
    });

    expect(element).toBeNull();
  });

  it("fetches the past period when status is past", async () => {
    const { listFavoriteEventsByPeriodExternal } = await import(
      "@lib/api/favorites-external"
    );
    vi.mocked(listFavoriteEventsByPeriodExternal).mockResolvedValue({
      content: [makeEvent("past-event")],
      currentPage: 0,
      pageSize: 50,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );

    const element = await FavoritesEventsSection({
      accessToken: "token",
      status: "past",
    });

    expect(element).not.toBeNull();
    expect(vi.mocked(listFavoriteEventsByPeriodExternal)).toHaveBeenCalledWith(
      "token",
      "past",
      0,
      expect.any(Number)
    );
    if (element) renderToStaticMarkup(element);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/favorites-events-section.test.tsx`
Expected: FAIL — cannot find module `@components/partials/FavoritesEventsSection`.

- [ ] **Step 3: Implement**

Create `components/partials/FavoritesEventsSection.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { listFavoriteEventsByPeriodExternal } from "@lib/api/favorites-external";
import { MAX_FAVORITES_AUTHENTICATED } from "@utils/constants";
import EventsSection from "./EventsSection";
import type { ReactElement } from "react";

// Authenticated-only: fetches one favourites period and renders it via the
// shared EventsSection, matching ProfileEventsSection's shape. Returns null
// on backend failure so the caller page can render its own
// backendUnavailable error state (consistent with how /preferits already
// handles that today).
export default async function FavoritesEventsSection({
  accessToken,
  status,
}: {
  accessToken: string;
  status: "upcoming" | "past";
}): Promise<ReactElement | null> {
  const period = status === "past" ? "past" : "active";
  const [t, page] = await Promise.all([
    getTranslations("App.Favorites"),
    listFavoriteEventsByPeriodExternal(
      accessToken,
      period,
      0,
      MAX_FAVORITES_AUTHENTICATED
    ),
  ]);

  if (page === null) return null;

  return (
    <EventsSection
      events={page.content}
      emptyTitle={t(status === "past" ? "pastEmptyTitle" : "emptyTitle")}
      sectionLabel={t(status === "past" ? "tabPast" : "tabUpcoming")}
      testId={status === "past" ? "favorites-past-events" : "favorites-events"}
      initialIsFavorite
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/favorites-events-section.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 6: Commit**

```bash
git add components/partials/FavoritesEventsSection.tsx test/favorites-events-section.test.tsx
git commit -m "feat(favorites): add FavoritesEventsSection"
```

---

### Task 8: Shared `/preferits` layout (heading only)

**Files:**
- Create: `app/[locale]/preferits/layout.tsx`
- Modify: `app/[locale]/preferits/page.tsx` (remove the `HeadingLayout` heading — done together with Task 9's larger rewrite, but the layout file itself is self-contained and can be created now)

**Interfaces:**
- Produces: shared page shell rendering the "Favoritos" H1 above `{children}`, wrapping both `/preferits` and `/preferits/passats`.

- [ ] **Step 1: Create the layout**

`HydridEventsHeadingLayoutProps` (`types/props.ts:651-657`) requires `subtitle`/`subtitleClass` — they're not optional, and the component (`components/ui/hybridEventsList/HeadingLayout.tsx`) always renders the subtitle `<p>` unconditionally, even empty. `HeadingLayout` is built for the title+subtitle+cta triad; forcing an empty subtitle through it for a heading-only shell is the wrong tool. Use a plain `<h1>` instead, matching how `perfil/[username]/layout.tsx` doesn't use `HeadingLayout` either (it uses `ProfileHeader`).

Create `app/[locale]/preferits/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

// Shared shell for /preferits and /preferits/passats, mirroring
// perfil/[username]/layout.tsx's role for the profile Propers/Passats
// pages: render the page identity once, let each page render its own
// Tabs + content underneath.
export default async function PreferitsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("App.Favorites");

  return (
    <div className="container py-section-y flex-col justify-center items-center">
      <h1 className="heading-1 mt-element-gap mb-element-gap">
        {t("heading")}
      </h1>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/preferits/layout.tsx
git commit -m "feat(favorites): add shared /preferits layout shell"
```

---

### Task 9: Rewrite `/preferits/page.tsx`

**Files:**
- Modify: `app/[locale]/preferits/page.tsx` (full rewrite of the authenticated branch; guest branch logic unchanged)
- Test: `test/favorites-page-auto-prune.test.ts` (Task 10 updates this — do not edit it in this task, just don't break it any more than necessary; Task 10 immediately follows)

**Interfaces:**
- Consumes: `listFavoriteEventsByPeriodExternal`, `countFavoritesByPeriodExternal` (Task 2), `buildFavoritesTabItems` (Task 4), `FavoritesEventsSection` (Task 7), `MAX_FAVORITES_AUTHENTICATED` (Task 1), existing `getAccessTokenFromCookies`, `getFavoritesFromCookies`, `filterActiveEvents`, `isEventActive`, `Tabs`.
- Produces: no new exports — `PreferitsPage` stays the default export, same route.

- [ ] **Step 1: Replace `app/[locale]/preferits/page.tsx` in full**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import CardServer from "@components/ui/card/CardServer";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";
import Tabs from "@components/ui/common/tabs";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import FavoritesEventsSection from "@components/partials/FavoritesEventsSection";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchEventBySlugWithStatus } from "@lib/api/events";
import { countFavoritesByPeriodExternal } from "@lib/api/favorites-external";
import { captureException } from "@sentry/nextjs";
import { filterActiveEvents, isEventActive } from "@utils/event-helpers";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { MAX_FAVORITES } from "@utils/constants";
import { getFavoritesFromCookies } from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { getTranslations } from "next-intl/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { ProfileTranslator } from "types/props";
import FavoritesAutoPrune from "./FavoritesAutoPrune";
import FavoritesPageTracker from "./FavoritesPageTracker";

const FETCH_CONCURRENCY = 5;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  return {
    ...(buildPageMeta({
      title: t("title"),
      description: t("description"),
      canonical: `${siteUrl}/preferits`,
      locale,
    }) as Metadata),
    robots: "noindex, nofollow",
  };
}

async function fetchFavoritesEvents(
  slugs: string[]
): Promise<{ events: EventSummaryResponseDTO[]; notFoundSlugs: string[] }> {
  const uniqueSlugs = Array.from(new Set(slugs)).slice(0, MAX_FAVORITES);
  const results: EventSummaryResponseDTO[] = [];
  const notFoundSlugs: string[] = [];

  const reasonToString = (reason: unknown): string => {
    if (reason instanceof Error) return reason.message;
    if (typeof reason === "string") return reason;

    try {
      return JSON.stringify(reason);
    } catch {
      return "unknown";
    }
  };

  for (let i = 0; i < uniqueSlugs.length; i += FETCH_CONCURRENCY) {
    const chunk = uniqueSlugs.slice(i, i + FETCH_CONCURRENCY);
    const fetched = await Promise.allSettled(
      chunk.map((slug) => fetchEventBySlugWithStatus(slug))
    );

    const failedFetches: Array<{ slug: string | undefined; reason: unknown }> =
      [];

    for (let j = 0; j < fetched.length; j++) {
      const slug = chunk[j];
      const settled = fetched[j];
      if (settled.status !== "fulfilled") {
        failedFetches.push({ slug, reason: settled.reason });
        continue;
      }

      const { event, notFound } = settled.value;

      if (notFound && slug) {
        notFoundSlugs.push(slug);
      }

      if (event != null) {
        results.push(event);
      }
    }

    if (failedFetches.length > 0) {
      captureException(new Error("Favorites: fetch failures"), {
        tags: {
          feature: "favorites",
          page: "/preferits",
          phase: "fetch_event_by_slug",
        },
        extra: {
          failedCount: failedFetches.length,
          failedSlugs: failedFetches.map((f) => f.slug).filter(Boolean),
          failedReasons: failedFetches.map((f) => reasonToString(f.reason)),
        },
      });
    }
  }

  return { events: results, notFoundSlugs };
}

function collectExpiredEventKeys<K>(
  events: EventSummaryResponseDTO[],
  keyOf: (event: EventSummaryResponseDTO) => K | null | undefined
): K[] {
  return events.flatMap((event) => {
    const key = keyOf(event);
    if (!key) return [];
    if (isEventActive(event)) return [];
    return [key];
  });
}

export default async function PreferitsPage() {
  const locale = (await rootLocale()) as AppLocale;
  const [t, authToken] = await Promise.all([
    getTranslations({ locale, namespace: "App.Favorites" }),
    getAccessTokenFromCookies(),
  ]);

  // Authenticated: backend is the source of truth, scoped by period. No more
  // client-side expiry filtering/pruning needed — period=active already
  // excludes expired events server-side, so there's nothing to prune.
  if (authToken) {
    const pastCount = await countFavoritesByPeriodExternal(authToken, "past");
    const tabItems = buildFavoritesTabItems(
      { pastCount: pastCount ?? undefined },
      t
    );

    return (
      <>
        <Tabs items={tabItems} active="upcoming" ariaLabel={t("heading")} />
        <div className="w-full mt-section-y">
          <Suspense fallback={<EventsGridSkeleton count={3} />}>
            <FavoritesSectionOrError accessToken={authToken} t={t} />
          </Suspense>
        </div>
      </>
    );
  }

  // Guest: cookie store, keyed by slug — unchanged from before this feature.
  const cookieSlugs = [...(await getFavoritesFromCookies())].reverse();
  const fetched = await fetchFavoritesEvents(cookieSlugs);
  const expiredSlugs = collectExpiredEventKeys(fetched.events, (e) => e.slug);
  const slugsToRemove = Array.from(
    new Set([...expiredSlugs, ...fetched.notFoundSlugs])
  );
  const activeEvents = filterActiveEvents(fetched.events);
  const uniqueFavoritesCount = new Set(cookieSlugs).size;

  if (cookieSlugs.length === 0 || activeEvents.length === 0) {
    return (
      <div data-testid="favorites-page-empty">
        <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={[]} />
        <FavoritesPageTracker favoritesCount={uniqueFavoritesCount} activeCount={0} />
        <NoEventsFound title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div data-testid="favorites-page">
      <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={[]} />
      <FavoritesPageTracker
        favoritesCount={uniqueFavoritesCount}
        activeCount={activeEvents.length}
      />
      <p className="body-small text-foreground/80 mb-element-gap">
        {t("subtitle")}
      </p>
      <p className="body-small text-foreground/80 mb-element-gap">
        {t("countLabel", { count: uniqueFavoritesCount, max: MAX_FAVORITES })}
      </p>
      <List events={activeEvents}>
        {(event, index) => (
          <CardServer
            key={`${event.id}-${index}`}
            event={event}
            isPriority={index === 0}
            initialIsFavorite
          />
        )}
      </List>
    </div>
  );
}

// Wraps FavoritesEventsSection so a backend failure renders the same
// backendUnavailable error state /preferits has always had, now sourced
// from the single-period fetch instead of the merged one.
async function FavoritesSectionOrError({
  accessToken,
  t,
}: {
  accessToken: string;
  t: ProfileTranslator;
}) {
  const section = await FavoritesEventsSection({
    accessToken,
    status: "upcoming",
  });

  if (section === null) {
    return (
      <div data-testid="favorites-page-error">
        <NoEventsFound
          title={t("errorTitle")}
          description={t("errorDescription")}
        />
      </div>
    );
  }

  return section;
}
```

Note the outer `container py-section-y flex-col justify-center items-center` wrapper div and the `HeadingLayout` call are gone from this file — they now live in `app/[locale]/preferits/layout.tsx` (Task 8). The `data-testid` attributes (`favorites-page`, `favorites-page-empty`, `favorites-page-error`) move onto plain wrapper `div`s here since the outer container is the layout's job now.

- [ ] **Step 2: Remove the now-orphaned `FavoritesData` type**

`FavoritesData` (`types/props.ts:192-198`) was only ever used by `loadFavoritesData()`'s return type in the file just rewritten — grep confirms no other file references it. Remove the interface from `types/props.ts`:

```ts
export interface FavoritesData {
  events: EventSummaryResponseDTO[];
  uniqueFavoritesCount: number;
  slugsToRemove: string[];
  eventIdsToRemove: string[];
  backendUnavailable: boolean;
}
```

Delete that block entirely (lines 192-198). Leave the `EventSummaryResponseDTO` import (`types/props.ts:60`) — verified it's still used by several other interfaces in the same file (e.g. lines 105, 170, 800, 920-927), so it stays.

- [ ] **Step 3: Typecheck**

Run: `yarn typecheck`
Expected: no errors. Fix any type mismatches (e.g. confirm `Tabs`'s `ariaLabel` prop accepts a plain string — it does, per `types/props.ts:529-533`).

- [ ] **Step 4: Run the existing e2e-adjacent unit test to see what breaks (expected)**

Run: `yarn test test/favorites-page-auto-prune.test.ts`
Expected: FAIL on the authenticated test (it mocks `listFavoriteEventsExternal`, which this page no longer calls) — this is expected and fixed in Task 10, which immediately follows. Do not attempt to fix it in this task.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/preferits/page.tsx types/props.ts
git commit -m "feat(favorites): add Tabs to /preferits, stop pruning expired favorites for authenticated users"
```

---

### Task 10: Update `favorites-page-auto-prune.test.ts`

**Files:**
- Modify: `test/favorites-page-auto-prune.test.ts`

**Interfaces:**
- Consumes: `PreferitsPage` (Task 9's rewritten default export).

- [ ] **Step 1: Update the mocks**

The test currently mocks `@lib/api/favorites-external` with only `listFavoriteEventsExternal`. Replace that mock block (currently lines 33-35) with:

```ts
vi.mock("@lib/api/favorites-external", () => ({
  listFavoriteEventsByPeriodExternal: vi.fn(async () => null),
  countFavoritesByPeriodExternal: vi.fn(async () => null),
}));
```

Also mock `Tabs` and `FavoritesEventsSection` and `EventsGridSkeleton`, since the authenticated branch now renders them (add alongside the existing mock blocks):

```ts
vi.mock("@components/ui/common/tabs", () => ({
  default: function TabsMock() {
    return null;
  },
}));

vi.mock("@components/partials/FavoritesEventsSection", () => ({
  default: async function FavoritesEventsSectionMock() {
    return null;
  },
}));

vi.mock("@components/ui/common/skeletons/EventsGridSkeleton", () => ({
  default: function EventsGridSkeletonMock() {
    return null;
  },
}));
```

- [ ] **Step 2: Replace the third test**

Replace the `"prunes expired favorites by event id for authenticated users"` test (currently lines 218-263) with a test asserting the opposite — no pruning happens for authenticated users regardless of what the backend returns:

```ts
it("never prunes for authenticated users, even with expired events in the response", async () => {
  const { getAccessTokenFromCookies } = await import("@utils/auth-cookies");
  const { countFavoritesByPeriodExternal } = await import(
    "@lib/api/favorites-external"
  );

  vi.mocked(getAccessTokenFromCookies).mockResolvedValue("token");
  vi.mocked(countFavoritesByPeriodExternal).mockResolvedValue(3);

  const { default: PreferitsPage } = await import(
    "@app/[locale]/preferits/page"
  );
  const element = await PreferitsPage();
  renderToStaticMarkup(element);

  // Authenticated branch never renders FavoritesAutoPrune at all — nothing
  // to prune once period=active already excludes expired events server-side.
  expect(autoPruneProps).toHaveLength(0);
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `yarn test test/favorites-page-auto-prune.test.ts`
Expected: PASS, all 3 tests (the two guest-path tests unchanged, the new authenticated test passing).

- [ ] **Step 4: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 5: Commit**

```bash
git add test/favorites-page-auto-prune.test.ts
git commit -m "test(favorites): update auto-prune test for the authenticated no-prune behavior"
```

---

### Task 11: `PastFavoritesAuthGate`

**Files:**
- Create: `app/[locale]/preferits/passats/PastFavoritesAuthGate.tsx`

**Interfaces:**
- Produces: `PastFavoritesAuthGate(): Promise<ReactElement>` — server-renderable (no `"use client"`), used by `preferits/passats/page.tsx` (Task 12) when `getAccessTokenFromCookies()` returns null.

Deviates from the spec's tentative "mirror `EditProfileAuthGate`" wording: `EditProfileAuthGate` is a client component because `/perfil/edita` needs live client-side auth state and a `redirect` query param. `/preferits/passats` doesn't need either — `/preferits/page.tsx` already proves SSR `getAccessTokenFromCookies()` is sufficient for gating in this exact feature area, and the redirect target is always the same static path. Building this as a plain async Server Component avoids an unnecessary client auth-check/loading-skeleton flash. Same visual shape and CSS classes as `EditProfileAuthGate`, own copy, no client JS.

- [ ] **Step 1: Implement**

Create `app/[locale]/preferits/passats/PastFavoritesAuthGate.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";
import { UserCircleIcon } from "@heroicons/react/24/outline";

// Shown on /preferits/passats to anonymous visitors — past favourites are
// authenticated-only. Server-rendered (unlike EditProfileAuthGate): the
// redirect target here is always /preferits/passats, so there's no need for
// a client-side useSearchParams()/useAuth() round trip.
export default async function PastFavoritesAuthGate() {
  const t = await getTranslations("App.Favorites");

  return (
    <div
      className="w-full max-w-md card-bordered card-body stack text-center"
      data-testid="preferits-passats-auth-gate"
    >
      <div className="flex-center">
        <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
          <UserCircleIcon className="h-7 w-7" />
        </div>
      </div>

      <h1 className="heading-2 text-foreground">{t("pastAuthGateTitle")}</h1>
      <p className="body-normal text-foreground/80">
        {t("pastAuthGateDescription")}
      </p>

      <Link
        href="/iniciar-sessio?redirect=%2Fpreferits%2Fpassats"
        className="btn-primary w-full"
        data-analytics-action="preferits_passats_gate_login"
      >
        {t("pastAuthGateLogin")}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/preferits/passats/PastFavoritesAuthGate.tsx
git commit -m "feat(favorites): add PastFavoritesAuthGate for /preferits/passats"
```

---

### Task 12: `/preferits/passats/page.tsx`

**Files:**
- Create: `app/[locale]/preferits/passats/page.tsx`
- Test: `test/preferits-passats.test.tsx` (new)

**Interfaces:**
- Consumes: `getAccessTokenFromCookies` (existing), `PastFavoritesAuthGate` (Task 11), `buildFavoritesTabItems` (Task 4), `countFavoritesByPeriodExternal` (Task 2), `FavoritesEventsSection` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `test/preferits-passats.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: vi.fn(async () => "ca"),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn(async () => null),
}));

vi.mock("@lib/api/favorites-external", () => ({
  countFavoritesByPeriodExternal: vi.fn(async () => null),
}));

vi.mock("@components/partials/FavoritesEventsSection", () => ({
  default: vi.fn(async () => null),
}));

vi.mock("@components/ui/common/tabs", () => ({
  default: function TabsMock() {
    return null;
  },
}));

vi.mock("@components/ui/common/skeletons/EventsGridSkeleton", () => ({
  default: function EventsGridSkeletonMock() {
    return null;
  },
}));

vi.mock("@components/ui/common/noEventsFound", () => ({
  default: function NoEventsFoundMock() {
    return null;
  },
}));

vi.mock("./PastFavoritesAuthGate", () => ({
  default: function PastFavoritesAuthGateMock() {
    return null;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PreferitsPassatsPage", () => {
  it("renders the auth gate for guests", async () => {
    const { default: PreferitsPassatsPage } = await import(
      "@app/[locale]/preferits/passats/page"
    );
    const element = await PreferitsPassatsPage();
    const html = renderToStaticMarkup(element);
    // PastFavoritesAuthGateMock renders null; assert the section/error/empty
    // testids it would otherwise show are absent, i.e. the gate branch ran.
    expect(html).not.toContain("favorites-page-error");
  });

  it("renders the error state for authenticated users when the backend fails", async () => {
    const { getAccessTokenFromCookies } = await import("@utils/auth-cookies");
    const { default: FavoritesEventsSection } = await import(
      "@components/partials/FavoritesEventsSection"
    );
    vi.mocked(getAccessTokenFromCookies).mockResolvedValue("token");
    vi.mocked(FavoritesEventsSection).mockResolvedValue(null);

    const { default: PreferitsPassatsPage } = await import(
      "@app/[locale]/preferits/passats/page"
    );
    const element = await PreferitsPassatsPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("favorites-page-error");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test test/preferits-passats.test.tsx`
Expected: FAIL — cannot find module `@app/[locale]/preferits/passats/page`.

- [ ] **Step 3: Implement**

Create `app/[locale]/preferits/passats/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import Tabs from "@components/ui/common/tabs";
import NoEventsFound from "@components/ui/common/noEventsFound";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import FavoritesEventsSection from "@components/partials/FavoritesEventsSection";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { countFavoritesByPeriodExternal } from "@lib/api/favorites-external";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "types/i18n";
import type { ProfileTranslator } from "types/props";
import PastFavoritesAuthGate from "./PastFavoritesAuthGate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  return {
    ...(buildPageMeta({
      title: t("pastTitle"),
      description: t("pastDescription"),
      canonical: `${siteUrl}/preferits/passats`,
      locale,
    }) as Metadata),
    // Past favourites are proof-of-activity for the user themselves, not a
    // page worth ranking — mirrors the profile Passats page's own noindex.
    robots: "noindex, nofollow",
  };
}

export default async function PreferitsPassatsPage() {
  const [t, authToken] = await Promise.all([
    getTranslations("App.Favorites"),
    getAccessTokenFromCookies(),
  ]);

  if (!authToken) {
    return <PastFavoritesAuthGate />;
  }

  const activeCount = await countFavoritesByPeriodExternal(authToken, "active");
  const tabItems = buildFavoritesTabItems(
    { activeCount: activeCount ?? undefined },
    t
  );

  return (
    <>
      <Tabs items={tabItems} active="past" ariaLabel={t("heading")} />
      <div className="w-full mt-section-y">
        <Suspense fallback={<EventsGridSkeleton count={3} />}>
          <PastFavoritesSectionOrError accessToken={authToken} t={t} />
        </Suspense>
      </div>
    </>
  );
}

async function PastFavoritesSectionOrError({
  accessToken,
  t,
}: {
  accessToken: string;
  t: ProfileTranslator;
}) {
  const section = await FavoritesEventsSection({
    accessToken,
    status: "past",
  });

  if (section === null) {
    return (
      <div data-testid="favorites-page-error">
        <NoEventsFound
          title={t("errorTitle")}
          description={t("errorDescription")}
        />
      </div>
    );
  }

  return section;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test test/preferits-passats.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/preferits/passats/page.tsx test/preferits-passats.test.tsx
git commit -m "feat(favorites): add /preferits/passats page"
```

---

### Task 13: Soft-limit check in `FavoriteButton`

**Files:**
- Modify: `components/ui/common/favoriteButton/index.tsx`
- Test: `test/FavoriteButton.test.tsx` (extend)

**Interfaces:**
- Consumes: `MAX_FAVORITES_AUTHENTICATED` (Task 1), existing `favoritesData`/`isAuthenticated`/`limitMessage`/`sendGoogleEvent` machinery (unchanged).

- [ ] **Step 1: Make `isAuthenticated` controllable per-test**

The existing `vi.mock("@components/hooks/useAuth", ...)` at the top of the file (line 28-30) hardcodes `isAuthenticated: false`, which every existing test relies on implicitly. Rather than `vi.doMock`/`vi.resetModules()` mid-test (fragile — leaks between tests since nothing resets the module registry in `beforeEach`), make it a controllable mock:

Replace:

```ts
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
```

with:

```ts
const isAuthenticatedMock = vi.fn(() => false);
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: isAuthenticatedMock() }),
}));
```

And in the existing `beforeEach` block (currently just `vi.clearAllMocks(); (globalThis as ...).fetch = fetchMock; ...`), add a reset so every test defaults back to guest unless it opts in:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticatedMock.mockReturnValue(false);
  (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock;
  Object.defineProperty(window, "location", {
    value: { pathname: "/preferits" },
    writable: true,
  });
});
```

- [ ] **Step 2: Write the failing test**

Add to `test/FavoriteButton.test.tsx`, after the existing `"shows a friendly message when MAX_FAVORITES_REACHED and rolls back"` test:

```tsx
it("blocks adding past the authenticated soft limit without calling the API", async () => {
  isAuthenticatedMock.mockReturnValue(true);

  const manyFavorites = Array.from({ length: 50 }, (_, i) => `event-${i}`);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, favorites: manyFavorites }),
  });

  const { default: FavoriteButton } = await import(
    "@components/ui/common/favoriteButton"
  );

  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <FavoriteButton
        eventSlug="new-event"
        eventId="new-event-id"
        initialIsFavorite={false}
        labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
      />
    </SWRConfig>
  );

  const button = await screen.findByRole("button", { name: "Afegeix a preferits" });

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the GET hydration call
  });

  fireEvent.click(button);

  await waitFor(() => {
    expect(
      screen.getByText(/Has arribat al límit de 50 preferits/i)
    ).toBeInTheDocument();
  });

  // No POST fired — blocked client-side before the network call.
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(button).toHaveAttribute("aria-pressed", "false");
});
```

Verified `messages/ca.json`'s `Components.FavoriteButton.maxReached` is `"Has arribat al límit de {max} preferits. Elimina'n un per afegir-ne més."` — with `max=50` interpolated, the regex above matches correctly.

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test test/FavoriteButton.test.tsx`
Expected: FAIL — no limit message shown, a POST call fires (the other 3 tests still pass, since they default to `isAuthenticatedMock() === false` via the `beforeEach` reset from Step 1).

- [ ] **Step 4: Implement**

In `components/ui/common/favoriteButton/index.tsx`:

Add the import (alongside the existing imports):

```ts
import { MAX_FAVORITES_AUTHENTICATED } from "@utils/constants";
```

Inside the `onClick` handler, right after `setIsFavorite(nextIsFavorite);` and before `startTransition(async () => {`, add the soft-limit pre-check:

```tsx
if (
  nextIsFavorite &&
  isAuthenticated &&
  favoritesData?.ok === true &&
  favoritesData.favorites.length >= MAX_FAVORITES_AUTHENTICATED
) {
  setIsFavorite(!nextIsFavorite);
  sendGoogleEvent("favorites_limit_reached", {
    action: "add",
    max_favorites: MAX_FAVORITES_AUTHENTICATED,
    event_slug: eventSlug,
    event_id: eventId,
    event_title: eventTitle,
  });
  setLimitMessage(t("maxReached", { max: MAX_FAVORITES_AUTHENTICATED }));
  return;
}

startTransition(async () => {
```

(The existing `startTransition(async () => { ... })` block and everything inside it stays exactly as-is — this is a pure early-return added before it, matching the existing 409-handling code path's `t("maxReached", ...)` call already inside that block, just triggered earlier and without a network round-trip.)

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test test/FavoriteButton.test.tsx`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Typecheck**

Run: `yarn typecheck`

- [ ] **Step 7: Commit**

```bash
git add components/ui/common/favoriteButton/index.tsx test/FavoriteButton.test.tsx
git commit -m "feat(favorites): enforce MAX_FAVORITES_AUTHENTICATED soft limit client-side"
```

---

### Task 14: Full verification and localhost smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `yarn typecheck`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `yarn test`
Expected: all tests pass (pre-existing count + the ~15 new/modified tests from Tasks 2-13).

- [ ] **Step 3: i18n check**

Run: `yarn i18n:check`
Expected: no missing/invalid keys across ca/es/en.

- [ ] **Step 4: Local smoke test — guest path unchanged**

```bash
yarn dev &
sleep 8
curl -s -o /dev/null -w "GET /preferits (guest): HTTP %{http_code}\n" http://localhost:3000/preferits
curl -s -o /dev/null -w "GET /preferits/passats (guest, should show auth gate, still 200): HTTP %{http_code}\n" http://localhost:3000/preferits/passats
```

Expected: both 200. Manually open `http://localhost:3000/preferits` and `http://localhost:3000/preferits/passats` in a browser as a guest (no login) — `/preferits` looks exactly as before (no Tabs), `/preferits/passats` shows the `PastFavoritesAuthGate` card with a working "Iniciar sessió" link.

- [ ] **Step 5: Note the authenticated-path limitation honestly**

The authenticated Tabs/past-favourites/soft-limit behavior cannot be fully verified end-to-end without a real logged-in PRE session (same limitation documented in PR #438's description). Manually verify with a real account before merging: log in, favourite a past-dated test event if one exists (or wait for an existing favourite to expire), confirm it appears under `/preferits/passats` instead of disappearing, and confirm the `/preferits` Tabs show correct counts.

- [ ] **Step 6: Stop the dev server**

```bash
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
```

---

## Self-review notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-31-favorites-past-events-design.md` maps to a task — architecture (Tasks 8, 9, 12), data layer (Tasks 1, 2, 3, 4, 6, 7), error handling (Tasks 9, 11, 12), testing (Tasks 2-13 each carry their own test step, plus Task 14's full-suite run).
- **Type consistency:** `listFavoriteEventsByPeriodExternal`/`countFavoritesByPeriodExternal` (Task 2) are used with identical signatures in Tasks 7, 9, 12. `buildFavoritesTabItems`'s `{ activeCount?, pastCount? }` shape (Task 4) matches how Tasks 9 and 12 call it (each page only ever knows its own count for free from its own fetch, and calls `countFavoritesByPeriodExternal` for the other side — Task 9 passes `pastCount`, Task 12 passes `activeCount`, neither ever has both for free, which is correct: fetching the CURRENT tab's total via a second call would be redundant with what `FavoritesEventsSection`'s own fetch already returns, but that count isn't currently piped back out of `FavoritesEventsSection` to its caller — see open item below).
- **Known follow-up, not blocking:** `FavoritesEventsSection` (Task 7) doesn't expose the current period's own `totalElements` back to its caller, so `preferits/page.tsx`'s Tabs never show an `activeCount` (only `pastCount`), and `passats/page.tsx`'s Tabs never show a `pastCount` (only `activeCount`) — each page's *own* tab renders without a count number, only the *other* tab does. This is a real gap, not a hidden bug: `TabItem.count` is optional and `Tabs` already renders fine without it (matching how `test/profile-tabs.test.ts` explicitly tests the `count: undefined` case). Acceptable for v1; if both counts are wanted on both pages, a follow-up task would have `FavoritesEventsSection` return `{ element, totalElements }` instead of just the element, and both pages would use that for their own tab's count instead of calling `countFavoritesByPeriodExternal` for their own side too.
