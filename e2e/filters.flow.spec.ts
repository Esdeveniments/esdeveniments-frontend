import { test, expect } from '@playwright/test'

// Note: These flows are URL-driven; we assert URL structure and presence of basic UI.

test.describe('Filters canonical flows', () => {
  test('place only canonical: /barcelona', async ({ page }) => {
    await page.goto('/barcelona')
    await expect(page).toHaveURL(/\/barcelona$/)
    // list container should exist (server list component renders)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })

  test('place + date canonical: /barcelona/avui', async ({ page }) => {
    await page.goto('/barcelona/avui')
    await expect(page).toHaveURL(/\/barcelona\/avui$/)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })

  test('place + category canonical: /barcelona/concerts', async ({ page }) => {
    await page.goto('/barcelona/concerts')
    await expect(page).toHaveURL(/\/barcelona\/concerts$/)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })
})