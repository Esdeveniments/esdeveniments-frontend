import { expect, test } from "@playwright/test";
import { getPasskeySkipControl } from "./helpers/login";

const LOGTO_PASSKEY_URL = "https://auth.example.test/create-passkey?app_id=test";
const APP_URL = "http://app.example.test/en/publica";

test("selects Logto's Skip control and returns to the app", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(LOGTO_PASSKEY_URL).origin) {
      await route.fulfill({
        contentType: "text/html",
        body: `
          <button id="create-passkey" type="button">Create a passkey</button>
          <div role="button" id="back">Back</div>
          <div role="button" id="skip">Skip</div>
          <script>
            document.querySelector("#skip").addEventListener("click", () => {
              window.location.href = "${APP_URL}";
            });
          </script>
        `,
      });
      return;
    }
    if (url.origin === new URL(APP_URL).origin) {
      await route.fulfill({ contentType: "text/html", body: "<h1>App</h1>" });
      return;
    }
    await route.abort();
  });

  await page.goto(LOGTO_PASSKEY_URL);
  const skip = await getPasskeySkipControl(page);
  await expect(skip).toHaveAttribute("id", "skip");
  await skip.click();
  await expect(page).toHaveURL(APP_URL);
});
