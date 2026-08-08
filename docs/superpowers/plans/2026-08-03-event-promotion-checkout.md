# Event Promotion Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-publish "Wallapop-style" upsell modal, a dedicated `/e/[eventId]/promote`
page, and a Server Action that hands off to Gerard's Spring Boot backend to create a
Stripe Checkout session for event promotion.

**Architecture:** Owner-only Server Component gate (copied from the existing `edita`
page) renders a client component that calls a Server Action. The action re-verifies
ownership server-side, POSTs to `${apiUrl}/events/{id}/promotions/checkout` with
`skipBodySigning: true` HMAC auth (same pattern as every other event mutation in
`lib/api/events.ts`), and returns a discriminated result. All payment logic — Stripe
session, PENDING order, webhook, fulfillment — lives in the backend; this app only shows
the upsell, collects confirmation, and redirects to the URL the backend returns.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), next-intl,
Vitest, Playwright, Tailwind (semantic design classes only, per repo convention).

Design doc: `docs/superpowers/specs/2026-08-03-event-promotion-checkout-design.md`

## Global Constraints

- Types live only in `types/` (ESLint-enforced) — no inline interfaces in components.
- Use `Link`/`useRouter` from `@i18n/routing`, never `next/link` directly.
- No `searchParams` reads in page components.
- Never `next: { revalidate }` on external fetches — this feature makes no external
  fetches directly (Server Action only), so this doesn't apply, but no new code should
  violate it either.
- All POST/PUT/DELETE `fetchWithHmac` calls MUST pass `skipBodySigning: true`.
- Static price for MVP: €5 flat fee (hardcoded, explicitly marked as provisional).
- No Stripe SDK, webhook, or secret key added to this repo for this feature — the
  backend owns all of that.
- No changes to `EventSummaryResponseDTO`/`EventDetailResponseDTO`, list rendering, or
  sorting — "appears at top" is entirely backend-owned and out of scope here.
- No "already promoted" duplicate-checkout guard — no lookup endpoint exists yet.
- `yarn typecheck && yarn lint && yarn test` must pass before any task is considered done.
- Analytics events use `sendGoogleEvent` (imperative), matching `app/[locale]/publica/page.tsx`'s
  existing `publish_*` event pattern — not the declarative `data-analytics-*` attribute
  pattern used inside `EventForm`.

---

## Task 1: Types for the promotion checkout feature

**Files:**
- Modify: `types/props.ts` (append new prop interfaces)
- Modify: `types/event.ts` (append the Server Action result type)
- Test: none (pure type additions; verified via `yarn typecheck` in later tasks)

**Interfaces:**
- Produces: `PromotionCheckoutResult` (in `types/event.ts`), `PromoteEventClientProps`,
  `PromoteUpsellModalProps`, `EventPromoteActionProps` (in `types/props.ts`) — used by
  every later task.

- [ ] **Step 1: Add the prop types to `types/props.ts`**

Find the block containing `EventEditActionProps` (around line 979) and add these new
interfaces immediately after it:

```ts
export interface EventPromoteActionProps {
  ownerId?: string;
  slug: string;
}

// /e/[eventId]/promote client page
export interface PromoteEventClientProps {
  eventId: string;
  slug: string;
}

export interface PromoteUpsellModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  slug: string;
}
```

- [ ] **Step 2: Add the Server Action result type to `types/event.ts`, not `types/props.ts`**

`PromotionCheckoutResult` is a Server Action return type, not a component prop — it
belongs next to the two existing precedents it's modeled on, `EditEventResult` (line 350)
and `CreateEventActionResult` (line 365), both in `types/event.ts`. Putting it in
`types/props.ts` would break the file's own convention (props only) that the other two
already establish. Find `CreateEventActionResult` (around line 365-367) and add
immediately after it:

```ts
/**
 * Result returned by createPromotionCheckoutAction. A discriminated union
 * (not a thrown error) — same convention as EditEventResult and
 * CreateEventActionResult above: the client always gets a value it can
 * branch on, never an opaque Server Action rejection.
 */
export type PromotionCheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };
```

- [ ] **Step 3: Verify the files still compile**

Run: `yarn typecheck`
Expected: PASS (no errors related to `types/props.ts` or `types/event.ts`)

- [ ] **Step 4: Commit**

```bash
git add types/props.ts types/event.ts
git commit -m "feat(promote): add types for event promotion checkout"
```

---

## Task 2: `createPromotionCheckout` in `lib/api/events.ts`

**Files:**
- Modify: `lib/api/events.ts` (add new exported function)
- Test: Create `test/lib/api/events.createPromotionCheckout.test.ts`

**Interfaces:**
- Consumes: `requireMutationAuth()` (existing private helper in this file, returns
  `{ apiUrl, authToken }`), `fetchWithHmac` (from `./fetch-wrapper`).
- Produces: `createPromotionCheckout(id: string, successUrl: string, cancelUrl: string):
  Promise<{ url: string }>` — the Server Action in Task 3 calls this directly.

- [ ] **Step 1: Write the failing test**

Create `test/lib/api/events.createPromotionCheckout.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetValidAccessToken = vi.fn();
const mockGetApiUrl = vi.fn();
const mockIsApiUrlConfigured = vi.fn();
const mockFetchWithHmac = vi.fn();

vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn(),
  getValidAccessToken: () => mockGetValidAccessToken(),
}));

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn(),
  buildEventsQuery: vi.fn(),
  getVercelProtectionBypassHeaders: () => ({}),
  getApiUrl: () => mockGetApiUrl(),
  isApiUrlConfigured: () => mockIsApiUrlConfigured(),
}));

vi.mock("../fetch-wrapper", () => ({
  fetchWithHmac: (url: string, options: RequestInit) =>
    mockFetchWithHmac(url, options),
}));

import { createPromotionCheckout } from "../../../lib/api/events";

describe("createPromotionCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsApiUrlConfigured.mockReturnValue(true);
    mockGetApiUrl.mockReturnValue("https://api.test");
    mockGetValidAccessToken.mockResolvedValue("test-token");
  });

  it("POSTs to /events/{id}/promotions/checkout with skipBodySigning and returns the url", async () => {
    mockFetchWithHmac.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    });

    const result = await createPromotionCheckout(
      "event-uuid-1",
      "https://www.esdeveniments.cat/e/my-event/promote/success",
      "https://www.esdeveniments.cat/e/my-event/promote/cancel",
    );

    expect(mockFetchWithHmac).toHaveBeenCalledWith(
      "https://api.test/events/event-uuid-1/promotions/checkout",
      expect.objectContaining({
        method: "POST",
        skipBodySigning: true,
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    const [, callOptions] = mockFetchWithHmac.mock.calls[0];
    expect(JSON.parse(callOptions.body as string)).toEqual({
      successUrl: "https://www.esdeveniments.cat/e/my-event/promote/success",
      cancelUrl: "https://www.esdeveniments.cat/e/my-event/promote/cancel",
    });
    expect(result).toEqual({ url: "https://checkout.stripe.com/session123" });
  });

  it("throws when the backend responds with a non-2xx status", async () => {
    mockFetchWithHmac.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not found",
    });

    await expect(
      createPromotionCheckout("event-uuid-1", "https://x/success", "https://x/cancel"),
    ).rejects.toThrow(/404/);
  });

  it("throws when no valid access token is available", async () => {
    mockGetValidAccessToken.mockResolvedValue(null);

    await expect(
      createPromotionCheckout("event-uuid-1", "https://x/success", "https://x/cancel"),
    ).rejects.toThrow("Authentication required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/lib/api/events.createPromotionCheckout.test.ts`
