import { test, expect, type Page } from "@playwright/test";

async function getFirstEventSlug(page: Page): Promise<string | undefined> {
  // Use internal API so HMAC is handled server-side
  const res = await page.request.get(`/api/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  const slug = data?.content?.[0]?.slug;
  return slug ?? undefined;
}

test.describe("Add to calendar menu", () => {
  test("opens menu and shows calendar links", async ({ page }) => {
    const slug = await getFirstEventSlug(page);
    if (!slug) test.skip(true, "No events returned from API");
    await page.goto(`/e/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Auto-waiting assertion - no need for manual waits
    const button = page.getByRole("button", { name: /Afegir al calendari/i });
    await expect(button).toBeVisible({ timeout: 30000 });
    await button.click();

    await expect(
      page.getByRole("button", { name: "Google Calendar" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Outlook" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Altres" })).toBeVisible({ timeout: 10000 });
  });
});
