import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { test, expect, type Page } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import {
  advanceToLastStep,
  cleanupEvent,
  expandDatePicker,
  fetchStoredEvent,
  openEditForm,
  publishTestEvent,
  submitLastStep,
  type StoredEvent,
} from "./helpers/publish";

/**
 * Staging integration E2E: editing and image handling against the real
 * backend, in the New York timezone (the farthest from the data's Catalan
 * wall-clock times, so any silent date or time shift shows up).
 *
 * Requires E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD and NEXT_PUBLIC_API_URL /
 * BACKEND_SERVICE_SECRET. Skips without them.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const configured = Boolean(
  email && password && process.env.NEXT_PUBLIC_API_URL && process.env.BACKEND_SERVICE_SECRET,
);

const ICON_512 = path.join(process.cwd(), "public/static/icons/icon-512x512.png");
// A plain day a month out, in UTC so the runner's timezone does not matter.
const DAY = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const [YEAR, MONTH, DATE] = DAY.split("-");
// The en-US picker shows MM/DD/YYYY.
const SHOWN_DAY = `${MONTH}/${DATE}/${YEAR}`;
const schedule = (e: StoredEvent) => ({
  startDate: e.startDate,
  startTime: e.startTime,
  endDate: e.endDate,
  endTime: e.endTime,
});

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

test.describe("Event edit and images (staging, America/New_York)", () => {
  test.skip(!configured, "Skipped: staging credentials or backend key not set");
  test.use({ timezoneId: "America/New_York", locale: "en-US" });
  test.setTimeout(300_000);

  let slug: string | null = null;
  const newTitle = (kind: string) => `Edit Flow ${kind} e2e-${Date.now()}`;

  async function signedInPage(page: Page) {
    await loginViaUI(page, email!, password!);
  }

  test.afterEach(async ({ page }) => {
    if (slug) await cleanupEvent(page, slug);
    slug = null;
  });

  test("an all-day event round-trips through the edit form unchanged", async ({ page }) => {
    await signedInPage(page);
    slug = await publishTestEvent(page, newTitle("allday"), {
      when: { date: DAY, allDay: true },
    });
    // The backend has no all-day flag: it stores the day as 09:00-23:59.
    const before = await fetchStoredEvent(slug);
    expect(before.startDate).toBe(DAY);
    expect(before.endDate).toBe(DAY);
    expect(before.endTime?.slice(0, 5)).toBe("23:59");

    await openEditForm(page, slug);
    await advanceToLastStep(page);
    await expandDatePicker(page);
    await expect(page.getByRole("button", { name: /^Start \*:/ })).toContainText(`${SHOWN_DAY} 09:00`);
    await expect(page.getByRole("button", { name: /^End \*:/ })).toContainText(`${SHOWN_DAY} 23:59`);
    await submitLastStep(page);

    const after = await fetchStoredEvent(slug);
    expect(schedule(after)).toEqual(schedule(before));
  });

  test("a timed event prefills the stored times and edits do not drift", async ({ page }) => {
    await signedInPage(page);
    slug = await publishTestEvent(page, newTitle("timed"), {
      when: { date: DAY, startTime: "21:00", endTime: "23:30" },
    });
    const before = await fetchStoredEvent(slug);
    expect(before.startTime?.slice(0, 5)).toBe("21:00");

    await openEditForm(page, slug);
    await advanceToLastStep(page);
    await expandDatePicker(page);
    await expect(page.getByRole("button", { name: /^Start \*:/ })).toContainText(`${SHOWN_DAY} 21:00`);
    await expect(page.getByRole("button", { name: /^End \*:/ })).toContainText(`${SHOWN_DAY} 23:30`);
    await submitLastStep(page);
    const unchanged = await fetchStoredEvent(slug);
    expect(schedule(unchanged)).toEqual(schedule(before));

    await openEditForm(page, slug);
    await advanceToLastStep(page);
    await expandDatePicker(page);
    await page.getByRole("button", { name: /^End \*:/ }).click();
    await page.locator('input[type="time"]').fill("23:45");
    await submitLastStep(page);
    const edited = await fetchStoredEvent(slug);
    expect(edited.startTime?.slice(0, 5)).toBe("21:00");
    expect(edited.endTime?.slice(0, 5)).toBe("23:45");
    expect(edited.startDate).toBe(DAY);
  });

  test("the cover can be replaced and then removed", async ({ page }) => {
    await signedInPage(page);
    slug = await publishTestEvent(page, newTitle("cover"), {
      when: { date: DAY },
    });
    const first = await fetchStoredEvent(slug);
    expect(first.imageUrl).toBeTruthy();

    await openEditForm(page, slug);
    await advanceToLastStep(page);
    await page.setInputFiles('input[type="file"][accept*="image"]', ICON_512);
    await expect(page.getByRole("img", { name: "Image" })).toHaveAttribute("src", /^data:/, {
      timeout: 15_000,
    });
    await submitLastStep(page);
    const replaced = await fetchStoredEvent(slug);
    expect(replaced.imageUrl).toBeTruthy();
    expect(replaced.imageUrl).not.toBe(first.imageUrl);

    await openEditForm(page, slug);
    await advanceToLastStep(page);
    await page.getByRole("button", { name: /remove/i }).click();
    await submitLastStep(page);
    const removed = await fetchStoredEvent(slug);
    expect(removed.imageUrl).toBeFalsy();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Edit Flow cover");
  });

  test("an oversized image is compressed before upload", async ({ page }) => {
    const dir = test.info().outputPath("images");
    mkdirSync(dir, { recursive: true });
    const big = path.join(dir, "big-noise.jpg");
    const size = 2600;
    await sharp(randomBytes(size * size * 3), { raw: { width: size, height: size, channels: 3 } })
      .jpeg({ quality: 95 })
      .toFile(big);
    const originalBytes = statSync(big).size;
    expect(originalBytes, "fixture is over the 2 MB target").toBeGreaterThan(2 * 1024 * 1024);

    await signedInPage(page);
    slug = await publishTestEvent(page, newTitle("big"), {
      when: { date: DAY },
      imagePath: big,
    });
    const stored = await fetchStoredEvent(slug);
    expect(stored.imageUrl).toBeTruthy();
    const image = await fetch(stored.imageUrl!);
    expect(image.status).toBe(200);
    const bytes = (await image.arrayBuffer()).byteLength;
    console.log(`COMPRESS original=${originalBytes} stored=${bytes}`);
    expect(bytes).toBeLessThan(originalBytes);
    expect(bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  test("a publish that fails on the network can be retried", async ({ page }) => {
    await signedInPage(page);
    let aborted = 0;
    let sawError = false;
    slug = await publishTestEvent(page, newTitle("retry"), {
      when: { date: DAY },
      beforePublish: async (p) => {
        await p.route("**/publica", async (route) => {
          const request = route.request();
          if (request.method() !== "POST" || !request.headers()["next-action"] || aborted > 0) {
            return route.continue();
          }
          aborted += 1;
          await route.abort("connectionreset");
          // The form must say it failed and still be usable.
          await expect(p.locator('[role="alert"]:not(:empty)')).toBeVisible({ timeout: 20_000 });
          sawError = true;
          await expect(p.getByTestId("publish-button")).toBeEnabled();
          await p.getByTestId("publish-button").click();
        });
      },
    });
    expect(aborted, "first submit was cut").toBe(1);
    expect(sawError, "the failure was shown to the user").toBe(true);
    const stored = await fetchStoredEvent(slug);
    expect(stored.startDate).toBe(DAY);
  });
});