Expected: FAIL with `createPromotionCheckout is not a function` (or import error)

- [ ] **Step 3: Implement `createPromotionCheckout`**

In `lib/api/events.ts`, add this function immediately after `deleteEventById` (which ends
around line 358 — find the closing brace of `deleteEventById` and insert after it):

```ts
export async function createPromotionCheckout(
  id: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string }> {
  const { apiUrl, authToken } = await requireMutationAuth();

  const response = await fetchWithHmac(
    `${apiUrl}/events/${id}/promotions/checkout`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ successUrl, cancelUrl }),
      skipBodySigning: true,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("createPromotionCheckout: error response:", errorText);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }

  const payload = await response.json();
  if (!payload || typeof payload.url !== "string") {
    throw new Error(
      "createPromotionCheckout: backend response missing url field",
    );
  }

  return { url: payload.url };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/lib/api/events.createPromotionCheckout.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/events.ts test/lib/api/events.createPromotionCheckout.test.ts
git commit -m "feat(promote): add createPromotionCheckout backend call"
```

---

## Task 3: Server Action `createPromotionCheckoutAction`

**Files:**
- Create: `app/[locale]/e/[eventId]/promote/actions.ts`
- Test: Create `test/promote-checkout-action.test.ts`

**Interfaces:**
- Consumes: `createPromotionCheckout(id, successUrl, cancelUrl)` (Task 2),
  `fetchEventBySlug(slug)` and `getCurrentUser()` (both already exist, same imports as
  `edita/actions.ts`), `siteUrl` (`@config/index`), `withLocalePath` (`@utils/i18n-seo`).
- Produces: `createPromotionCheckoutAction(eventId: string, slug: string, locale:
  AppLocale): Promise<PromotionCheckoutResult>` — called by `PromoteEventClient` in
  Task 5.

- [ ] **Step 1: Write the failing test**

Create `test/promote-checkout-action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventDetailResponseDTO } from "types/api/event";

const mockCreatePromotionCheckout = vi.fn();
const mockFetchEventBySlug = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock("@lib/api/events", () => ({
  createPromotionCheckout: (id: string, successUrl: string, cancelUrl: string) =>
    mockCreatePromotionCheckout(id, successUrl, cancelUrl),
  fetchEventBySlug: (slug: string) => mockFetchEventBySlug(slug),
}));

vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

import { createPromotionCheckoutAction } from "../app/[locale]/e/[eventId]/promote/actions";

const CREATOR_ID = "creator-uuid-1";

function buildEvent(overrides: Partial<EventDetailResponseDTO> = {}): EventDetailResponseDTO {
  return {
    id: "event-uuid-1",
    hash: "hash",
    slug: "my-event",
    title: "My Event",
    type: "FREE",
    url: "",
    description: "desc",
    imageUrl: "",
    startDate: "2026-09-01",
    startTime: null,
    endDate: "2026-09-01",
    endTime: null,
    location: "Location",
    visits: 0,
    origin: "MANUAL",
    owner: {
      id: CREATOR_ID,
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
      organizerVerified: false,
    },
    city: { id: 1, name: "City", slug: "city", latitude: 0, longitude: 0, postalCode: "08001", rssFeed: null, enabled: true },
    region: { id: 1, name: "Region", slug: "region" },
    province: { id: 1, name: "Region", slug: "region" },
    categories: [],
    ...overrides,
  };
}

describe("createPromotionCheckoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the checkout url when the caller owns the event", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });
    mockCreatePromotionCheckout.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: true,
      url: "https://checkout.stripe.com/session123",
    });
    expect(mockCreatePromotionCheckout).toHaveBeenCalledWith(
      "event-uuid-1",
      expect.stringContaining("/e/my-event/promote/success"),
      expect.stringContaining("/e/my-event/promote/cancel"),
    );
  });

  it("rejects when the provided eventId does not match the resolved event's id", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent({ id: "different-uuid" }));
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });
    expect(mockCreatePromotionCheckout).not.toHaveBeenCalled();
  });

  it("rejects when the signed-in user does not own the event", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: "someone-else" });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });
  });

  it("rejects when the event does not exist", async () => {
    mockFetchEventBySlug.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({ success: false, error: "Event not found" });
  });

  it("converts a thrown backend error into a generic result instead of throwing", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });
    mockCreatePromotionCheckout.mockRejectedValue(new Error("HTTP error! status: 404"));

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/promote-checkout-action.test.ts`
Expected: FAIL (module not found: `app/[locale]/e/[eventId]/promote/actions`)

- [ ] **Step 3: Implement the Server Action**

Create `app/[locale]/e/[eventId]/promote/actions.ts`:

```ts
"use server";
import { createPromotionCheckout, fetchEventBySlug } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import type { PromotionCheckoutResult } from "types/event";

/**
 * Resolves the event by slug and verifies the caller-provided eventId matches
 * — same double-check as editEvent (app/[locale]/e/[eventId]/edita/actions.ts)
 * to prevent a client passing a slug it owns alongside a different eventId.
 */
export async function createPromotionCheckoutAction(
  eventId: string,
  slug: string,
  locale: AppLocale,
): Promise<PromotionCheckoutResult> {
  const [currentUser, event] = await Promise.all([
    getCurrentUser(),
    fetchEventBySlug(slug),
  ]);

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  if (event.id !== eventId) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    };
  }

  const isCreator = Boolean(
    currentUser?.id && event.owner?.id && currentUser.id === event.owner.id,
  );
  if (!isCreator) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    };
  }

  const successUrl = `${siteUrl}${withLocalePath(`/e/${slug}/promote/success`, locale)}`;
  const cancelUrl = `${siteUrl}${withLocalePath(`/e/${slug}/promote/cancel`, locale)}`;

  try {
    const { url } = await createPromotionCheckout(event.id, successUrl, cancelUrl);
    return { success: true, url };
  } catch (error) {
    console.error("createPromotionCheckoutAction: checkout failed", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/promote-checkout-action.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/e/\[eventId\]/promote/actions.ts test/promote-checkout-action.test.ts
git commit -m "feat(promote): add createPromotionCheckoutAction server action"
```

---

## Task 4: i18n messages for the promote page and upsell modal

**Files:**
- Modify: `messages/ca.json`, `messages/es.json`, `messages/en.json`

**Interfaces:**
- Produces: `App.EventPromote.*` namespace, `App.Publish.promoteUpsell.*` keys — consumed
  by Task 5 (promote page) and Task 6 (modal).

