import { test, expect } from "@playwright/test";

async function getFirstEventSlug(): Promise<string> {
  const api =
    process.env.NEXT_PUBLIC_API_URL || "https://api-pre.esdeveniments.cat/api";
  const res = await fetch(`${api}/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  const slug = data?.content?.[0]?.slug;
  if (!slug) throw new Error("No events returned from API");
  return slug;
}

test.describe("Add to calendar menu", () => {
  test("opens menu and shows calendar links", async ({ page }) => {
    const slug = await getFirstEventSlug();
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
