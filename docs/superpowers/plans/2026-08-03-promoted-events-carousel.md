# Promoted Events Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a "Promoted events" carousel on the homepage and on every event listing
page, sourced from a new isolated, feature-flagged, fail-soft data fetch, reusing the
existing `EventsAroundServer` carousel engine end to end.

**Architecture:** One new isolated fetch function (`getActivePromotedEvents`) gated behind
`PROMOTED_EVENTS_ENABLED` (default off, since the real backend endpoint doesn't exist yet).
One new server component (`PromotedEventsSection`) that calls it and renders nothing on
empty. One new optional prop (`isPromoted`) threaded through the existing
`EventsAroundServer` → `CardHorizontalServer` chain for a "Promoted" disclosure badge. Two
insertion points: `serverEventsCategorized/index.tsx` (homepage) and `PlacePageShell.tsx`
(every listing page).

**Tech Stack:** Next.js App Router (Server Components), TypeScript, Vitest, next-intl,
Tailwind (DESIGN.md tokens only).

## Global Constraints

- Reuse `badge-primary` (DESIGN.md token) for the "Promoted" badge — do not invent a new
  color. Precedent: `components/ui/restaurantPromotion/PromotedRestaurantCard.tsx:36`.
- `PromotionScope`'s place-type variants are `"town" | "region"` (this codebase's own
  `PlaceType` vocabulary, not "comarca").
- `getActivePromotedEvents` must not make a network call when
  `process.env.PROMOTED_EVENTS_ENABLED !== "true"` — return `[]` immediately.
- No `captureException`/Sentry wiring for this fetch's failures — `console.warn` only.
- No changes to the phase-1 checkout flow, pricing config, or `/e/[eventId]/promote` page.
- `yarn typecheck && yarn lint` must pass before every commit.
- Spec: `docs/superpowers/specs/2026-08-03-promoted-events-carousel-design.md`.

---

### Task 1: `getActivePromotedEvents` data-fetch function

**Files:**
- Create: `lib/api/promotedEvents.ts`
- Test: `test/lib/api/promotedEvents.test.ts`

**Interfaces:**
- Produces: `export type PromotionScope = { type: "homepage" } | { type: "town" | "region"; slug: string }`
- Produces: `export async function getActivePromotedEvents(scope: PromotionScope): Promise<EventSummaryResponseDTO[]>`

- [ ] **Step 1: Write the failing tests**

```ts
// test/lib/api/promotedEvents.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchWithHmacMock = vi.fn();
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: (...args: unknown[]) => fetchWithHmacMock(...args),
}));

import { getActivePromotedEvents } from "@lib/api/promotedEvents";

const originalEnv = process.env.PROMOTED_EVENTS_ENABLED;

describe("getActivePromotedEvents", () => {
  beforeEach(() => {
    fetchWithHmacMock.mockReset();
  });

  afterEach(() => {
    process.env.PROMOTED_EVENTS_ENABLED = originalEnv;
  });

  it("returns [] with no network call when the feature flag is off", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "false";
    const result = await getActivePromotedEvents({ type: "homepage" });
    expect(result).toEqual([]);
    expect(fetchWithHmacMock).not.toHaveBeenCalled();
  });

  it("returns [] with no network call when the flag is unset", async () => {
    delete process.env.PROMOTED_EVENTS_ENABLED;
    const result = await getActivePromotedEvents({ type: "town", slug: "cardedeu" });
    expect(result).toEqual([]);
    expect(fetchWithHmacMock).not.toHaveBeenCalled();
  });

  it("builds the right query string for a homepage scope", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    fetchWithHmacMock.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });
    await getActivePromotedEvents({ type: "homepage" });
    const [url] = fetchWithHmacMock.mock.calls[0];
    expect(url).toContain("scope=homepage");
    expect(url).not.toContain("slug=");
  });

  it("builds the right query string for a town scope", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    fetchWithHmacMock.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });
    await getActivePromotedEvents({ type: "town", slug: "cardedeu" });
    const [url] = fetchWithHmacMock.mock.calls[0];
    expect(url).toContain("scope=town");
    expect(url).toContain("slug=cardedeu");
  });

  it("returns [] (not a throw) on a non-2xx response", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    fetchWithHmacMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "not found",
    });
    const result = await getActivePromotedEvents({ type: "homepage" });
    expect(result).toEqual([]);
  });

  it("returns [] (not a throw) when fetchWithHmac rejects", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    fetchWithHmacMock.mockRejectedValue(new Error("network down"));
    const result = await getActivePromotedEvents({ type: "homepage" });
    expect(result).toEqual([]);
  });

  it("caps results at MAX_PROMOTED_EVENTS", async () => {
    process.env.PROMOTED_EVENTS_ENABLED = "true";
    const content = Array.from({ length: 20 }, (_, i) => ({
      id: `event-${i}`,
      hash: `hash-${i}`,
      slug: `event-${i}`,
      title: `Event ${i}`,
      type: "FREE",
      url: "https://example.com",
      description: "",
      imageUrl: "https://example.com/img.jpg",
      startDate: "2099-01-01",
      startTime: null,
      endDate: "2099-01-01",
      endTime: null,
      location: "Barcelona",
      visits: 0,
      origin: "MANUAL",
      categories: [],
    }));
    fetchWithHmacMock.mockResolvedValue({
      ok: true,
      json: async () => ({ content }),
    });
    const result = await getActivePromotedEvents({ type: "homepage" });
    expect(result).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run test/lib/api/promotedEvents.test.ts`