- [ ] **Step 1: Add `App.EventPromote` to `messages/ca.json`**

Find the `"EventEdit"` block (line 204) and insert a new `"EventPromote"` block right
after its closing `},` (before `"PublishPage"` at line 213):

```json
    "EventPromote": {
      "title": "Promociona el teu esdeveniment",
      "description": "Arriba a més gent promocionant el teu esdeveniment a Esdeveniments.cat.",
      "heading": "Promociona el teu esdeveniment",
      "subheading": "Destaca't per arribar a més gent i aparèixer als primers llocs.",
      "benefit1": "Més visibilitat a l'agenda",
      "benefit2": "Prioritat davant d'altres esdeveniments",
      "benefit3": "Més persones interessades",
      "priceLabel": "Preu",
      "priceNote": "Tarifa plana, pagament únic.",
      "confirmButton": "Confirma i paga",
      "confirmButtonLoading": "Redirigint a pagament...",
      "backToEvent": "Tornar a l'esdeveniment",
      "errorGeneric": "Alguna cosa ha fallat. Torna-ho a intentar.",
      "successPage": {
        "title": "Gràcies!",
        "subtitle": "El teu esdeveniment ja està promocionat.",
        "backToEvent": "Veure el teu esdeveniment"
      },
      "cancelPage": {
        "title": "Pagament cancel·lat",
        "subtitle": "El teu esdeveniment continua sent gratuït.",
        "backToEvent": "Tornar a l'esdeveniment"
      }
    },
```

- [ ] **Step 2: Add the matching `promoteUpsell` block inside `App.Publish` in `messages/ca.json`**

Find `"sponsorLink": "Veure opcions de patrocini",` inside the `"Publish"` block (line
315) and add a new `"promoteUpsell"` key right after it:

```json
      "promoteUpsell": {
        "title": "Impulsa el teu esdeveniment!",
        "description": "Promociona el teu esdeveniment ara per arribar a molta més gent i aparèixer als primers llocs de la plataforma.",
        "promoteButton": "Promocionar esdeveniment",
        "keepFreeButton": "Mantenir gratuït"
      },
```

- [ ] **Step 3: Repeat Steps 1-2 for `messages/es.json`**

`"EventPromote"` block (after the `"EventEdit"` block, same position, line 204 area):

```json
    "EventPromote": {
      "title": "Promociona tu evento",
      "description": "Llega a más gente promocionando tu evento en Esdeveniments.cat.",
      "heading": "Promociona tu evento",
      "subheading": "Destaca para llegar a más gente y aparecer en los primeros puestos.",
      "benefit1": "Más visibilidad en la agenda",
      "benefit2": "Prioridad frente a otros eventos",
      "benefit3": "Más personas interesadas",
      "priceLabel": "Precio",
      "priceNote": "Tarifa plana, pago único.",
      "confirmButton": "Confirmar y pagar",
      "confirmButtonLoading": "Redirigiendo al pago...",
      "backToEvent": "Volver al evento",
      "errorGeneric": "Algo ha fallado. Inténtalo de nuevo.",
      "successPage": {
        "title": "¡Gracias!",
        "subtitle": "Tu evento ya está promocionado.",
        "backToEvent": "Ver tu evento"
      },
      "cancelPage": {
        "title": "Pago cancelado",
        "subtitle": "Tu evento sigue siendo gratuito.",
        "backToEvent": "Volver al evento"
      }
    },
```

`"promoteUpsell"` inside `"Publish"` (after `"sponsorLink"`, line 315 area):

```json
      "promoteUpsell": {
        "title": "¡Impulsa tu evento!",
        "description": "Promociona tu evento ahora para llegar a mucha más gente y aparecer en los primeros puestos de la plataforma.",
        "promoteButton": "Promocionar evento",
        "keepFreeButton": "Mantener gratis"
      },
```

- [ ] **Step 4: Repeat Steps 1-2 for `messages/en.json`**

`"EventPromote"` block:

```json
    "EventPromote": {
      "title": "Promote your event",
      "description": "Reach more people by promoting your event on Esdeveniments.cat.",
      "heading": "Promote your event",
      "subheading": "Stand out to reach more people and appear at the top.",
      "benefit1": "More visibility in the agenda",
      "benefit2": "Priority over other events",
      "benefit3": "More interested people",
      "priceLabel": "Price",
      "priceNote": "Flat fee, one-time payment.",
      "confirmButton": "Confirm and pay",
      "confirmButtonLoading": "Redirecting to payment...",
      "backToEvent": "Back to event",
      "errorGeneric": "Something went wrong. Please try again.",
      "successPage": {
        "title": "Thank you!",
        "subtitle": "Your event is now promoted.",
        "backToEvent": "View your event"
      },
      "cancelPage": {
        "title": "Payment canceled",
        "subtitle": "Your event remains free.",
        "backToEvent": "Back to event"
      }
    },
```

`"promoteUpsell"` inside `"Publish"`:

```json
      "promoteUpsell": {
        "title": "Boost your event!",
        "description": "Promote your event now to reach way more people and appear at the top of the platform.",
        "promoteButton": "Promote Event",
        "keepFreeButton": "Keep it free"
      },
```

- [ ] **Step 5: Validate JSON syntax and key parity across locales**

Run: `yarn i18n:check`
Expected: PASS (no missingKeys/invalidKeys reported for the new namespaces)

- [ ] **Step 6: Commit**

```bash
git add messages/ca.json messages/es.json messages/en.json
git commit -m "feat(promote): add i18n messages for event promotion"
```

---

## Task 5: Promote page (Server Component gate + client component)

**Files:**
- Modify: `config/pricing.ts` (add the MVP pricing-options function)
- Create: `app/[locale]/e/[eventId]/promote/page.tsx`
- Create: `app/[locale]/e/[eventId]/promote/PromoteEventClient.tsx`
- Test: Create `test/promote-event-client.test.tsx`

**Interfaces:**
- Consumes: `fetchEventBySlug`, `getCurrentUser` (existing), `createPromotionCheckoutAction`
  (Task 3), `PromoteEventClientProps` (Task 1), `getEventPromotionOptions`
  (`config/pricing.ts`, this task).
- Produces: the `/e/[eventId]/promote` route, rendered `PromoteEventClient` component
  used by Task 7's E2E flow.

- [ ] **Step 1: Add `getEventPromotionOptions` to `config/pricing.ts`**

This repo already centralizes all promotion/sponsor pricing in `config/pricing.ts`
(`BASE_PRICES_CENTS`, `DISPLAY_PRICES_EUR`) specifically so a price never lives loose in
a component. But Gerard's backend has no real pricing methodology for event promotion
yet (duration tiers, geo-scope tiers — see the design doc's "Risks" section and the
2026-08-03 Catalan message sent to him). Building a full `/api/promotions/event-config`
route + external wrapper right now, for a value that's a single hardcoded number with
zero real backend config behind it, would be inventing structure for a need that doesn't
exist yet.

