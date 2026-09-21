import { test, expect } from "@playwright/test";

// PROMOTED_EVENTS_ENABLED is unset/false in every real deploy today (the
// backend endpoint this feature calls doesn't exist yet — see
// lib/api/promotedEvents.ts and docs/superpowers/specs/2026-08-03-promoted-
// events-carousel-design.md). This spec is a regression check for that
// default state: the new code path must not change existing page behavior
// while the flag is off. Full E2E coverage of the populated carousel is a
// follow-up once the flag is flipped on against real backend data.
test.describe("promoted events carousel (flag off, default state)", () => {
  test("homepage renders normally with no promoted-events section", async ({
    page,
  }) => {
    await page.goto("/");
    // Homepage intentionally renders two <h1>s (an sr-only one for SEO/crawler
    // resilience plus the visible hero title) — see app/[locale]/page.tsx.
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /esdeveniments destacats/i }),
    ).toHaveCount(0);
  });

  test("a town listing page renders normally with no promoted-events section", async ({
    page,
  }) => {
    await page.goto("/cardedeu");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /esdeveniments destacats/i }),
    ).toHaveCount(0);
  });
});
