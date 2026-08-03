import { test, expect, type Page } from "@playwright/test";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";
import { loginViaUI } from "./helpers/login";

/**
 * Staging integration E2E: Publish → Detail → Cleanup
 *
 * This test runs against a real staging/preproduction backend. It requires:
 *   - E2E_STAGING_EMAIL: Test user email
 *   - E2E_STAGING_PASSWORD: Test user password
 *   - PLAYWRIGHT_TEST_BASE_URL: Staging URL (e.g., https://pre.esdeveniments.cat)
 *
 * Run locally (against dev server):
 *   E2E_STAGING_EMAIL=<email> E2E_STAGING_PASSWORD=<pass> \
 *   npx playwright test e2e/publish-integration.spec.ts --config playwright.config.ts
 *
 * Run against a deployed staging URL:
 *   PLAYWRIGHT_TEST_BASE_URL=<url> E2E_STAGING_EMAIL=<email> E2E_STAGING_PASSWORD=<pass> \
 *   npx playwright test e2e/publish-integration.spec.ts --config playwright.remote.config.ts
 *
 * Gated: Skips automatically if env vars are not set.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const hasCredentials = Boolean(email && password);

const UNIQUE_SUFFIX = `e2e-${Date.now()}`;
const TEST_EVENT_TITLE = `Test Event ${UNIQUE_SUFFIX}`;

// Store created event identity for cleanup
let createdEventSlug: string | null = null;
let createdEventId: string | null = null;

/** Delete event via API (direct fetch with cookies from browser context) */
async function cleanupEvent(page: Page, uuid: string) {
  try {
    const response = await page.evaluate(async (eventUuid: string) => {
      const res = await fetch(`/api/events/${eventUuid}`, {
        method: "DELETE",
      });
      return { status: res.status, ok: res.ok };
    }, uuid);
    console.log(`Cleanup event ${uuid}: ${response.status}`);
  } catch (error) {
    console.warn(`Failed to clean up event ${uuid}:`, error);
  }
}

async function findCreatedEventId(
  page: Page,
  title: string,
): Promise<string | null> {
  try {
    const query = new URLSearchParams({
      page: "0",
      size: "50",
      term: title,
      _e2e_cleanup: String(Date.now()),
    });
    const response = await page.request.get(`/api/events?${query.toString()}`);
    if (!response.ok()) return null;
    const data = (await response.json()) as PagedResponseDTO<EventSummaryResponseDTO>;
    return data.content.find((event) => event.title === title)?.id ?? null;
  } catch (error) {
    console.warn(`Failed to find event for cleanup (${title}):`, error);
    return null;
  }
}

async function listingContainsEvent(
  page: Page,
  eventSlug: string,
  title: string,
  attempt: number,
): Promise<boolean> {
  const query = new URLSearchParams({
    page: "0",
    size: "50",
    place: "barcelona",
    term: title,
    // The events proxy is intentionally cached for normal users. A unique
    // query key per poll prevents a failed first read from pinning the test to
    // a stale CDN response while the backend finishes indexing the event.
    _e2e: `${Date.now()}-${attempt}`,
  });
  const response = await page.request.get(`/api/events?${query.toString()}`);
  if (!response.ok()) return false;

  const data = (await response.json()) as PagedResponseDTO<EventSummaryResponseDTO>;
  return data.content.some((event) => event.slug === eventSlug);
}

/**
 * Fills and advances the publish wizard through all three steps (basics,
 * location, image/dates), leaving the caller on step 3 ready to interact
 * with the publish button. Shared by every test in this file that needs to
 * get an event through the form — each test still owns its own submit and
 * post-submit assertions, since those differ (keep it free vs. promote).
 */
