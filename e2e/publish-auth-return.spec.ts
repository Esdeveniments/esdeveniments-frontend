import { test, expect } from "@playwright/test";
import path from "node:path";
import { MOCK_USER } from "./helpers/auth";
import { dismissEngagementPopups } from "./helpers/login";
import { expectPublishRequest, readPublishRequest, readSavedDraft } from "./helpers/publish-draft";

for (const scenario of ["stale-session", "guest", "guest-typing"]) {
test(`preserves a Spanish ${scenario} draft and real poster across full-document auth and profile return`, async ({ page }, testInfo) => {
  const guest = scenario !== "stale-session";
  const typing = scenario === "guest-typing";
  await dismissEngagementPopups(page);
  let attempts = 0;
  let signedIn = !guest;
  let allowCreate = false;
  let submitted: Awaited<ReturnType<typeof readPublishRequest>> | undefined;
  const beforeReturn = guest ? 0 : 1;
  let profileComplete = true;
  let profileSaved = false;
  let authReadsAfterProfile = 0;
  let completedLogins = 0;
  let denyNextAuthRead = false;
  let resolveHydration!: () => void;
  const hydrationReady = new Promise<void>((resolve) => { resolveHydration = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    if (!signedIn || denyNextAuthRead) {
      denyNextAuthRead = false;
      return route.fulfill({ status: 401, json: { user: null } });
    }
    if (typing && completedLogins === 2) await hydrationReady;
    if (profileSaved) authReadsAfterProfile++;
    return route.fulfill({ json: { user: { ...MOCK_USER, profileCompleted: profileComplete } } });
  });
  await page.route("**/api/regions/options", (route) => route.fulfill({
    json: [{ id: 1, name: "Maresme", slug: "maresme", cities: [
      { id: 2, value: "mataro", label: "Mataró", latitude: 41.54, longitude: 2.44 },
    ] }],
  }));
  await page.route("**/api/categories", (route) => route.fulfill({ json: [] }));
  await page.route("**/es/publica**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    try {
      if (allowCreate) submitted = await readPublishRequest(page, route.request(), MOCK_USER.id);
    } finally {
      await route.fulfill({
        contentType: "text/x-component",
        body: allowCreate ? '0:{"a":{"success":true,"event":{"slug":"guest-publish-fixture"}},"f":[]}\n'
          : '0:{"a":{"success":false,"reason":"stale-session"},"f":[]}\n',
      });
    }
  });
  await page.route("**/api/auth/sign-in?*", (route) => {
    expect(new URL(route.request().url()).searchParams.get("locale")).toBe("es");
    const destination = new URL(route.request().url()).searchParams.get("redirect");
    expect(destination).toBe("/es/publica?resume=1");
    return route.fulfill({ contentType: "text/html", body:
      '<!doctype html><title>Identity-provider fixture</title><main><h1>Hosted login fixture</h1><a href="/__publish-auth-complete">Complete login</a><a href="/es/?auth_error=fixture_cancelled">Cancel login</a></main>' });
  });
  await page.route("**/__publish-auth-complete", (route) => {
    signedIn = true;
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
  await page.getByTestId("preview-button").click();
  await expect(page.getByTestId("preview-modal")).toBeVisible();
  const originalImage = page.getByTestId("preview-modal").locator('img[src^="data:image/"]:visible').first();
  await expect.poll(() => originalImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(attempts).toBe(0);
  if (!guest) {
    await page.getByTestId("preview-modal-action-button").click();
    await expect(page.getByTestId("publish-resume-action")).toBeVisible();
  }
  expect(attempts).toBe(beforeReturn);
  await page.screenshot({ path: testInfo.outputPath("stale-session-draft-retained.png") });
  await page.getByTestId(guest ? "preview-modal-action-button" : "publish-resume-action").click();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  const intent = await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"));
  expect(JSON.parse(intent!)).toMatchObject({ owner: guest ? { kind: "guest" } : { accountId: MOCK_USER.id }, stage: "login" });
  const originalDraft = await readSavedDraft(page);
  await page.goBack();
  const restoreAfterBack = page.locator('[data-testid="publish-draft-panel"] button.btn-primary');
  await expect(page.locator('[data-testid="publish-button"]:enabled').or(restoreAfterBack)).toBeVisible();
  if (await restoreAfterBack.isVisible()) await restoreAfterBack.click();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  expect(await readSavedDraft(page)).toEqual(originalDraft);
  expect(attempts).toBe(beforeReturn);
  await page.screenshot({ path: testInfo.outputPath("auth-back-editor-unlocked.png") });
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  await page.getByRole("link", { name: "Complete login" }).click();
  await expect(page).toHaveURL(/\/es\/publica\?resume=1/);
  const pendingGuest = page.locator('[data-testid="publish-draft-panel"] button.btn-primary');
  await expect(page.locator('button[data-testid="publish-early-sign-in"]:enabled').or(pendingGuest)).toBeVisible();
  if (await pendingGuest.isVisible()) await pendingGuest.click();
  await expect(page.getByTestId("publish-early-sign-in")).toBeEnabled();
  await page.getByTestId("publish-early-sign-in").click();
  await expect(page.getByRole("heading", { name: "Hosted login fixture" })).toBeVisible();
  await page.getByRole("link", { name: "Complete login" }).click();
  expect(completedLogins).toBe(2);
  if (typing) {
    await expect(page.locator("input#title")).toBeEnabled();
    await page.locator("input#title").fill("New input during authentication");
    resolveHydration();
    await expect(pendingGuest).toBeEnabled();
    await expect(page.locator("input#title")).toHaveValue("New input during authentication");
    expect(await readSavedDraft(page, MOCK_USER.id)).toEqual(originalDraft);
    await expect(page.getByText("No hemos podido recuperar el borrador de este regreso.", { exact: false })).not.toBeVisible();
    expect(attempts).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("hydration-edits-explicit-restore.png") });
    await pendingGuest.click();
  }
  if (guest) {
    await page.getByTestId("preview-button").click();
    await expect(page.getByTestId("preview-modal")).toBeVisible();
    const image = page.getByTestId("preview-modal").locator('img[src^="data:image/"]:visible').first();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await page.getByTestId("preview-modal-action-button").click();
  }
  await expect(page).toHaveURL(/\/es\/perfil\/edita/);
  expect(attempts).toBe(beforeReturn);
  allowCreate = true;
  await page.locator("#displayName").fill("Test User");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/e\/guest-publish-fixture/);
  expect(authReadsAfterProfile).toBeGreaterThan(0);
  expect(attempts).toBe(beforeReturn + 1);
  expectPublishRequest(submitted, originalDraft);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("publish-resume-v1"))).toBeNull();
  await page.screenshot({ path: testInfo.outputPath("auth-profile-return-published.png") });
  await testInfo.attach("auth-return-proof", { contentType: "application/json", body: JSON.stringify({
    hostedLogin: "fixture, not real Logto", fullDocumentNavigation: true, locale: "es",
    profileRefetched: true, createAttemptsBeforeHandoff: beforeReturn, createCallsOnReturn: attempts - beforeReturn,
    nativeIndexedDB: true, recoveredImageDecoded: true,
  }) });
  await page.goBack();
  await expect(page.locator("input#title")).toBeEnabled();
  await expect(page.locator("input#title")).toHaveValue("");
  await page.locator("input#title").fill("A fresh event after publication");
  await expect(page.getByTestId("draft-save-status")).toHaveText("Guardado en este dispositivo");
  expect(attempts).toBe(beforeReturn + 1);
});
}
