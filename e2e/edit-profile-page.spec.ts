import { test, expect } from "@playwright/test";

/**
 * /perfil/edita is gated client-side on useAuth() (see EditProfileContent.tsx)
 * — an anonymous visitor must see the login gate, never the profile form.
 * No backend/session setup needed: this is the unauthenticated contract.
 */
test.describe("Edit profile page (unauthenticated)", () => {
  test("shows the login gate instead of the form", async ({ page }) => {
    await page.goto("/perfil/edita", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("edit-profile-auth-gate")).toBeVisible();
    await expect(page.getByLabel(/nom d'usuari|username/i)).toHaveCount(0);
  });

  test("login link on the gate returns to /perfil/edita", async ({ page }) => {
    await page.goto("/perfil/edita", { waitUntil: "domcontentloaded" });
    const loginLink = page
      .getByTestId("edit-profile-auth-gate")
      .getByRole("link");
    await expect(loginLink).toHaveAttribute(
      "href",
      /\/iniciar-sessio\?redirect=%2Fperfil%2Fedita/,
    );
  });
});