The right-sized seam is a function that returns a list, not a network layer: today it
returns exactly one option, so `PromoteEventClient` already renders "whatever the list
contains" instead of a single hardcoded line. When Gerard defines real tiers, this
function's *implementation* changes (likely a fetch from a new endpoint at that point) —
but nothing that calls it has to change, since it already iterates a list. Add this at
the end of `config/pricing.ts`, after `DISPLAY_PRICES_EUR`:

```ts
export interface EventPromotionOption {
  id: string;
  priceEur: number;
}

/**
 * MVP: exactly one flat-fee option for event promotion checkout. Structured
 * as a list (not a single constant) so the promote page already renders
 * "whatever this returns" rather than a hardcoded line — when Gerard defines
 * real duration/geo-scope tiers (methodology still undecided — see the
 * design doc and the message sent to him), this function's implementation
 * changes, not its callers.
 */
export function getEventPromotionOptions(): EventPromotionOption[] {
  return [{ id: "standard", priceEur: 5 }];
}
```

- [ ] **Step 2: Write the failing test for `PromoteEventClient`**

Create `test/promote-event-client.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockCreatePromotionCheckoutAction = vi.fn();
const mockUseLocale = vi.fn(() => "ca");

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => mockUseLocale(),
}));

vi.mock("../app/[locale]/e/[eventId]/promote/actions", () => ({
  createPromotionCheckoutAction: (eventId: string, slug: string, locale: string) =>
    mockCreatePromotionCheckoutAction(eventId, slug, locale),
}));

const originalLocation = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error -- overriding a readonly for the test
  delete window.location;
  // @ts-expect-error -- test-only stub
  window.location = { href: "" };
});

afterEach(() => {
  window.location = originalLocation;
});

import PromoteEventClient from "../app/[locale]/e/[eventId]/promote/PromoteEventClient";

describe("PromoteEventClient", () => {
  it("redirects to the returned Stripe url on success", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: true,
      url: "https://checkout.stripe.com/session123",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session123");
    });
  });

  it("shows a generic error and does not redirect when the action fails", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("rejects a non-https url instead of redirecting", async () => {
    mockCreatePromotionCheckoutAction.mockResolvedValue({
      success: true,
      url: "/undefined",
    });

    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);
    fireEvent.click(screen.getByTestId("promote-confirm-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(window.location.href).toBe("");
  });

  it("renders the price from getEventPromotionOptions rather than a hardcoded value", () => {
    render(<PromoteEventClient eventId="event-uuid-1" slug="my-event" />);

    // 5 is today's only entry from getEventPromotionOptions() — asserting
    // against the rendered text (not re-importing the config function) keeps
    // this test honest about what the user actually sees.
    expect(screen.getByText("5€")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test test/promote-event-client.test.tsx`
Expected: FAIL (module not found: `PromoteEventClient`)

- [ ] **Step 4: Implement `PromoteEventClient`**

Create `app/[locale]/e/[eventId]/promote/PromoteEventClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { getEventPromotionOptions } from "@config/pricing";
import type { AppLocale } from "types/i18n";
import type { PromoteEventClientProps } from "types/props";
import { createPromotionCheckoutAction } from "./actions";

function isValidCheckoutUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export default function PromoteEventClient({
  eventId,
  slug,
}: PromoteEventClientProps) {
  const t = useTranslations("App.EventPromote");
  const locale = useLocale() as AppLocale;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // MVP: exactly one option today. Rendered from a list (not a single
  // constant) so this component doesn't change shape when Gerard adds real
  // duration/geo-scope tiers later — only getEventPromotionOptions' return
  // value grows.
  const [promotionOption] = getEventPromotionOptions();

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    const result = await createPromotionCheckoutAction(eventId, slug, locale);

    if (!result.success) {
      setError(t("errorGeneric"));
      setIsSubmitting(false);
      return;
    }

    if (!isValidCheckoutUrl(result.url)) {
      console.error("PromoteEventClient: invalid checkout url", result.url);
      setError(t("errorGeneric"));
      setIsSubmitting(false);
      return;
    }

    window.location.href = result.url;
  };

  return (
    // max-w-[520px] matches DESIGN.md's `containers.detail` token (520px) —
    // this is a single-focus confirmation flow like the event detail page,
    // not a multi-field form (which would use the wider `container` class,
    // as /publica and /edita do). Tailwind's config only customizes the
    // generic `container` utility, not a named "detail" width, so the literal
    // value is the correct concrete implementation of that design token today.
    <div className="max-w-[520px] mx-auto py-section-y px-section-x">
      <Link
        href={`/e/${slug}`}
        className="inline-flex items-center gap-1 body-small text-foreground/70 hover:text-foreground mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t("backToEvent")}
      </Link>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-1 text-foreground-strong">{t("heading")}</h1>
          <p className="body-large text-foreground/80">{t("subheading")}</p>
        </div>

        <div className="card-bordered card-body space-y-3">
          <ul className="flex flex-col gap-2 body-normal text-foreground/80">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit1")}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit2")}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit3")}
            </li>
          </ul>
        </div>

        <div className="card-bordered card-body flex items-center justify-between">
          <span className="body-normal text-foreground/70">{t("priceLabel")}</span>
          <span className="heading-2 text-foreground-strong">
            {promotionOption.priceEur}€
          </span>
        </div>
        <p className="body-small text-foreground/60 -mt-4">{t("priceNote")}</p>

        {error && (
          <div
            className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg"
            role="alert"
          >
            <p className="text-sm font-medium text-error">{error}</p>
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          className="w-full min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
          data-testid="promote-confirm-button"
          onClick={handleConfirm}
        >
          {isSubmitting ? t("confirmButtonLoading") : t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test test/promote-event-client.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Implement the Server Component page**

Create `app/[locale]/e/[eventId]/promote/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { siteUrl } from "@config/index";
import { withLocalePath } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { fetchEventBySlug } from "lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import PromoteEventClient from "./PromoteEventClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote" });
  const canonical = `${siteUrl}${withLocalePath(`/e/${eventId}/promote`, locale)}`;
  return {
    title: t("title"),
    description: t("description"),
    robots: "noindex, nofollow",
    alternates: { canonical },
  };
}