async function fillPublishForm(
  page: Page,
  data: { title: string; description: string; url: string; location: string },
): Promise<void> {
  await page.goto("/en/publica", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const form = page.getByTestId("event-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(form).toHaveAttribute("data-hydrated", "true", {
    timeout: 30_000,
  });

  // ── Step 0 (basics) ──
  await page.locator("#title").fill(data.title);
  await page.locator("#description").fill(data.description);
  await page.locator("#url").fill(data.url);
  await page.getByTestId("next-button").click();

  // ── Step 1 (location) ──
  const townSelect = page.getByTestId("town-select");
  await expect(townSelect).toBeVisible({ timeout: 15_000 });
  await townSelect.click();
  await page.keyboard.type("Barcelona");
  // Wait for the async result the user can actually select; do not sleep for
  // an assumed network duration.
  const townOption = page
    .locator('[role="listbox"]:visible')
    .getByRole("option")
    .first();
  await expect(townOption).toBeVisible({ timeout: 15_000 });
  await townOption.click();

  await page.locator("#location").fill(data.location);

  const categoriesSelect = page.locator("#categories").locator("..");
  await categoriesSelect.click();
  const categoryOption = page
    .locator('[role="listbox"]:visible')
    .getByRole("option")
    .first();
  await expect(categoryOption).toBeVisible({ timeout: 15_000 });
  await categoryOption.click();
  await page.getByTestId("next-button").click();

  // ── Step 2 (image & dates) ──
  const imageUrlTab = page.getByRole("button", { name: /url|enllaç/i });
  if (await imageUrlTab.isVisible()) {
    await imageUrlTab.click();
  }
  const imageUrlInput = page.locator('input[placeholder*="http"]').first();
  if (await imageUrlInput.isVisible()) {
    await imageUrlInput.fill("https://picsum.photos/800/600");
  }

  // The date picker renders buttons rather than #event-date-* inputs. Its
  // defaults are today at 09:00, which can already be past when CI runs in
  // the afternoon; active listing endpoints correctly omit such events.
  // Move the start to a deterministic future date so the published event is
  // eligible for the active Barcelona listing. The picker keeps the default
  // one-hour duration when the start day changes.
  const futureDateIso = await page.evaluate(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    return [
      futureDate.getFullYear(),
      String(futureDate.getMonth() + 1).padStart(2, "0"),
      String(futureDate.getDate()).padStart(2, "0"),
    ].join("-");
  });
  // The DatePicker is lazy-loaded. Its placeholder intentionally replaces
  // itself on focus, so pointer/keyboard activation can race the React
  // remount (detached element / html intercepts pointer events). Focus is
  // the wrapper's explicit lazy-load contract; wait for the real Start
  // button after that replacement before interacting with the calendar.
  const datePickerPlaceholder = page.getByRole("button", {
    name: /select date and time|seleccionar data i hora/i,
  });
  const startDateButton = page.getByRole("button", {
    name: /^(Start|Inici):/,
  });
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
}

