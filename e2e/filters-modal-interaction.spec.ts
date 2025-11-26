import { test, expect, Locator } from "@playwright/test";

async function setDistance(rangeInput: Locator, targetValue: number) {
  const currentValue = parseInt(await rangeInput.inputValue(), 10);
  const steps = Math.abs(targetValue - currentValue);
  const directionKey = targetValue > currentValue ? "ArrowRight" : "ArrowLeft";

  await rangeInput.focus();
  for (let i = 0; i < steps; i += 1) {
    await rangeInput.press(directionKey);
  }
}

test.describe("Filters Modal Interaction", () => {
  test.beforeEach(async ({ context }) => {
    // Grant geolocation permissions and set a mock location
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 41.3851, longitude: 2.1734 });
  });

  test("should open modal, set distance, trigger geolocation, and apply filters", async ({
    page,
  }) => {
    // 1. Navigate to the page
    await page.goto("/catalunya", { waitUntil: "domcontentloaded" });

    // 2. Open the filters modal
    const filterButton = page.getByTestId("filters-open");
    await expect(filterButton).toBeVisible();
    await filterButton.click({ force: true });

    // 3. Verify modal is open using data-testid
    const modal = page.getByTestId("filters-modal");
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    // Verify content inside modal
    await expect(modal.getByText("Poblacions")).toBeVisible();
    await expect(modal.getByText("Distància")).toBeVisible();

    // 4. Interact with the range slider
    // Target the input inside the wrapper with data-testid
    const rangeInput = page.locator('[data-testid="distance-range"] input[type="range"]');
    await expect(rangeInput).toBeVisible();

    // Initial value should be the minimum (disabled until activated)
    await expect(rangeInput).toHaveValue("5");

    // Activate distance filter
    const distanceToggle = page.getByTestId("distance-toggle");
    await distanceToggle.check();

    // After activation, default should jump to 10 (DISTANCES[1])
    await expect(rangeInput).toHaveValue("10");

    // Change the value to 30 using keyboard events (triggers React onChange)
    await setDistance(rangeInput, 30);

    // Verify the visual feedback updated (e.g., "30 km")
    await expect(page.getByText("30 km")).toBeVisible();

    // 5. Switch to current location (disables place select)
    await page.getByTestId("use-my-location-btn").click();
    const placeInput = page.locator("input#options-input");
    await expect(placeInput).toBeDisabled();

    // 6. Apply filters using data-testid
    const applyButton = page.getByTestId("filters-modal-action-button");
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // 7. Verify URL updates
    // Should contain distance=30 and lat/lon from our mock
    await page.waitForURL((url) => url.searchParams.has("distance"), { timeout: 10000 });
    
    const url = new URL(page.url());
    expect(url.searchParams.get("distance")).toBe("30");
    expect(url.searchParams.get("lat")).toBe("41.3851");
    expect(url.searchParams.get("lon")).toBe("2.1734");
    
    // Place should be 'catalunya' (default when distance is used)
    expect(url.pathname).toMatch(/^\/catalunya/);
  });

  test("should disable place input when distance is active", async ({ page }) => {
    await page.goto("/catalunya", { waitUntil: "domcontentloaded" });
    
    const filterButton = page.getByTestId("filters-open");
    await expect(filterButton).toBeVisible();
    await filterButton.click({ force: true });
    
    const modal = page.getByTestId("filters-modal");
    await expect(modal).toBeVisible({ timeout: 10000 });
    
    const rangeInput = page.locator('[data-testid="distance-range"] input[type="range"]');
    const distanceToggle = page.getByTestId("distance-toggle");
    await distanceToggle.check();
    // Use keyboard to set distance to 25 to ensure onChange handlers fire
    await setDistance(rangeInput, 25);
    
    await expect(page.getByText("25 km")).toBeVisible();
    
    // Toggle "Use my location" to enter location mode (disables place select)
    await page.getByTestId("use-my-location-btn").click();
    const placeInput = page.locator("input#options-input");
    await expect(placeInput).toBeDisabled();
  });
});
