import { test, expect } from '@playwright/test'

test.describe('Home flow', () => {
  test('renders home and search input', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Search input')).toBeVisible()
  })
})