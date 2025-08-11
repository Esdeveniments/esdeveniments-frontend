import { test, expect } from '@playwright/test'

test.describe('Offline and error pages', () => {
  test('offline page renders', async ({ page }) => {
    await page.goto('/offline')
    await expect(page.getByText('Sense connexió')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Torna a l’inici' })).toBeVisible()
  })
})