Expected: FAIL — `Cannot find module '@lib/api/promotedEvents'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/api/promotedEvents.ts
import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "./events";
import type { EventSummaryResponseDTO } from "types/api/event";

export type PromotionScope =
  | { type: "homepage" }
  | { type: "town" | "region"; slug: string };

const MAX_PROMOTED_EVENTS = 8;

function buildScopeQuery(scope: PromotionScope): string {
  const params = new URLSearchParams({ scope: scope.type });
  if (scope.type !== "homepage") {
    params.set("slug", scope.slug);
  }
  return params.toString();
}

/**
 * Provisional, isolated contract: the backend endpoint this calls does not exist yet
 * (Gerard's promotion-checkout endpoint shipped in phase 1; the "list active promoted
 * events" read side is still undecided). A field-name or shape mismatch once it ships
 * is a one-file fix, confined to this function.
 */
export async function getActivePromotedEvents(
  scope: PromotionScope,
): Promise<EventSummaryResponseDTO[]> {
  if (process.env.PROMOTED_EVENTS_ENABLED !== "true") {
    return [];
  }

  try {
    const apiUrl = getApiUrl();
    const finalUrl = `${apiUrl}/events/promotions/active?${buildScopeQuery(scope)}`;

    const response = await fetchWithHmac(finalUrl, {
      next: { revalidate: 300, tags: ["promoted-events"] },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(
        `getActivePromotedEvents: HTTP ${response.status} for ${finalUrl}`,
      );
      return [];
    }

    const data = await response.json();
    const content = Array.isArray(data?.content) ? data.content : [];
    return (content as EventSummaryResponseDTO[]).slice(0, MAX_PROMOTED_EVENTS);
  } catch (error) {
    console.warn("getActivePromotedEvents: fetch failed", error);
    return [];
  }
}
```

Check `lib/api/events.ts` for the exact exported name of the API-url helper (`getApiUrl`)
before importing it — if it's not exported, export it or inline the same `apiUrl`
resolution `fetchEventsInternal` uses.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run test/lib/api/promotedEvents.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add lib/api/promotedEvents.ts test/lib/api/promotedEvents.test.ts
git commit -m "feat(promoted-events): add isolated, flag-gated active-promotions fetch"
```

---

### Task 2: Thread `isPromoted` through `EventsAroundServer` → `CardHorizontalServer`

**Files:**
- Modify: `types/common.ts` (`EventsAroundServerProps`, `CardHorizontalServerProps`)
- Modify: `components/ui/eventsAround/EventsAroundServer.tsx`
- Modify: `components/ui/cardHorizontal/CardHorizontalServer.tsx`
- Modify: `messages/ca.json`, `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `EventsAroundServer` accepts `isPromoted?: boolean`; `CardHorizontalServer`
  accepts `isPromoted?: boolean` and renders a `badge-primary` pill when true.

- [ ] **Step 1: Add the i18n key** (do this first so the component step below compiles
  against real translations)