export default async function PromotePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const [event, currentUser] = await Promise.all([
    fetchEventBySlug(slug),
    getCurrentUser(),
  ]);

  // Only the event creator may promote it. Treat missing/unknown ownership as
  // 404 to avoid leaking the existence of the promote page — same convention
  // as the edita page's ownership gate.
  const currentUserId = currentUser?.id;
  const isCreator = Boolean(currentUserId) && currentUserId === event?.owner?.id;
  if (!event || !isCreator) return notFound();

  return <PromoteEventClient eventId={event.id} slug={event.slug} />;
}
```

- [ ] **Step 7: Run full test suite and typecheck**

Run: `yarn typecheck && yarn test test/promote-event-client.test.tsx test/promote-checkout-action.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add config/pricing.ts app/\[locale\]/e/\[eventId\]/promote/page.tsx app/\[locale\]/e/\[eventId\]/promote/PromoteEventClient.tsx test/promote-event-client.test.tsx
git commit -m "feat(promote): add /e/[eventId]/promote page with centralized MVP pricing"
```

---

## Task 6: Success and cancel return pages

**Files:**
- Create: `app/[locale]/e/[eventId]/promote/success/page.tsx`
- Create: `app/[locale]/e/[eventId]/promote/cancel/page.tsx`
- Test: none (static pages; covered by the typecheck/lint gate and manual verification
  in Task 9)

**Interfaces:**
- Consumes: `App.EventPromote.successPage.*` / `App.EventPromote.cancelPage.*` (Task 4).
- Produces: the two return routes that `successUrl`/`cancelUrl` (Task 3) point to.

- [ ] **Step 1: Implement the success page**

Create `app/[locale]/e/[eventId]/promote/success/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { Link } from "@i18n/routing";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote.successPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PromoteSuccessPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: slug } = await params;
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations("App.EventPromote.successPage");

  return (
    // max-w-3xl matches the existing /patrocina/success precedent exactly
    // (app/[locale]/patrocina/success/page.tsx) — same return-page pattern,
    // reused verbatim rather than picking a new width for no reason.
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircleIcon className="h-16 w-16 text-success" />
        </div>
        <h1 className="heading-1">{t("title")}</h1>
        <p className="body-large text-foreground/80">{t("subtitle")}</p>

        <div className="flex justify-center">
          <Link href={`/e/${slug}`} className="btn-primary">
            {t("backToEvent")}
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Implement the cancel page**

Create `app/[locale]/e/[eventId]/promote/cancel/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { Link } from "@i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.EventPromote.cancelPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PromoteCancelPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId: slug } = await params;
  const locale = (await rootLocale()) as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations("App.EventPromote.cancelPage");

  return (
    // max-w-3xl matches /patrocina/cancelled exactly — same reasoning as the
    // success page above.
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="heading-1">{t("title")}</h1>
        <p className="body-large text-foreground/80">{t("subtitle")}</p>

        <div className="flex justify-center">
          <Link href={`/e/${slug}`} className="btn-outline">
            {t("backToEvent")}
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `yarn typecheck && yarn lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/e/\[eventId\]/promote/success/page.tsx app/\[locale\]/e/\[eventId\]/promote/cancel/page.tsx
git commit -m "feat(promote): add promotion success and cancel return pages"
```

---

## Task 7: Owner-only "Promote" entry point on the event detail page

**Files:**
- Create: `app/[locale]/e/[eventId]/components/EventPromoteAction.tsx`
- Modify: `app/[locale]/e/[eventId]/components/EventSidebar.tsx:136`
- Test: Create `test/event-promote-action.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (existing), `EventPromoteActionProps` (Task 1).
- Produces: `EventPromoteAction` component, rendered inside `EventSidebar`.

- [ ] **Step 1: Write the failing test**

Create `test/event-promote-action.test.tsx` (mirrors `test/event-edit-action.test.tsx`
exactly):

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";

const OWNER_ID = "e10c6a5f-306c-487f-9e71-876f67c7bbb2";
const OTHER_USER_ID = "different-user-uuid";

let authUser: AuthUser | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  MegaphoneIcon: () => <svg data-testid="megaphone-icon" />,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser }),
}));

import EventPromoteAction from "@app/[locale]/e/[eventId]/components/EventPromoteAction";

