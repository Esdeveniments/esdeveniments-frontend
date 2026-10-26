import { test, expect } from "@playwright/test";
import { completeHostedLogin, dismissEngagementPopups } from "./helpers/login";
import { advanceToLastStep, cleanupEvent, publishTestEvent } from "./helpers/publish";
import { readSavedDraft } from "./helpers/publish-draft";

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;

test.use({ trace: "off", serviceWorkers: "allow" });

test("guest poster survives real sign-in with the normal service worker before explicit publication", async ({ page }, testInfo) => {
  test.skip(!email || !password, "Requires the dedicated preproduction test account");
  test.setTimeout(240_000);
  expect(new URL(process.env.NEXT_PUBLIC_API_URL ?? "").hostname).toBe("api-preproduction.esdeveniments.cat");
  await dismissEngagementPopups(page);
  let creates = 0;
  let slug: string | null = null;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/en/publica") creates++;
  });
  try {
    slug = await publishTestEvent(page, `Guest draft e2e-${Date.now()}`, {
      beforePublish: async () => {
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state), {
          timeout: 30_000,
        }).toBe("activated");
        await expect(page.getByTestId("draft-save-status")).toHaveText("Saved on this device");
        const original = await readSavedDraft(page);
        const appOrigin = new URL(page.url()).origin;
        await page.getByTestId("preview-button").click();
        await expect(page.getByTestId("preview-modal")).toBeVisible();
        expect(creates).toBe(0);
        await page.getByTestId("preview-modal-action-button").click();
        await completeHostedLogin(page, email!, password!, appOrigin);
        const preview = page.getByTestId("preview-modal");
        await expect(preview).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveURL((url) => url.pathname === "/en/publica");
        const accountId = await page.evaluate(async () => {
          const response = await fetch("/api/auth/me");
          if (!response.ok) throw new Error(`Session lookup failed: ${response.status}`);
          return (await response.json()).user.id as string;
        });
        expect(await readSavedDraft(page, accountId)).toEqual(original);
        expect(creates).toBe(0);
        const image = preview.locator('img[src^="data:image/"]:visible').first();
        await expect(image).toBeVisible();
        expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        await expect(page.getByTestId("preview-modal-action-button")).toHaveText("Publish");
        await page.screenshot({ path: testInfo.outputPath("real-guest-login-recovered.png") });
        await preview.getByLabel("Tanca").click();
        await advanceToLastStep(page);
      },
    });
    expect(creates).toBe(1);
    await testInfo.attach("real-guest-return-proof", {
      contentType: "application/json",
      body: JSON.stringify({
        hostedLogin: "real", backend: "preproduction", serviceWorker: "activated",
        exactDraftAndImage: true, createsOnReturn: 0, createsAfterExplicitClick: creates,
        browser: testInfo.project.name,
      }),
    });
  } finally {
    if (slug) await cleanupEvent(page, slug);
  }
});