Add to `messages/ca.json`, inside the existing `"Components"` object, as a sibling of
`"PromotedRestaurantCard"` (around line 857):

```json
"PromotedEvents": {
  "title": "Esdeveniments destacats",
  "badge": "Patrocinat"
},
```

Add to `messages/es.json` (same location, same nesting):

```json
"PromotedEvents": {
  "title": "Eventos destacados",
  "badge": "Patrocinado"
},
```

Add to `messages/en.json` (same location, same nesting):

```json
"PromotedEvents": {
  "title": "Featured events",
  "badge": "Promoted"
},
```

- [ ] **Step 2: Add `isPromoted` to the prop types**

In `types/common.ts`, find `EventsAroundServerProps` (currently `layout?`, `loading?`,
`usePriority?`, `showJsonLd?`, `jsonLdId?`, `analyticsCategory?`) and add:

```ts
export interface EventsAroundServerProps extends EventsAroundProps {
  layout?: EventsAroundLayout;
  loading?: boolean;
  usePriority?: boolean;
  showJsonLd?: boolean;
  jsonLdId?: string;
  analyticsCategory?: string;
  isPromoted?: boolean;
}
```

Find `CardHorizontalServerProps` in the same file and add the same field:

```ts
isPromoted?: boolean;
```

- [ ] **Step 3: Thread the prop through `EventsAroundServer`**

In `components/ui/eventsAround/EventsAroundServer.tsx`, add `isPromoted = false` to the
destructured props (function signature currently `{ events, layout = "compact", loading =
false, usePriority = false, showJsonLd = false, jsonLdId, title }`), and pass it to
`CardHorizontalServer` in the horizontal-layout branch:

```tsx
<CardHorizontalServer
  event={event}
  isPriority={usePriority && index <= 2}
  isPromoted={isPromoted}
/>
```

- [ ] **Step 4: Render the badge in `CardHorizontalServer`**

In `components/ui/cardHorizontal/CardHorizontalServer.tsx`, add `isPromoted = false` to the
destructured props, get a second translation namespace, and render the badge next to
`CategoryBadge`:

```tsx
const CardHorizontalServer = async ({
  event,
  isPriority = false,
  initialIsFavorite,
  isPromoted = false,
}: CardHorizontalServerProps) => {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const tCategories = await getTranslations({ locale, namespace: "Config.Categories" });
  const tPromoted = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  // ...(unchanged prepareCardContentData call)...
```

And in the JSX, immediately above or beside `<CategoryBadge label={categoryLabel} />`:

```tsx
{isPromoted && (
  <span className="badge-primary mb-1 w-fit">{tPromoted("badge")}</span>
)}
<CategoryBadge label={categoryLabel} />
```