test.describe("Publish integration (staging)", () => {
  // Skip entire suite if no staging credentials
  test.skip(!hasCredentials, "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set");
  test.setTimeout(180_000); // 3 minutes — real backend is slow

  test.afterAll(async ({ browser }) => {
    if (!hasCredentials) return;

    // Always attempt cleanup after login. If redirect parsing failed after a
    // successful publish, recover the unique event ID through the API first.
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await loginViaUI(page, email!, password!);      let fallbackEventId: string | null = null;
      if (!createdEventId) {
        await expect
          .poll(
            async () => {
              fallbackEventId = await findCreatedEventId(page, TEST_EVENT_TITLE);
              return fallbackEventId;
            },
            { timeout: 30_000, intervals: [500, 1_000, 2_000, 5_000] },
          )
          .not.toBeNull();
      }
      const eventId = createdEventId ?? fallbackEventId;
      if (eventId) await cleanupEvent(page, eventId);
    } catch (error) {
      console.warn("Cleanup failed:", error);
    } finally {
      await context.close();
    }
  });

  test("login → publish event → verify detail page shows creator", async ({
    page,
  }) => {
    // Log all API responses for debugging
    page.on("response", async (response) => {
      if (response.url().includes("/api/")) {
        const body = await response.text().catch(() => "<no body>");
        console.log(`[API] ${response.status()} ${response.url().replace(/http:\/\/localhost:3000/, "")}: ${body.substring(0, 300)}`);
      }
    });

    // ── Step 0: Login ──
    await loginViaUI(page, email!, password!);

    // Verify we're logged in (avatar button visible in navbar)
    await expect(
      page.getByTestId("user-avatar-button")
    ).toBeVisible({ timeout: 15_000 });

    // Sanity check that we're logged in as *some* real account before
    // publishing — the actual expected creator name/slug is captured further
    // down from the created event's own `owner` field (see Step 7), not from
    // this session data. /api/auth/me's `name` is the enrichment-merged
    // session display name (lib/auth/enrichment.ts's three-way pick between
    // backend displayName/name and the id_token name); the event detail page
    // instead renders `owner.displayName ?? owner.username` from the event's
    // own OwnerSummaryDTO (a separate backend record for that specific
    // event). These two only agree when enrichment happens to pick the same
    // value, so asserting the rendered creator block against /api/auth/me
    // would flake whenever they diverge.
    const me = await page.evaluate(async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user ?? null;
    });
    expect(
      me?.username,
      "expected /api/auth/me to return a logged-in user with a username"
    ).toBeTruthy();

    // ── Steps 1-4: Fill and advance the publish form ──
    await fillPublishForm(page, {
      title: TEST_EVENT_TITLE,
      description: `Automated E2E test event created at ${new Date().toISOString()}. Safe to delete.`,
      url: "https://example.com/e2e-test",
      location: "Test Venue - E2E",
    });

    // ── Step 5: Submit ──
    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeVisible({ timeout: 10_000 });

    // The button's visibility/enabled state is the public readiness contract;
    // let Playwright's web-first assertion wait for it instead of sleeping for
    // the implementation's internal publish-arm timer.
    await expect(publishButton).toHaveAttribute("data-publish-ready", "true", {
      timeout: 10_000,
    });
    // Publishing now shows the post-publish promotion upsell modal instead of
    // an immediate redirect. Wait for the modal, then dismiss via "keep it
    // free" (this test's intent: verify the plain publish → detail page path
    // still works).
    await publishButton.click();
    const upsellModal = page.getByTestId("promote-upsell-modal");
    await expect(upsellModal).toBeVisible({ timeout: 30_000 });

    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/publica"), {
        timeout: 60_000,
      }),
      page.getByTestId("promote-modal-keep-free").click(),
    ]);

    // ── Step 6: Wait for success ──
    // The URL assertion above proves the publish action completed and redirected
    // away from the form.

    const currentUrl = page.url();
    console.log(`Event created, redirected to: ${currentUrl}`);

    // Publishing must land on an event detail page. Failing to extract a slug
    // means the publish didn't complete — assert rather than silently skip.
    const slugMatch = currentUrl.match(/\/e\/([^/?#]+)/);
    expect(
      slugMatch,
      `expected to land on /e/{slug}, got: ${currentUrl}`
    ).not.toBeNull();
    // Guard explicitly so TypeScript narrows the type without `!`.
    if (!slugMatch) throw new Error("unreachable: slug match guard");
    createdEventSlug = slugMatch[1];
    console.log(`Created event slug: ${createdEventSlug}`);

    // ── Step 7: Verify the event detail page ──
    await page.goto(`/en/e/${createdEventSlug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const createdEvent = await page.evaluate(async (slug: string) => {
      const res = await fetch(`/api/events/${slug}?_e2e=${Date.now()}`);
      if (!res.ok) return null;
      return res.json();
    }, createdEventSlug);
    createdEventId = createdEvent?.id ?? null;
    expect(createdEventId, "expected the created event to have an id").toBeTruthy();

    // Title (data we entered) is the H1. This also proves it's not the
    // not-found page, which would render a different heading.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TEST_EVENT_TITLE,
      { timeout: 15_000 }
    );

    // Location we entered is rendered somewhere on the page. The detail page
    // renders the location twice — once inline for mobile (`lg:hidden`) and
    // once in the sticky sidebar for desktop (`hidden lg:block`) — so both
    // exist in the DOM at once and only one is actually visible at a given
    // viewport. `.first()` picked the mobile-only instance, which is CSS-hidden
    // at this project's desktop viewport, so the assertion always failed even
    // though the value rendered correctly. Match the visible instance instead
    // of assuming DOM order; `.first()` here is just a strict-mode guard in
    // case a hydration flicker briefly makes both match — the design only
    // ever intends one to be visible at a time.
    await expect(
      page.locator('p:visible:has-text("Test Venue - E2E")').first()
    ).toBeVisible({
      timeout: 15_000,
    });

    // Creator attribution: the detail page must show "Published by <name>"
    // with the name linked to /perfil/<username>. Read the expected values
    // from the created event's own `owner` field (OwnerSummaryDTO, the same
    // data the page renders from) rather than the auth session — see the
    // note above Step 0's login check for why those two can diverge.
    const readEventOwner = async () =>
      page.evaluate(async (slug: string | null) => {
        if (!slug) return null;
        const res = await fetch(`/api/events/${slug}?_e2e=${Date.now()}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.owner ?? null;
      }, createdEventSlug);

    // Owner enrichment can lag behind the initial event write. Poll the same
    // detail API contract the page consumes instead of assuming one response
    // immediately contains the attribution data.
    await expect
      .poll(
        async () => {
          const owner = await readEventOwner();
          return Boolean(owner?.username || owner?.displayName);
        },
        { timeout: 30_000, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
    const eventOwner = await readEventOwner();
    const expectedCreatorName: string =
      eventOwner?.displayName || eventOwner?.username || "";
    const expectedCreatorSlug: string = eventOwner?.username || "";
    expect(
      expectedCreatorName,
      "expected the created event to have an owner with a displayName or username"
    ).not.toBe("");
    expect(
      expectedCreatorSlug,
      "expected the created event's owner to have a username (used for the /perfil/<username> link)"
    ).not.toBe("");

    // The page renders this semantic block twice for responsive layouts. Test
    // the attribution contract in the DOM and scope the link to the matching
    // block; CSS visibility is a layout concern and is not part of this API
    // integration test.
    const creatorBlock =    page
      .getByTestId("event-created-by")
      .filter({ hasText: expectedCreatorName })
      .first();
    await expect(creatorBlock).toBeAttached({ timeout: 10_000 });
    await expect(creatorBlock).toContainText(expectedCreatorName);
    await expect(
      creatorBlock.getByTestId("event-created-by-link").first()
    ).toHaveAttribute("href", new RegExp(`/perfil/${expectedCreatorSlug}`));

    // ── Step 8: Verify eventual listing inclusion through the API ──
    // The rendered place page and /api/events are cached independently, and a
    // newly published event can take time to reach the backend's search/index
    // path. Poll a fresh cache key until the server contract observes it. This
    // keeps the check meaningful without asserting against one stale HTML page
    // or hiding the failure with expect.soft().
    let listingAttempt = 0;
    await expect
      .poll(
        async () =>
          listingContainsEvent(
            page,
            createdEventSlug!,
            TEST_EVENT_TITLE,
            listingAttempt++,
          ),
        {
          timeout: 60_000,
          intervals: [500, 1_000, 2_000, 5_000],
        },
      )
      .toBe(true);
  });

  test("login → publish event → promote upsell links to the promote page", async ({
    page,
  }) => {
    await loginViaUI(page, email!, password!);
    await expect(page.getByTestId("user-avatar-button")).toBeVisible({
      timeout: 15_000,
    });

    const promoteTestTitle = `${TEST_EVENT_TITLE} Promote`;
    await fillPublishForm(page, {
      title: promoteTestTitle,
      description: `Automated E2E test event for promote flow, created at ${new Date().toISOString()}. Safe to delete.`,
      url: "https://example.com/e2e-test-promote",
      location: "Test Venue - E2E Promote",
    });

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
    // afterAll cleanup (which only tracks TEST_EVENT_TITLE). The DELETE route
    // resolves by slug internally — same simple pattern already used for
    // createdEventSlug in afterAll above — so no extra id lookup is needed.
    const slugMatch = page.url().match(/\/e\/([^/]+)\/promote/);
    if (slugMatch) {
      await cleanupEvent(page, slugMatch[1]);
    }
  });
});