describe("EventPromoteAction", () => {
  beforeEach(() => {
    authUser = null;
  });

  it("shows the promote link when the signed-in user owns the event", () => {
    authUser = { id: OWNER_ID, email: "a@b.com", name: "A", username: "a" };
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    const link = screen.getByTestId("event-promote-link");
    expect(link.getAttribute("href")).toBe("/e/my-event/promote");
  });

  it("renders nothing when the signed-in user is not the owner", () => {
    authUser = { id: OTHER_USER_ID, email: "b@c.com", name: "B", username: "b" };
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });

  it("renders nothing when logged out", () => {
    authUser = null;
    render(<EventPromoteAction ownerId={OWNER_ID} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });

  it("renders nothing when the event has no owner (e.g. scraped/RSS events)", () => {
    authUser = { id: OWNER_ID, email: "a@b.com", name: "A", username: "a" };
    render(<EventPromoteAction ownerId={undefined} slug="my-event" />);

    expect(screen.queryByTestId("event-promote-link")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/event-promote-action.test.tsx`
Expected: FAIL (module not found: `EventPromoteAction`)

- [ ] **Step 3: Implement `EventPromoteAction`**

Create `app/[locale]/e/[eventId]/components/EventPromoteAction.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import type { EventPromoteActionProps } from "types/props";

/**
 * Owner-only promote link for the event detail sidebar. Client-side check
 * (not a server-side getCurrentUser() call) so a page view doesn't pay for
 * a backend enrichment round-trip just to decide whether to show this link —
 * mirrors EventEditAction exactly.
 */
export default function EventPromoteAction({
  ownerId,
  slug,
}: EventPromoteActionProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");

  if (!ownerId || user?.id !== ownerId) return null;

  return (
    <Link
      href={`/e/${slug}/promote`}
      className="inline-flex items-center gap-2 btn-outline btn-sm"
      data-testid="event-promote-link"
    >
      <MegaphoneIcon className="w-4 h-4" aria-hidden="true" />
      {t("promoteEvent")}
    </Link>
  );
}
```

- [ ] **Step 4: Add the `promoteEvent` translation key**

Add `"promoteEvent"` next to `"editEvent"` in `Components.EventPage` in all three
`messages/*.json` files:

`messages/ca.json` (next to line 916): `"promoteEvent": "Promocionar",`
`messages/es.json` (next to line 908): `"promoteEvent": "Promocionar",`
`messages/en.json` (next to line 908): `"promoteEvent": "Promote",`

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test test/event-promote-action.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Render `EventPromoteAction` in `EventSidebar`**

In `app/[locale]/e/[eventId]/components/EventSidebar.tsx`, add the import next to the
existing `EventEditAction` import (line 16):

```tsx
import EventEditAction from "./EventEditAction";
import EventPromoteAction from "./EventPromoteAction";
```

Then render it right after `EventEditAction` at line 136:

```tsx
            {/* Owner-only edit action */}
            <EventEditAction ownerId={event.owner?.id} slug={event.slug ?? ""} />
            <EventPromoteAction ownerId={event.owner?.id} slug={event.slug ?? ""} />
```

- [ ] **Step 7: Run i18n check, typecheck, lint**

Run: `yarn i18n:check && yarn typecheck && yarn lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/\[locale\]/e/\[eventId\]/components/EventPromoteAction.tsx app/\[locale\]/e/\[eventId\]/components/EventSidebar.tsx test/event-promote-action.test.tsx messages/ca.json messages/es.json messages/en.json
git commit -m "feat(promote): add owner-only Promote entry point on event detail page"
```

---

## Task 8: Post-publish upsell modal

**Files:**
- Create: `app/[locale]/publica/PromoteUpsellModal.tsx`
- Modify: `app/[locale]/publica/page.tsx` (splice into `onSubmit`'s success path)
- Test: Create `test/promote-upsell-modal.test.tsx`

**Interfaces:**
- Consumes: `Modal` (`components/ui/common/modal`), `PromoteUpsellModalProps` (Task 1),
  `sendGoogleEvent` (`@utils/analytics`).
- Produces: modal shown right after `createEventAction` succeeds in `publica/page.tsx`.

- [ ] **Step 1: Write the failing test**

Create `test/promote-upsell-modal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockPush = vi.fn();
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Minimal Modal stub mirroring the real component's close/actionButton contract:
// calls setOpen(false) after onActionButtonClick resolves, unless it returns false.
vi.mock("@components/ui/common/modal", () => ({
  __esModule: true,
  default: ({
    open,
    setOpen,
    title,
    children,
    actionButton,
    onActionButtonClick,
  }: {
    open: boolean;
    setOpen: (open: boolean) => void;
    title: string;
    children: ReactNode;
    actionButton?: ReactNode;
    onActionButtonClick?: () => boolean | void | Promise<boolean | void>;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {actionButton && (
          <button
            data-testid="modal-action-button"
            onClick={async () => {
              const result = await onActionButtonClick?.();
              if (result !== false) setOpen(false);
            }}
          >
            {actionButton}
          </button>
        )}
      </div>
    );
  },
}));

import PromoteUpsellModal from "../app/[locale]/publica/PromoteUpsellModal";

describe("PromoteUpsellModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to the promote page and keeps working even if Modal also calls setOpen", () => {
    const setOpen = vi.fn();
    render(<PromoteUpsellModal open setOpen={setOpen} slug="my-event" />);

    fireEvent.click(screen.getByTestId("modal-action-button"));

    expect(mockPush).toHaveBeenCalledWith("/e/my-event/promote");
  });

  it("navigates to the event detail page and closes the modal on 'keep it free'", () => {
    const setOpen = vi.fn();
    render(<PromoteUpsellModal open setOpen={setOpen} slug="my-event" />);

    fireEvent.click(screen.getByTestId("promote-modal-keep-free"));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/e/my-event");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test test/promote-upsell-modal.test.tsx`
Expected: FAIL (module not found: `PromoteUpsellModal`)

- [ ] **Step 3: Implement `PromoteUpsellModal`**

Create `app/[locale]/publica/PromoteUpsellModal.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import Modal from "@components/ui/common/modal";
import Button from "@components/ui/common/button";
import { sendGoogleEvent } from "@utils/analytics";
import type { PromoteUpsellModalProps } from "types/props";

export default function PromoteUpsellModal({
  open,
  setOpen,
  slug,
}: PromoteUpsellModalProps) {
  const t = useTranslations("App.Publish.promoteUpsell");
  const router = useRouter();

  const handlePromote = () => {
    sendGoogleEvent("promote_modal_cta_click", {
      event_slug: slug,
      source: "publica",
    });
    router.push(`/e/${slug}/promote`);
    // Explicitly returning false stops Modal's own setOpen(false) from racing
    // this navigation — see the design doc's "Modal" section for why this
    // matters (Modal calls setOpen(false) automatically unless told not to).
    return false;
  };

  const handleKeepFree = () => {
    sendGoogleEvent("promote_modal_dismiss", {
      event_slug: slug,
      source: "publica",
    });
    setOpen(false);
    router.push(`/e/${slug}`);
  };

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={t("title")}
      actionButton={t("promoteButton")}
      onActionButtonClick={handlePromote}
      testId="promote-upsell-modal"
    >
      <div className="flex flex-col gap-4 py-4">
        <p className="body-normal text-foreground/80">{t("description")}</p>
        <Button
          type="button"
          variant="neutral"
          className="btn-outline w-full"
          data-testid="promote-modal-keep-free"
          onClick={handleKeepFree}
        >
          {t("keepFreeButton")}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test test/promote-upsell-modal.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Splice the modal into `publica/page.tsx`, lazy-loaded**

The modal only ever renders after a successful publish — there's no reason to ship it in
`/publica`'s initial bundle. This file already has the exact precedent for this: the
preview modal's content is lazy-loaded via `next/dynamic` with `ssr: false` (lines 44-53).
Follow the same pattern instead of a static import.

In `app/[locale]/publica/page.tsx`, replace the existing `PreviewContent` dynamic-import
block (lines 44-53):

```tsx
// Lazy load preview content (only shown in modal when user clicks preview)
// Client component, so we can use dynamic directly with ssr: false
const PreviewContent = dynamic(
  () => import("@components/ui/EventForm/preview/PreviewContent"),
  {
    ssr: false, // Preview is only shown in modal, not needed for initial render
    loading: () => (
      <div className="w-full h-64 bg-muted animate-pulse rounded" aria-label="Loading preview" />
    ),
  }
);
```

with the same block plus a second `dynamic()` call for the new modal:

```tsx
// Lazy load preview content (only shown in modal when user clicks preview)
// Client component, so we can use dynamic directly with ssr: false
const PreviewContent = dynamic(
  () => import("@components/ui/EventForm/preview/PreviewContent"),
  {
    ssr: false, // Preview is only shown in modal, not needed for initial render
    loading: () => (
      <div className="w-full h-64 bg-muted animate-pulse rounded" aria-label="Loading preview" />
    ),
  }
);

// Lazy load the post-publish upsell modal — same reasoning as PreviewContent
// above: it only renders after a successful publish, so it shouldn't ship in
// the initial /publica bundle.
const PromoteUpsellModal = dynamic(() => import("./PromoteUpsellModal"), {
  ssr: false,
});
```

Add a new state variable inside `PublishForm`, near the other `showPreview`/`showCompleteProfileGate`
state (around line 135, after `showCompleteProfileGate`):

```tsx
  const [showCompleteProfileGate, setShowCompleteProfileGate] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
```

Replace the success-path tail of `onSubmit` (currently lines 606-625):

```tsx
        const { slug } = event;
        if (typeof document !== "undefined") {
          document.body.dataset.lastE2eSlug = slug;
        }
        if (typeof window !== "undefined") {
          window.__LAST_E2E_PUBLISH_SLUG__ = slug;
        }

        sendGoogleEvent("publish_success", {
          ...buildPublishContext({
            form,
            imageFile,
            uploadedImageUrl: resolvedImageUrl,
          }),
          source: "publica",
          has_slug: Boolean(slug),
        });

        submittedRef.current = true;
        router.push(`/e/${slug}`);
```

with:

```tsx
        const { slug } = event;
        if (typeof document !== "undefined") {
          document.body.dataset.lastE2eSlug = slug;
        }
        if (typeof window !== "undefined") {
          window.__LAST_E2E_PUBLISH_SLUG__ = slug;
        }

        sendGoogleEvent("publish_success", {
          ...buildPublishContext({
            form,
            imageFile,
            uploadedImageUrl: resolvedImageUrl,
          }),
          source: "publica",
          has_slug: Boolean(slug),
        });

        submittedRef.current = true;
        sendGoogleEvent("promote_modal_shown", {
          event_slug: slug,
          source: "publica",
        });
        setPublishedSlug(slug);
```

Add the modal render right before the closing `</>` of the returned JSX (after the
`EventForm` block, near line 815, still inside the same top-level fragment as the
existing preview `Modal`):

```tsx
      {publishedSlug && (
        <PromoteUpsellModal
          open={Boolean(publishedSlug)}
          setOpen={(open) => {
            if (!open) setPublishedSlug(null);
          }}
          slug={publishedSlug}
        />
      )}
```

- [ ] **Step 6: Run typecheck and the full unit suite**

Run: `yarn typecheck && yarn test`
Expected: PASS (all suites, including the new ones)

- [ ] **Step 7: Commit**

```bash
git add app/\[locale\]/publica/PromoteUpsellModal.tsx app/\[locale\]/publica/page.tsx test/promote-upsell-modal.test.tsx
git commit -m "feat(promote): show post-publish promotion upsell modal"
```

---

## Task 9: Update the E2E publish-integration spec for the new modal

**Files:**
- Modify: `e2e/publish-integration.spec.ts:288-294`

**Interfaces:**
- Consumes: `promote-upsell-modal` testId (`testId="promote-upsell-modal"` from Task 8,
  which `Modal` forwards as `data-testid`), `promote-modal-keep-free` testId.

- [ ] **Step 1: Replace the racing assertion**

In `e2e/publish-integration.spec.ts`, find this block (lines 288-294):

```ts
    // Start waiting before the click so the redirect cannot race the assertion.
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/publica"), {
        timeout: 60_000,
      }),
      publishButton.click(),
    ]);
```

Replace it with:

```ts
    // Publishing now shows the post-publish promotion upsell modal instead of
    // an immediate redirect. Wait for the modal, then dismiss via "keep it
    // free" (the existing test's intent: verify the plain publish → detail
    // page path still works).
    await publishButton.click();
    const upsellModal = page.getByTestId("promote-upsell-modal");
    await expect(upsellModal).toBeVisible({ timeout: 30_000 });

    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/publica"), {
        timeout: 60_000,
      }),
      page.getByTestId("promote-modal-keep-free").click(),
    ]);
