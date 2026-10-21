import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { cleanupEvent, fetchStoredEvent, publishTestEvent } from "./helpers/publish";

/**
 * Staging integration E2E: the time a user types is the time that is
 * previewed, stored and shown, whatever the browser's timezone, including
 * across daylight-saving changes.
 *
 * Real login, real publish, then the stored event is read straight from the
 * backend. Requires E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD and
 * NEXT_PUBLIC_API_URL / BACKEND_SERVICE_SECRET. Skips without them.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const serviceKey = process.env.BACKEND_SERVICE_SECRET;

const DAY_MS = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The nth Sunday of a month (0-based, UTC), or the last one when nth is -1. */
function sundayOf(year: number, month: number, nth: number): number {
  if (nth === -1) {
    const last = Date.UTC(year, month + 1, 0);
    return last - new Date(last).getUTCDay() * DAY_MS;
  }
  const first = Date.UTC(year, month, 1);
  return first + (((7 - new Date(first).getUTCDay()) % 7) + (nth - 1) * 7) * DAY_MS;
}

/** The next such Sunday at least two days out, so the picker still offers it. */
function nextSunday(month: number, nth: number): string {
  const soon = Date.now() + 2 * DAY_MS;
  const year = new Date().getUTCFullYear();
  const day = sundayOf(year, month, nth);
  return isoDay(day >= soon ? day : sundayOf(year + 1, month, nth));
}

// EU clocks change on the last Sunday of March and October, US clocks on the
// second Sunday of March and the first Sunday of November.
const EU_SPRING = nextSunday(2, -1);
const EU_FALL = nextSunday(9, -1);
const US_SPRING = nextSunday(2, 2);
const US_FALL = nextSunday(10, 1);
const EVENING = isoDay(Date.now() + 30 * DAY_MS);

const CASES = [
  { tz: "Europe/Madrid", name: "spring forward", date: EU_SPRING, start: "01:30", end: "03:30" },
  { tz: "Europe/Madrid", name: "fall back", date: EU_FALL, start: "01:30", end: "03:30" },
  { tz: "Europe/Madrid", name: "evening", date: EVENING, start: "21:00", end: "23:30" },
  { tz: "UTC", name: "evening", date: EVENING, start: "21:00", end: "23:30" },
  { tz: "UTC", name: "Madrid fall-back day", date: EU_FALL, start: "01:30", end: "03:30" },
  { tz: "America/New_York", name: "spring forward", date: US_SPRING, start: "01:30", end: "03:30" },
  { tz: "America/New_York", name: "fall back", date: US_FALL, start: "00:30", end: "02:30" },
  { tz: "America/New_York", name: "evening", date: EVENING, start: "21:00", end: "23:30" },
] as const;

const offsetAround = (tz: string, day: string, shiftDays: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(Date.parse(`${day}T12:00:00Z`) + shiftDays * DAY_MS)
    .find((part) => part.type === "timeZoneName")?.value;

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

test("the computed days are real clock changes", () => {
  for (const [tz, day] of [
    ["Europe/Madrid", EU_SPRING],
    ["Europe/Madrid", EU_FALL],
    ["America/New_York", US_SPRING],
    ["America/New_York", US_FALL],
  ] as const) {
    expect(offsetAround(tz, day, -1), `${tz} changes clocks on ${day}`).not.toBe(
      offsetAround(tz, day, 1),
    );
  }
});

test.describe("Event times across timezones (staging)", () => {
  test.skip(
    !email || !password || !apiUrl || !serviceKey,
    "Skipped: staging credentials or backend key not set",
  );
  test.setTimeout(240_000);

  for (const c of CASES) {
    test(`${c.tz}: ${c.name} ${c.date} ${c.start}-${c.end}`, async ({ browser }) => {
      const context = await browser.newContext({ timezoneId: c.tz, locale: "en-US" });
      const page = await context.newPage();
      let slug: string | null = null;
      try {
        await loginViaUI(page, email!, password!);
        expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(c.tz);

        slug = await publishTestEvent(page, `Time Test e2e-${Date.now()}`, {
          when: { date: c.date, startTime: c.start, endTime: c.end },
          beforePublish: async (p) => {
            await p.getByTestId("preview-button").click();
            const modal = p.getByTestId("preview-modal");
            await expect(modal).toBeVisible({ timeout: 20_000 });
            await expect(modal).toContainText(/Time Test e2e-\d+/, { timeout: 30_000 });
            await p.screenshot({ path: `test-results/time-preview-${c.tz.replace("/", "-")}-${c.name.replace(/\W+/g, "-")}.png` });
            const text = (await modal.innerText()).replace(/\s+/g, " ");
            console.log(`PREVIEW[${c.tz} ${c.name}]: ${text.slice(0, 500)}`);
            const day = new Date(`${c.date}T12:00:00Z`).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
            });
            expect(text, "preview shows the typed date").toContain(day);
            expect(text, "preview shows the typed start time").toContain(c.start);
            expect(text, "preview shows the typed end time").toContain(c.end);
            await p.keyboard.press("Escape");
            await expect(modal).toBeHidden({ timeout: 10_000 });
          },
        });

        const stored = await fetchStoredEvent(slug);
        console.log(`STORED[${c.tz} ${c.name}]: ${JSON.stringify(stored)}`);
        expect(stored.startDate).toBe(c.date);
        expect(stored.endDate).toBe(c.date);
        expect(stored.startTime?.slice(0, 5)).toBe(c.start);
        expect(stored.endTime?.slice(0, 5)).toBe(c.end);
      } finally {
        if (slug) await cleanupEvent(page, slug);
        await context.close();
      }
    });
  }
});
