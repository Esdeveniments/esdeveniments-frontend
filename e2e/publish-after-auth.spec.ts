import { test, expect } from "@playwright/test";
import { MOCK_USER } from "./helpers/auth";
import { dismissEngagementPopups } from "./helpers/login";
import { prepareTestEvent } from "./helpers/publish";
import { readSavedDraft } from "./helpers/publish-draft";

for (const scenario of ["login", "register-profile", "network-failure", "restore-step-two", "restore-step-three", "cancelled-login"]) {
  test(`continues ${scenario} with the saved step and the original poster`, async ({ page }, testInfo) => {
    let signedIn = false;
    let complete = scenario !== "register-profile";
    let creates = 0;
    let original: Awaited<ReturnType<typeof readSavedDraft>>;
    const cancelled = scenario === "cancelled-login";
    const restoring = scenario.startsWith("restore") || cancelled;
    await dismissEngagementPopups(page);
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: signedIn ? 200 : 401,
      json: { user: signedIn ? { ...MOCK_USER, profileCompleted: complete } : null },
    }));
    await page.route("**/api/regions/options", (route) => route.fulfill({ json: [
      { id: 1, name: "Barcelonès", slug: "barcelones", cities: [
        { id: 2, value: "barcelona", label: "Barcelona", latitude: 41.38, longitude: 2.17 },
      ] },
    ] }));
    await page.route("**/api/categories", (route) => route.fulfill({ json: [{ id: 3, name: "Music", slug: "musica" }] }));
    await page.route("**/api/auth/sign-in?*", (route) => {
      signedIn = !cancelled;
      return route.fulfill({ status: 302, headers: { location: cancelled
        ? "/en/publica?auth_error=fixture_cancelled" : "/en/publica?resume=1&auth_success=1" } });
    });
    await page.route("**/api/users/me/profile", (route) => {
      complete = true;
      return route.fulfill({ json: {} });
    });
    await page.route("**/en/publica**", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      creates++;
      expect(await readSavedDraft(page, MOCK_USER.id)).toEqual(original);
      expect(await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"))).toBeNull();
      const request = route.request();
      const parts = await new Response(new Uint8Array(request.postDataBuffer()!), {
        headers: { "content-type": request.headers()["content-type"]! },
      }).formData();
      const poster = [...parts.values()].find((part) => typeof part !== "string" && part.name === original.image.name);
      if (!poster || typeof poster === "string") throw new Error("Missing recovered poster in the publication request");
      expect(poster.type).toBe(original.image.type);
      expect(Array.from(new Uint8Array(await poster.arrayBuffer()))).toEqual(original.image.bytes);
      expect(request.postData()).toContain("Publish after authentication");
      if (scenario === "network-failure") return route.abort();
      return route.fulfill({ contentType: "text/x-component",
        body: '0:{"a":{"success":true,"event":{"slug":"auto-publish-fixture"}},"f":[]}\n' });
    });
    await prepareTestEvent(page, "Publish after authentication");
    if (scenario === "restore-step-two") await page.getByTestId("prev-button").click();
    await expect(page.getByTestId("draft-save-status")).toHaveText("Saved on this device");
    original = await readSavedDraft(page);
    expect(original.step).toBe(scenario === "restore-step-two" ? 1 : 2);
    await page.screenshot({ path: testInfo.outputPath("before-auth.png") });
    if (restoring) {
      await Promise.all([
        page.waitForURL(/resume=1|auth_error=/, { waitUntil: "commit" }),
        page.getByTestId(cancelled ? "publish-button" : "publish-early-sign-in").click(),
      ]);
      if (cancelled) await page.getByRole("button", { name: "Restore draft", exact: true }).click();
      const stepControl = scenario === "restore-step-two" ? page.locator("#location") : page.getByTestId("publish-button");
      await expect(stepControl).toBeVisible();
      expect(await readSavedDraft(page, cancelled ? undefined : MOCK_USER.id)).toEqual(original);
      await expect(page.getByTestId("preview-modal")).not.toBeVisible();
      expect(creates).toBe(0);
      await page.reload();
      await page.getByRole("button", { name: "Restore draft", exact: true }).click();
      await expect(stepControl).toBeVisible();
      expect(await readSavedDraft(page, cancelled ? undefined : MOCK_USER.id)).toEqual(original);
      expect(creates).toBe(0);
    } else {
      await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
      await page.getByTestId("publish-button").click();
      if (scenario === "register-profile") {
        await expect(page).toHaveURL(/\/en\/perfil\/edita/);
        expect(creates).toBe(0);
        expect(await readSavedDraft(page, MOCK_USER.id)).toEqual(original);
        await page.locator("#displayName").fill("Test User");
        await page.getByRole("button", { name: "Save changes", exact: true }).click();
      }
      if (scenario === "network-failure") {
        await expect(page.getByTestId("publish-draft-panel")).toBeVisible();
        await expect.poll(() => creates).toBe(1);
        await expect(page.getByTestId("publish-button")).toBeEnabled();
        expect(await readSavedDraft(page, MOCK_USER.id)).toEqual(original);
        await page.reload();
        await page.getByRole("button", { name: "Restore draft", exact: true }).click();
        await expect(page.getByTestId("publish-button")).toBeVisible();
        expect(creates).toBe(1);
      } else {
        await expect(page).toHaveURL(/\/en\/e\/auto-publish-fixture/);
        expect(creates).toBe(1);
        await page.goto("/en/publica");
        await expect(page.locator("#title")).toHaveValue("");
        expect(creates).toBe(1);
      }
    }
    await page.screenshot({ path: testInfo.outputPath("after-return.png") });
  });
}