```

- [ ] **Step 2: Add a second test for the "Promote Event" path**

After the closing `});` of the existing `test("login → publish event → verify detail page
shows creator", ...)` test (just before the final `});` that closes `test.describe`), add:

```ts
  test("login → publish event → promote upsell links to the promote page", async ({
    page,
  }) => {
    await loginViaUI(page, email!, password!);
    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/en/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });

    const promoteTestTitle = `${TEST_EVENT_TITLE} Promote`;
    await page.locator("#title").fill(promoteTestTitle);
    await page.locator("#description").fill(
      `Automated E2E test event for promote flow, created at ${new Date().toISOString()}. Safe to delete.`
    );
    await page.locator("#url").fill("https://example.com/e2e-test-promote");
    await page.getByTestId("next-button").click();

    const townSelect = page.getByTestId("town-select");
    await expect(townSelect).toBeVisible({ timeout: 15_000 });
    await townSelect.click();
    await page.keyboard.type("Barcelona");
    const townOption = page
      .locator('[role="listbox"]:visible')
      .getByRole("option")
      .first();
    await expect(townOption).toBeVisible({ timeout: 15_000 });
    await townOption.click();
    await page.locator("#location").fill("Test Venue - E2E Promote");

    const categoriesSelect = page.locator("#categories").locator("..");
    await categoriesSelect.click();
    const categoryOption = page
      .locator('[role="listbox"]:visible')
      .getByRole("option")
      .first();
    await expect(categoryOption).toBeVisible({ timeout: 15_000 });
    await categoryOption.click();
    await page.getByTestId("next-button").click();

    const imageUrlTab = page.getByRole("button", { name: /url|enllaç/i });
    if (await imageUrlTab.isVisible()) {
      await imageUrlTab.click();
    }
    const imageUrlInput = page.locator('input[placeholder*="http"]').first();
    if (await imageUrlInput.isVisible()) {
      await imageUrlInput.fill("https://picsum.photos/800/600");
    }

    const futureDateIso = await page.evaluate(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      return [
        futureDate.getFullYear(),
        String(futureDate.getMonth() + 1).padStart(2, "0"),
        String(futureDate.getDate()).padStart(2, "0"),
      ].join("-");
    });
    const datePickerPlaceholder = page.getByRole("button", {
      name: /select date and time|seleccionar data i hora/i,
    });
    const startDateButton = page.getByRole("button", { name: /^(Start|Inici):/ });
    await expect(datePickerPlaceholder.or(startDateButton)).toBeVisible({
      timeout: 15_000,
    });
    if (await datePickerPlaceholder.isVisible().catch(() => false)) {
      await datePickerPlaceholder.focus();
    }
    await expect(startDateButton).toBeVisible({ timeout: 15_000 });
    await startDateButton.click();
    const futureDateButton = page.locator(`[data-day="${futureDateIso}"]`);
    await expect(futureDateButton).toBeVisible({ timeout: 15_000 });
    await futureDateButton.click();

    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeVisible({ timeout: 10_000 });
    await expect(publishButton).toHaveAttribute("data-publish-ready", "true", {
      timeout: 10_000,
    });
    await publishButton.click();

    const upsellModal = page.getByTestId("promote-upsell-modal");
    await expect(upsellModal).toBeVisible({ timeout: 30_000 });

    await Promise.all([
      page.waitForURL((url) => url.pathname.includes("/promote"), {
        timeout: 30_000,
      }),
      page.getByTestId("promote-upsell-modal-action-button").click(),
    ]);

    expect(page.url()).toContain("/promote");

    // Cleanup: this test creates its own event, separate from the suite-level
    // afterAll cleanup which only tracks TEST_EVENT_TITLE (not this variant).
    const currentUrl = page.url();
    const slugMatch = currentUrl.match(/\/e\/([^/]+)\/promote/);
    if (slugMatch) {
      const promoteEventId = await findCreatedEventId(page, promoteTestTitle);
      if (promoteEventId) await cleanupEvent(page, promoteEventId);
    }
  });
```

Note: `promote-upsell-modal-action-button` is the `data-testid` the shared `Modal`
component derives from `testId` — confirmed in `components/ui/common/modal/index.tsx`:
`data-testid={testId ? \`${testId}-action-button\` : undefined}` on its action button.

- [ ] **Step 3: Verify the spec file still typechecks**

Run: `yarn typecheck`
Expected: PASS

Note: this spec only runs against real staging credentials
(`E2E_STAGING_EMAIL`/`E2E_STAGING_PASSWORD`), so it cannot be executed locally without
them — typecheck is the practical verification step here, plus manual review against
Task 8's testIds.

- [ ] **Step 4: Commit**

```bash
git add e2e/publish-integration.spec.ts
git commit -m "test(e2e): update publish-integration spec for promotion upsell modal"
```

---

## Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `yarn test`
Expected: PASS — all suites green, including every new test file from Tasks 2, 3, 5, 7, 8

- [ ] **Step 2: Typecheck**

Run: `yarn typecheck`
Expected: PASS with zero errors

- [ ] **Step 3: Lint**

Run: `yarn lint`
Expected: PASS with zero errors (pre-existing warnings acceptable per repo convention)

- [ ] **Step 4: i18n key parity check**

Run: `yarn i18n:check`
Expected: PASS — no missingKeys/invalidKeys across `ca`/`es`/`en` for any new namespace

- [ ] **Step 5: Manual browser verification**

Start the dev server (`yarn dev`), then manually:
1. Log in, publish a test event, confirm the upsell modal appears with the correct copy.
2. Click "Keep it free" — confirm it closes the modal and lands on `/e/[slug]`.
3. Publish another event, click "Promote Event" — confirm it lands on
   `/e/[slug]/promote` with benefits, the €5 price, and a working "Confirm and Pay"
   button (this will hit the real backend endpoint, which does not exist yet, so expect
   and verify the generic error message renders cleanly rather than a broken page).
4. Visit an existing event you own — confirm the new "Promote" button appears in the
   sidebar next to "Edit", and that it's absent for events you don't own or when logged
   out.
5. Navigate directly to `/e/[slug]/promote/success` and `/e/[slug]/promote/cancel` —
   confirm both render cleanly with a working "back to event" link.

- [ ] **Step 6: Final commit (if manual verification surfaced fixes)**

```bash
git add -A
git commit -m "fix(promote): address issues found in manual verification"
```

(Skip this commit if no fixes were needed.)

---

## Self-Review Notes

**Spec coverage:** All five in-scope items from the design doc are covered — modal
(Task 8), promote page (Task 5), Server Action integration (Tasks 2-3), success/cancel
pages (Task 6), analytics (woven into Tasks 5 and 8). The event-detail entry point added
during review is Task 7. Out-of-scope items (pricing lookup, duplicate-checkout guard,
list sorting, non-owner promotion, webhook/Stripe SDK) are deliberately absent from every
task.

**Type consistency:** `PromotionCheckoutResult` (Task 1, defined in `types/event.ts` next
to its two direct precedents `EditEventResult`/`CreateEventActionResult` — not
`types/props.ts`, which is props-only) is used identically in Task 3's action signature
and Task 5's client component — checked. `EventPromoteActionProps` (Task 1) matches
`EventEditActionProps`'s shape exactly, used consistently in Task 7.
`PromoteUpsellModalProps` (Task 1) matches the props Task 8's component and test actually
destructure.

**No placeholders:** every step has complete, concrete code — no TBD/TODO markers, no
"add appropriate error handling" prose without an implementation.

**Post-plan audit (DRY/centralize/types/design/performance):** a second pass, prompted by
direct user challenge, caught four issues fixed above: (1) `PromotionCheckoutResult` had
been placed in `types/props.ts` instead of `types/event.ts`, inconsistent with its own
named precedents — moved in Task 1. (2) The €5 MVP fee was a raw literal inline in JSX
instead of living in `config/pricing.ts`, the file that already centralizes every other
promotion/sponsor price in this repo specifically to prevent that — moved to
`getEventPromotionOptions()` in Task 5 (a list-returning function rather than a bare
constant, so the component already renders "whatever the list contains" instead of a
hardcoded line — deliberately NOT a full `/api/promotions/event-config` route, since
Gerard's backend has no real duration/geo-scope tiers yet and building that network layer
now would be inventing structure for a need that doesn't exist; see the design doc's
"Risks" section and the message sent to Gerard on 2026-08-03). (3) `DESIGN.md` (required
reading before any UI code, per this repo's CLAUDE.md) was not actually read before the
first draft of this plan; once read, the promote page's container width (`max-w-2xl`)
didn't match either `DESIGN.md`'s `containers.detail` token (520px, the correct token for
a single-focus confirmation page) or the actual `/patrocina/success`+`/patrocina/cancelled`
precedent's `max-w-3xl` (which the success/cancel pages in Task 6 claimed to mirror but
didn't) — both corrected to their proper values. (4) `PromoteUpsellModal` was a static
import in `publica/page.tsx` despite that same file already lazy-loading `PreviewContent`
via `next/dynamic` with `ssr: false` for the identical reason (only renders after a specific
user action, not on initial page load) — changed to follow the existing pattern in
Task 8.

## Post-review corrections (2026-08-04)

An AI code review pass on the resulting PR (cubic, coderabbit, greptile) found several
gaps between this plan's embedded code samples and what actually shipped. Recorded here
rather than editing the historical code blocks above:

1. **Analytics funnel was missing.** Task 5's `PromoteEventClient` code sample above
   fires no `sendGoogleEvent` calls at all, contradicting this doc's own Self-Review
   Notes ("analytics woven into Tasks 5 and 8") and the design doc's "Analytics (new)"
   section, which specifies `promote_page_view`, `promote_checkout_click`,
   `promote_checkout_redirect` (renamed from `promote_checkout_success` — no payment has
   happened yet at redirect time), and `promote_checkout_error`. Fixed in the shipped
   `PromoteEventClient.tsx`: all four now fire at the appropriate points in
   `handleConfirm` and a mount-time `useEffect`.
2. **Unguarded `getEventPromotionOptions()` destructure.** The `const [promotionOption] =
   getEventPromotionOptions();` line above throws if that function ever returns an empty
   array, and only ever reads index 0 regardless of how many options exist — worth
   flagging since the whole reason for returning a list (not a constant) was to support
   more than one tier later. The shipped component guards the empty case (renders a
   disabled button + error state) rather than crashing; the "read only index 0" behavior
   is accepted for now since real multi-tier UI is still backend-blocked (see the design
   doc's "Risks" section) — the guard is the one change needed to make that acceptable.
3. **`isSubmitting` reset only on the two explicit failure branches.** If
   `createPromotionCheckoutAction` rejects outright (rather than returning `{ success:
   false }`), the code sample above never resets `isSubmitting`, permanently disabling
   the button. Shipped version wraps the body in `try/finally`.
4. **Modal architecture superseded.** Task 8 below still describes splicing the modal
   into `publica/page.tsx`. See the design doc's "Post-review architecture correction"
   addendum for the full, current description — the modal now lives on the event detail
   page, gated on ownership (a related review finding: the original `?promote=1` marker
   had no ownership check, so any visitor could trigger the upsell by hand-editing the
   URL).
5. **Mobile visibility gap (Greptile).** `EventPromoteAction` (Task 7) is rendered only
   in `EventSidebar`, which is desktop-only (`lg:block`). An owner on a phone or tablet
   had no persistent way to reach `/promote` outside the one-time post-publish modal.
   Fixed by also rendering `EventPromoteAction` in `EventDetailsSection` (the existing
   mobile-visible counterpart to the sidebar).