- [ ] **Step 5: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: no new errors. This step has no new automated test of its own (rendering
`CardHorizontalServer`, an async server component, isn't unit-tested anywhere in this
codebase today — see spec's Testing section) — verify visually in Task 5's manual check.

- [ ] **Step 6: Commit**

```bash
git add types/common.ts components/ui/eventsAround/EventsAroundServer.tsx \
  components/ui/cardHorizontal/CardHorizontalServer.tsx \
  messages/ca.json messages/es.json messages/en.json
git commit -m "feat(promoted-events): thread isPromoted badge through card carousel chain"
```

---

### Task 3: `PromotedEventsSection` component

**Files:**
- Create: `components/ui/promotedEvents/PromotedEventsSection.tsx`

**Interfaces:**
- Consumes: `getActivePromotedEvents(scope)` from Task 1; `EventsAroundServer` with
  `isPromoted` from Task 2; i18n key `Components.PromotedEvents.title` from Task 2.
- Produces: `export default async function PromotedEventsSection({ scope }: { scope: PromotionScope }): Promise<JSX.Element | null>`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/promotedEvents/PromotedEventsSection.tsx
import { getTranslations } from "next-intl/server";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import { getActivePromotedEvents } from "@lib/api/promotedEvents";
import type { PromotionScope } from "@lib/api/promotedEvents";
import { getLocaleSafely } from "@utils/i18n-seo";

function scopeKey(scope: PromotionScope): string {
  return scope.type === "homepage" ? "homepage" : `${scope.type}-${scope.slug}`;
}

function scopePlaceSlug(scope: PromotionScope): string {
  return scope.type === "homepage" ? "homepage" : scope.slug;
}

export default async function PromotedEventsSection({
  scope,
}: {
  scope: PromotionScope;
}) {
  const promotedEvents = await getActivePromotedEvents(scope);
  if (promotedEvents.length === 0) {
    return null;
  }

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.PromotedEvents" });
  const key = scopeKey(scope);

  return (
    <div className="container content-auto-section">
      <section className="py-section-y border-b">
        <h2 className="heading-2 text-foreground">{t("title")}</h2>
        <div
          data-analytics-container="true"
          data-analytics-context="promoted_carousel"
          data-analytics-place-slug={scopePlaceSlug(scope)}
        >
          <EventsAroundServer
            events={promotedEvents}
            layout="horizontal"
            usePriority={false}
            isPromoted
            showJsonLd
            title={t("title")}
            jsonLdId={`promoted-events-${key}`}
          />
        </div>
      </section>
    </div>
  );
}
```

Match `SectionHeading`'s exact heading markup instead of the raw `<h2>` above if
`components/ui/serverEventsCategorized/SectionHeading.tsx` is exported for reuse outside
that folder — check its import path before wiring Task 4; if it's private to that folder,
the inline `<h2 className="heading-2 text-foreground">` above (copied verbatim from the
"Popular Now" heading style) is the correct fallback and needs no further change.

- [ ] **Step 2: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add components/ui/promotedEvents/PromotedEventsSection.tsx
git commit -m "feat(promoted-events): add PromotedEventsSection component"
```

---

### Task 4: Homepage insertion

**Files:**
- Modify: `components/ui/serverEventsCategorized/index.tsx`

**Interfaces:**
- Consumes: `PromotedEventsSection` from Task 3.

- [ ] **Step 1: Insert the section before "Popular Now"**

In the returned JSX (around line 509-511, immediately before the `{/* Popular Now Section
*/}` comment), add:

```tsx
return (
  <>
    <PromotedEventsSection scope={{ type: "homepage" }} />

    {/* Popular Now Section — derived from existing data, zero extra API calls */}
    {popularEvents.length > 0 && (
      // ...unchanged...
```

Add the import at the top of the file:

```tsx
import PromotedEventsSection from "@components/ui/promotedEvents/PromotedEventsSection";
```

- [ ] **Step 2: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: no new errors

- [ ] **Step 3: Manual verification**

Since `PROMOTED_EVENTS_ENABLED` is unset by default, `PromotedEventsSection` returns `null`
here — running the dev server and loading `/` should look **identical to before this
task**. That's the correct, expected result; it does not prove the carousel renders
correctly. Separately, verify the populated path locally:

```bash
PROMOTED_EVENTS_ENABLED=true yarn dev
```

With the flag on, `getActivePromotedEvents` will still hit the real (nonexistent) backend
endpoint and fail soft to `[]` unless a local mock is added — to see the populated carousel
render, temporarily stub `getActivePromotedEvents` to return a hardcoded
`EventSummaryResponseDTO[]` fixture, load `/`, confirm the carousel + badge render, then
revert the stub before committing. Record in the PR description which of the two states
(empty-hidden vs. populated-with-stub) was actually checked in the browser.

- [ ] **Step 4: Commit**

```bash
git add components/ui/serverEventsCategorized/index.tsx
git commit -m "feat(promoted-events): render promoted carousel on homepage"
```

---

### Task 5: Listing-page insertion

**Files:**
- Modify: `components/partials/PlacePageShell.tsx`

**Interfaces:**
- Consumes: `PromotedEventsSection` from Task 3; `PlaceTypeAndLabel` from `types/common.ts`
  (already available in this file's props, per phase-2 spec's "Placement" section).

- [ ] **Step 1: Locate the render point and confirm the `placeTypeLabel` prop's shape**

Read `components/partials/PlacePageShell.tsx` around line 354 (where `HybridEventsList` is
rendered) and confirm which prop already carries the resolved `PlaceTypeAndLabel` (it's
computed in `PlacePageGate`/`app/[locale]/[place]/page.tsx` via
`getPlaceTypeAndLabelCached(place)` and passed down — find its prop name in
`PlacePageShellProps`, `types/props.ts`, before writing the insertion).

- [ ] **Step 2: Insert the section above `HybridEventsList`**

```tsx
{placeTypeLabel.type && (
  <PromotedEventsSection
    scope={{ type: placeTypeLabel.type, slug: place }}
  />
)}

<HybridEventsList
  // ...unchanged props...
/>
```

`placeTypeLabel.type` is `"town" | "region" | ""` at the type level; the `{placeTypeLabel.type
&& (...)}` guard is the defensive, spec-mandated check for the `""` member even though it's
unreachable in practice (verified: `getPlaceTypeAndLabel`,
`utils/location-helpers.ts:209-292`, has no code path returning `""`).

Add the import at the top of the file:

```tsx
import PromotedEventsSection from "@components/ui/promotedEvents/PromotedEventsSection";
```

- [ ] **Step 3: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: no new errors

- [ ] **Step 4: Manual verification**

Same caveat as Task 4 Step 3 — with the flag off (default), a town page (e.g. `/cardedeu`)
and a region page (e.g. `/maresme`) should render identically to before this task. Verify
that first, then repeat the temporary-stub check from Task 4 on one town page and one
region page to confirm the scope-slug plumbing is correct for both `PlaceType` values, then
revert the stub.

- [ ] **Step 5: Commit**

```bash
git add components/partials/PlacePageShell.tsx
git commit -m "feat(promoted-events): render promoted carousel on listing pages"
```

---

### Task 6: `.env.example` entry

**Files:**
- Modify: `.env.example` (or the repo's equivalent env-documentation file — confirm exact
  filename first; some Next.js repos use `.env.local.example`)

- [ ] **Step 1: Add the flag with an explanatory comment**

```bash
# Promoted events carousel — gates lib/api/promotedEvents.ts's active-promotions fetch.
# Keep false/unset until the backend's GET /events/promotions/active endpoint exists.
PROMOTED_EVENTS_ENABLED=false
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(promoted-events): document PROMOTED_EVENTS_ENABLED in env example"
```

---

### Task 7: E2E regression spec

**Files:**
- Create: `e2e/promoted-events-carousel.spec.ts`

**Interfaces:**
- Consumes: nothing new — this is a black-box regression check against the running app
  with the feature flag in its default (off) state.

- [ ] **Step 1: Write the spec**

```ts
// e2e/promoted-events-carousel.spec.ts
import { test, expect } from "@playwright/test";

test.describe("promoted events carousel (flag off, default state)", () => {
  test("homepage renders normally with no promoted-events section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /esdeveniments destacats/i }),
    ).toHaveCount(0);
  });

  test("a town listing page renders normally with no promoted-events section", async ({
    page,
  }) => {
    await page.goto("/cardedeu");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /esdeveniments destacats/i }),
    ).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `yarn playwright test e2e/promoted-events-carousel.spec.ts`
Expected: PASS (2 tests) — confirms this phase ships with zero visible/behavioral change
while `PROMOTED_EVENTS_ENABLED` is off, matching the spec's documented default state.

- [ ] **Step 3: Commit**

```bash
git add e2e/promoted-events-carousel.spec.ts
git commit -m "test(e2e): add promoted-events-carousel regression spec (flag-off state)"
```

---

## Self-Review Notes

- Spec coverage: data contract (Task 1), pill/badge threading (Task 2), component (Task 3),
  homepage placement (Task 4), listing-page placement (Task 5), env docs (Task 6), E2E
  (Task 7). Unit tests for `getActivePromotedEvents` are in Task 1. i18n keys land in Task
  2, before any component references them, so no task ever compiles against a missing key.
- No RSC render tests for `PromotedEventsSection`/`CardHorizontalServer`, matching the
  spec's explicit call — verified via typecheck + manual/stub verification instead.
- Task 3's `SectionHeading` note is a genuine open point for the implementer to resolve in
  five seconds (check one import), not a placeholder — the fallback behavior if it's
  private is fully specified inline.
- Task 5's Step 1 asks the implementer to find one prop name in a file this plan doesn't
  fully reproduce — flagged rather than guessed, since guessing a wrong prop name here
  would be a shipped bug, and the plan gives the exact function/line to find it from.
