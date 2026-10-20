import path from "path";
import { expect, type Page } from "@playwright/test";

export const DEFAULT_IMAGE = path.join(
  process.cwd(),
  "public",
  "static",
  "icons",
  "icon-192x192.png",
);

export type EventWhen = {
  /** Start day as YYYY-MM-DD. The end day follows the picker's default. */
  date?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
};

function isoDay(offsetDays: number): string {
  const day = new Date();
  day.setDate(day.getDate() + offsetDays);
  return [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Open the picker and set the start day (and optionally start/end times).
 *
 * The picker defaults to today at 09:00, which is already past in the
 * afternoon, and listings omit ended events. It keeps the default one-hour
 * duration when the start day changes.
 */
export async function pickEventWhen(page: Page, when: EventWhen = {}) {
  const dayIso = when.date ?? isoDay(2);
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

  const day = page.locator(`[data-day="${dayIso}"]`);
  for (let month = 0; month < 14 && !(await day.isVisible()); month++) {
    await page.getByRole("button", { name: /next month/i }).click();
  }
  await expect(day).toBeVisible({ timeout: 15_000 });
  await day.click();

  if (when.allDay) {
    // The checkbox is visually hidden; its label is the click target.
    await page.getByText(/^All day/).click();
  }

  // One time input is mounted at a time: it edits whichever field is open.
  const timeInput = page.locator('input[type="time"]');
  if (when.startTime) {
    // Re-picking the already selected day closes the popup; reopen Start.
    if (!(await timeInput.isVisible())) await startDateButton.click();
    await timeInput.fill(when.startTime, { timeout: 10_000 });
  }
  if (when.endTime) {
    await page.getByRole("button", { name: /^(End|Fi) \*:/ }).click();
    await timeInput.fill(when.endTime, { timeout: 10_000 });
  }
}

/** Move the publish form's start date to a day in the future. */
export async function pickFutureStartDate(page: Page, daysAhead = 2) {
  await pickEventWhen(page, { date: isoDay(daysAhead) });
}

/** Publish a test event through the real form; returns the slug from the redirect. */
export async function publishTestEvent(
  page: Page,
  title: string,
  options: {
    when?: EventWhen;
    imagePath?: string;
    /** Category to pick by name; defaults to the first one in the list. */
    category?: string;
    beforePublish?: (page: Page) => Promise<void>;
  } = {},
): Promise<string> {
  await page.goto("/en/publica", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const form = page.getByTestId("event-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(form).toHaveAttribute("data-hydrated", "true", {
    timeout: 30_000,
  });

  // Step 0: basics
  await page.locator("#title").fill(title);
  await page.locator("#description").fill(
    `Automated E2E test event created at ${new Date().toISOString()}. Safe to delete.`
  );
  await page.locator("#url").fill("https://example.com/e2e-test");
  await page.getByTestId("next-button").click();

  // Step 1: location
  const townSelect = page.getByTestId("town-select");
  await expect(townSelect).toBeVisible({ timeout: 15_000 });
  await townSelect.click();
  await page.keyboard.type("Barcelona");
  await page.waitForTimeout(1_000);
  await page.keyboard.press("Enter");
  await page.locator("#location").fill("Test Venue - E2E");

  const categoriesSelect = page.locator("#categories").locator("..");
  await categoriesSelect.click();
  await page.waitForTimeout(500);
  if (options.category) {
    await page.keyboard.type(options.category);
    await page.waitForTimeout(500);
  } else {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");

  await page.getByTestId("next-button").click();

  // Step 2: image & dates. The image travels as the multipart `imageFile`.
  await page.setInputFiles(
    'input[type="file"][accept*="image"]',
    options.imagePath ?? DEFAULT_IMAGE,
  );

  await pickEventWhen(page, options.when);
  await options.beforePublish?.(page);

  const publishButton = page.getByTestId("publish-button");
  await expect(publishButton).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await publishButton.click();

  await page.waitForURL((url) => !url.pathname.includes("/publica"), {
    timeout: 60_000,
  });

  const currentUrl = page.url();
  const slugMatch = currentUrl.match(/\/e\/([^/?#]+)/);
  expect(slugMatch, `expected to land on /e/{slug}, got: ${currentUrl}`).not.toBeNull();
  if (!slugMatch) throw new Error("unreachable: slug match guard");
  return slugMatch[1];
}

/** Delete an event through the app API using the page's session cookies. */
export async function cleanupEvent(page: Page, slug: string) {
  try {
    const response = await page.evaluate(async (eventSlug: string) => {
      const res = await fetch(`/api/events/${eventSlug}`, {
        method: "DELETE",
      });
      return { status: res.status, ok: res.ok };
    }, slug);
    console.log(`Cleanup event ${slug}: ${response.status}`);
  } catch (error) {
    console.warn(`Failed to clean up event ${slug}:`, error);
  }
}


/** From the first step of the edit form, move to the last step. */
export async function advanceToLastStep(page: Page) {
  await page.getByTestId("next-button").click();
  await expect(page.getByTestId("town-select")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("next-button").click();
  await expect(page.getByTestId("publish-button")).toBeVisible({ timeout: 15_000 });
}

/** Submit the last step of the edit form; returns once back on the detail page. */
export async function submitLastStep(page: Page) {
  const submit = page.getByTestId("publish-button");
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await submit.click();
  await page.waitForURL(
    (url) => url.pathname.includes("/e/") && !url.pathname.includes("/edita"),
    { timeout: 60_000 },
  );
}

/** Open the edit form for an event and wait until it is interactive. */
export async function openEditForm(page: Page, slug: string) {
  await page.goto(`/en/e/${slug}/edita`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const form = page.getByTestId("event-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
}

/** Edit forms render the picker collapsed; expand it so Start/End are reachable. */
export async function expandDatePicker(page: Page) {
  await page.getByRole("button", { name: /select date and time/i }).click();
  await expect(page.getByRole("button", { name: /^Start \*:/ })).toBeVisible({
    timeout: 15_000,
  });
}
