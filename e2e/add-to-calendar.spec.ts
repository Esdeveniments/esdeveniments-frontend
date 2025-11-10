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
    await page.goto(`/e/${slug}`, { waitUntil: "load", timeout: 60000 });

    const button = page.getByRole("button", { name: /Afegir al calendari/i });
    await button.click();

    await expect(
      page.getByRole("button", { name: "Google Calendar" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Outlook" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Altres" })).toBeVisible();
  });
});
