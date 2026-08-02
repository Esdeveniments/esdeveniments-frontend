import { test, expect, type Page } from "@playwright/test";
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

// Store created event slug for cleanup
let createdEventSlug: string | null = null;

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

test.describe("Publish integration (staging)", () => {
  // Skip entire suite if no staging credentials
  test.skip(!hasCredentials, "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set");
  test.setTimeout(180_000); // 3 minutes — real backend is slow

  test.afterAll(async ({ browser }) => {
    // Best-effort cleanup via API if we captured the slug
    if (createdEventSlug) {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await loginViaUI(page, email!, password!);
        await cleanupEvent(page, createdEventSlug);
      } catch (error) {
        console.warn("Cleanup failed:", error);
      } finally {
        await context.close();
      }
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

    // ── Step 1: Navigate to publish page ──
    await page.goto("/en/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });

    // ── Step 2: Fill form — Step 0 (basics) ──
    await page.locator("#title").fill(TEST_EVENT_TITLE);
    await page.locator("#description").fill(
      `Automated E2E test event created at ${new Date().toISOString()}. Safe to delete.`
    );
    await page.locator("#url").fill("https://example.com/e2e-test");

    // Advance to step 1
    await page.getByTestId("next-button").click();

    // ── Step 3: Fill form — Step 1 (location) ──
    // Wait for cities to load, then select first available town
    const townSelect = page.getByTestId("town-select");
    await expect(townSelect).toBeVisible({ timeout: 15_000 });

    // Click the select to open dropdown, type to search, pick first result
    await townSelect.click();
    await page.keyboard.type("Barcelona");
    await page.waitForTimeout(1_000); // Wait for async search
    // Select the first option from the dropdown
    await page.keyboard.press("Enter");

    // Fill location name
    await page.locator("#location").fill("Test Venue - E2E");

    // Select first available category
    const categoriesSelect = page.locator("#categories").locator("..");
    await categoriesSelect.click();
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // Close the dropdown
    await page.keyboard.press("Escape");

    // Advance to step 2
    await page.getByTestId("next-button").click();

    // ── Step 4: Fill form — Step 2 (image & dates) ──
    // Use URL mode for image (simpler for E2E)
    const imageUrlTab = page.getByRole("button", { name: /url|enllaç/i });
    if (await imageUrlTab.isVisible()) {
      await imageUrlTab.click();
    }

    // Fill image URL (use a known stable placeholder)
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
    const datePickerTrigger = page.getByRole("button", {
      name: /select date and time|seleccionar data i hora/i,
    });
    await expect(datePickerTrigger).toBeVisible({ timeout: 15_000 });
    await datePickerTrigger.click();
    const startDateButton = page.getByRole("button", {
      name: /^(Start|Inici) \*:/,
    });
    await expect(startDateButton).toBeVisible({ timeout: 15_000 });
    await startDateButton.click();
    const futureDateButton = page.locator(`[data-day="${futureDateIso}"]`);
    await expect(futureDateButton).toBeVisible({ timeout: 15_000 });
    await futureDateButton.click();

    // ── Step 5: Submit ──
    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeVisible({ timeout: 10_000 });

    // Wait for canPublishRef to arm (250ms guard in EventForm)
    await page.waitForTimeout(500);

    await publishButton.click();

    // ── Step 6: Wait for success ──
    // After publish, the page should redirect to the event detail or show success
    // Wait for navigation away from /publica
    await page.waitForURL((url) => !url.pathname.includes("/publica"), {
      timeout: 60_000,
    });

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
    const eventOwner = await page.evaluate(async (slug: string) => {
      const res = await fetch(`/api/events/${slug}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.owner ?? null;
    }, createdEventSlug);
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

    // Rendered twice, same as the location block above — once inline for
    // mobile, once in the desktop sidebar — so filter to the visible
    // instance instead of assuming DOM order.
    const creatorBlock = page
      .locator('[data-testid="event-created-by"]:visible')
      .first();
    await expect(creatorBlock).toBeVisible({ timeout: 10_000 });
    await expect(creatorBlock).toContainText(expectedCreatorName);
    const creatorLinkHref = await page
      .locator('[data-testid="event-created-by-link"]:visible')
      .first()
      .getAttribute("href");
    expect(creatorLinkHref).toContain(
      `/perfil/${encodeURIComponent(expectedCreatorSlug)}`
    );

    // ── Step 8: Verify the event appears on a listing page ──
    await page.goto("/en/barcelona", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Soft: listing may be cached or paginate the fresh event off page 1.
    await expect
      .soft(
        page.getByText(TEST_EVENT_TITLE).first(),
        "freshly published event should appear in the Barcelona listing"
      )
      .toBeVisible({ timeout: 15_000 });
  });
});
