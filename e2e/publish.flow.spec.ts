import { test, expect } from '@playwright/test'

// This flow validates the presence and basic interactivity of the publish page.
// It avoids asserting on backend behavior to keep CI deterministic.

test.describe('Publish event flow', () => {
  test('navigates to publica and sees the form', async ({ page }) => {
    await page.goto('/publica')
    await expect(page.getByText('Publica un esdeveniment')).toBeVisible()
    // The form has inputs; check at least a couple by role or text
    await expect(page.getByRole('button', { name: 'Publicar' })).toBeVisible()
  })
})