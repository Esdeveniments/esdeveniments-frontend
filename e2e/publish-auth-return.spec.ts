import { test, expect } from "@playwright/test";
import path from "node:path";
import { MOCK_USER } from "./helpers/auth";
import { dismissEngagementPopups } from "./helpers/login";

test("preserves a Spanish draft and real poster across full-document auth and profile return", async ({ page }, testInfo) => {
  await dismissEngagementPopups(page);
  let attempts = 0;
  let profileComplete = true;
  let profileSaved = false;
  let authReadsAfterProfile = 0;
  let completedLogins = 0;
  let denyNextAuthRead = false;
  await page.route("**/api/auth/me", (route) => {
    if (denyNextAuthRead) {
      denyNextAuthRead = false;
      return route.fulfill({ status: 401, json: { user: null } });
    }
    if (profileSaved) authReadsAfterProfile++;
    return route.fulfill({ json: { user: { ...MOCK_USER, profileCompleted: profileComplete } } });
  });
  await page.route("**/api/regions/options", (route) => route.fulfill({
    json: [{ id: 1, name: "Maresme", slug: "maresme", cities: [
      { id: 2, value: "mataro", label: "Mataró", latitude: 41.54, longitude: 2.44 },
    ] }],
  }));
  await page.route("**/api/categories", (route) => route.fulfill({ json: [] }));
  await page.route("**/es/publica", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    return route.fulfill({
      contentType: "text/x-component",
      body: '0:{"a":{"success":false,"reason":"stale-session"},"f":[]}\n',
    });
  });
  await page.route("**/api/auth/sign-in?*", (route) => {
    expect(new URL(route.request().url()).searchParams.get("locale")).toBe("es");
    const destination = new URL(route.request().url()).searchParams.get("redirect");
    expect(destination).toBe("/es/publica?resume=1");
    return route.fulfill({ contentType: "text/html", body:
      '<!doctype html><title>Identity-provider fixture</title><main><h1>Hosted login fixture</h1><a href="/__publish-auth-complete">Complete login</a><a href="/es/?auth_error=fixture_cancelled">Cancel login</a></main>' });
  });
  await page.route("**/__publish-auth-complete", (route) => {
    profileComplete = false;
    denyNextAuthRead = ++completedLogins === 1;
    return route.fulfill({ status: 302, headers: { location: "/es/publica?resume=1&auth_success=1" } });
  });
  await page.route("**/api/users/me/profile", (route) => {
    expect(route.request().method()).toBe("PATCH");
    profileSaved = profileComplete = true;
    return route.fulfill({ json: {} });
  });
  await page.goto("/es/publica");
  await expect(page.locator("input#title")).toBeEnabled();
  await page.locator("input#title").fill("Cartell conservat després de l'accés");
  await page.locator("textarea#description").fill("Descripció prou llarga per comprovar el retorn amb el cartell.");
  await page.locator("input#url").fill("https://example.com");
  await page.getByTestId("next-button").click();
  await page.locator("#town-input").fill("Mataró");
  await page.keyboard.press("Enter");
  await page.locator("input#location").fill("Parc Central");
  await page.getByTestId("next-button").click();
  await page.setInputFiles('input[type="file"]', path.join(process.cwd(), "public/static/icons/icon-192x192.png"));
  await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  const originalImage = await page.locator('main img[src^="data:image/"]').first().getAttribute("src");
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("publish-resume-action")).toBeVisible();
  expect(attempts).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("stale-session-draft-retained.png") });
  await page.getByTestId("publish-resume-action").click();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  const intent = await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"));
  expect(JSON.parse(intent!)).toMatchObject({ owner: { accountId: MOCK_USER.id }, stage: "login" });
  await page.goBack();
  const restoreAfterBack = page.locator('[data-testid="publish-draft-panel"] button.btn-primary');
  await expect(page.locator("input#title:enabled").or(restoreAfterBack)).toBeVisible();
  if (await restoreAfterBack.isVisible()) await restoreAfterBack.click();
  await expect(page.locator("input#title")).toBeEnabled();
  await expect(page.locator("input#title")).toHaveValue("Cartell conservat després de l'accés");
  expect(attempts).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("auth-back-editor-unlocked.png") });
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  await page.getByRole("link", { name: "Complete login" }).click();
  await expect(page).toHaveURL(/\/es\/publica\?resume=1/);
  const signedOutGate = page.getByTestId("publish-auth-gate");
  await expect(signedOutGate).toBeVisible();
  await signedOutGate.getByRole("button").click();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  await page.getByRole("link", { name: "Complete login" }).click();
  expect(completedLogins).toBe(2);
  const gate = page.getByTestId("complete-profile-gate");
  await expect(gate).toBeVisible();
  await gate.getByRole("link").click();
  await expect(page).toHaveURL(/\/es\/perfil\/edita/);
  await page.locator("#displayName").fill("Test User");
  await page.locator('main form button[type="submit"]').click();
  const modal = page.getByTestId("preview-modal");
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL(/\/es\/publica/);
  expect(authReadsAfterProfile).toBeGreaterThan(0);
  await expect(modal).toContainText("Cartell conservat després de l'accés");
  const image = modal.locator('img[src^="data:image/"]:visible').first();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", originalImage!);
  expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(attempts).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"))).toBeNull();
  await page.screenshot({ path: testInfo.outputPath("auth-profile-return-preview.png") });
  await testInfo.attach("auth-return-proof", { contentType: "application/json", body: JSON.stringify({
    hostedLogin: "fixture, not real Logto", fullDocumentNavigation: true, locale: "es",
    profileRefetched: true, createAttemptsBeforeHandoff: 1, createCallsOnReturn: attempts - 1,
    nativeIndexedDB: true, recoveredImageDecoded: true,
  }) });
  await modal.getByLabel("Tanca").click();
  await expect(page.locator("input#title")).toHaveValue("Cartell conservat després de l'accés");
  await page.reload();
  await expect(page.getByTestId("preview-modal")).not.toBeVisible();
  await expect(page.getByTestId("draft-save-status")).not.toHaveText(/guardando/i);
  expect(attempts).toBe(1);
  await page.locator('[data-testid="publish-draft-panel"] button.btn-primary').click();
  await page.getByTestId("next-button").click();
  await page.getByTestId("next-button").click();
  await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
  await page.getByTestId("publish-button").click();
  await page.getByTestId("publish-resume-action").click();
  await page.getByRole("link", { name: "Cancel login" }).click();
  await expect(page).toHaveURL(/auth_error=fixture_cancelled/);
  await page.goto("/es/publica");
  await expect(page.getByTestId("preview-modal")).not.toBeVisible();
  await page.locator('[data-testid="publish-draft-panel"] button.btn-primary').click();
  await expect(page.locator("input#title")).toHaveValue("Cartell conservat després de l'accés");
  expect(attempts).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("cancelled-auth-manual-recovery.png") });
});
