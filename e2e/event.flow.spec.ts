import { test, expect } from '@playwright/test'

// Event flow: visit sitemap, try to open some event. If none, verify 404 page renders on fake slug.

test.describe('Event detail flow', () => {
  test('open an event card when available or show not-found', async ({ page }) => {
    await page.goto('/sitemap')
    // Click first region/city link if present
    const firstLink = page.locator('a[href^="/sitemap/"]').first()
    if (await firstLink.isVisible()) {
      await firstLink.click()
      // If the page lists archive months, navigate to any month then choose an event if listed
      const monthLink = page.locator('a[href*="/sitemap/"]').nth(1)
      if (await monthLink.isVisible()) {
        await monthLink.click()
        const eventLink = page.locator('a[href^="/e/"]').first()
        if (await eventLink.isVisible()) {
          await eventLink.click()
          // Event header/title should be visible
          await expect(page.locator('h1')).toBeVisible()
          return
        }
      }
    }
    // Fallback: navigate to a non-existent event
    await page.goto('/e/non-existent-event-slug-12345')
    await expect(page.getByText('Pàgina no trobada')).toBeVisible()
  })
})