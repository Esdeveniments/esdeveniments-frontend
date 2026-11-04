import { test, expect } from "@playwright/test";

test.describe("Responsive navbar", () => {
  test("keeps compact actions inside the 390px viewport gutter", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const navigation = page.getByRole("navigation").first();
    const topRow = page.getByTestId("navbar-top-row");
    const compactActions = page.getByTestId("compact-navbar-actions");
    const languageSwitcher = compactActions.getByRole("button").first();
    const authAction = compactActions.locator(
      '[data-testid="mobile-avatar-link"], [data-testid="mobile-login-link"], [data-testid="mobile-auth-slot"]'
    );

    await expect(navigation).toBeVisible({ timeout: 30000 });
    await expect(topRow).toBeVisible();
    await expect(compactActions).toBeVisible();
    await expect(languageSwitcher).toBeVisible();
    await expect(authAction).toHaveCount(1);
    await expect(authAction).toBeVisible();

    const geometry = await topRow.evaluate((element) => {
      const topRowRect = element.getBoundingClientRect();
      const actions = element.querySelector<HTMLElement>(
        '[data-testid="compact-navbar-actions"]'
      );
      const language = element.querySelector<HTMLElement>(
        '[data-testid="compact-navbar-actions"] button'
      );
      const auth = element.querySelector<HTMLElement>(
        '[data-testid="mobile-avatar-link"], [data-testid="mobile-login-link"], [data-testid="mobile-auth-slot"]'
      );

      if (!actions || !language || !auth) {
        throw new Error("Compact navbar actions or auth action is missing");
      }

      const actionsRect = actions.getBoundingClientRect();
      const languageRect = language.getBoundingClientRect();
      const authRect = auth.getBoundingClientRect();
      const styles = getComputedStyle(element);

      return {
        viewportWidth: window.innerWidth,
        topRowPaddingLeft: styles.paddingLeft,
        topRowPaddingRight: styles.paddingRight,
        actionsRightGap: window.innerWidth - actionsRect.right,
        languageWithinActions:
          languageRect.left >= actionsRect.left && languageRect.right <= actionsRect.right,
        authRightGap: window.innerWidth - authRect.right,
        actionsWidth: actionsRect.width,
        authWidth: authRect.width,
        topRowWidth: topRowRect.width,
      };
    });

    expect(geometry.viewportWidth).toBe(390);
    expect(geometry.topRowPaddingLeft).toBe("16px");
    expect(geometry.topRowPaddingRight).toBe("16px");
    expect(geometry.actionsRightGap).toBeCloseTo(16, 1);
    expect(geometry.languageWithinActions).toBe(true);
    expect(geometry.authRightGap).toBeCloseTo(16, 1);
    expect(geometry.actionsWidth).toBeGreaterThan(44);
    expect(geometry.authWidth).toBe(44);
    expect(geometry.topRowWidth).toBe(390);
  });

  test("keeps the page end clear of the fixed mobile navigation", async ({
    page,
  }) => {
    for (const width of [390, 768, 949]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

      const mobileNav = page.getByTestId("mobile-bottom-nav");
      const contentSafeArea = page.getByTestId("mobile-nav-content-safe-area");

      await expect(mobileNav).toBeVisible({ timeout: 30000 });
      await expect(contentSafeArea).toBeVisible();

      const geometry = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>(
          '[data-testid="mobile-bottom-nav"]'
        );
        const safeArea = document.querySelector<HTMLElement>(
          '[data-testid="mobile-nav-content-safe-area"]'
        );
        const footer = document.querySelector("footer");
        const footerLastContent = document.querySelector<HTMLElement>(
          '[data-testid="footer-last-content"]'
        );

        if (!nav || !safeArea || !footer || !footerLastContent) {
          throw new Error(
            "Mobile nav, safe-area wrapper, footer, or footer content is missing"
          );
        }

        const navRect = nav.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        const navStyles = getComputedStyle(nav);
        const safeAreaStyles = getComputedStyle(safeArea);
        const clearance = getComputedStyle(document.documentElement)
          .getPropertyValue("--mobile-nav-clearance")
          .trim();

        return {
          navHeight: navRect.height,
          navTop: navRect.top,
          navBottom: navRect.bottom,
          viewportHeight: window.innerHeight,
          navPaddingBottom: navStyles.paddingBottom,
          navClearance: clearance,
          contentPaddingBottom: safeAreaStyles.paddingBottom,
          footerBottom: footerRect.bottom,
          footerLastContentBottom: footerLastContent.getBoundingClientRect().bottom,
        };
      });

      expect(geometry.navBottom).toBeCloseTo(844, 1);
      expect(geometry.navHeight).toBeGreaterThanOrEqual(64);
      expect(geometry.navPaddingBottom).toMatch(/px$/);
      expect(geometry.contentPaddingBottom).toMatch(/px$/);
      expect(geometry.navClearance).toMatch(/calc\(/);

      const endGeometry = await page.evaluate(() => {
        const body = document.body;
        const documentElement = document.documentElement;
        const scrollRoot =
          body.scrollHeight > body.clientHeight
            ? body
            : document.scrollingElement ?? documentElement;
        const maxScrollTop = scrollRoot.scrollHeight - scrollRoot.clientHeight;
        scrollRoot.scrollTop = maxScrollTop;

        if (scrollRoot.scrollTop < maxScrollTop - 1) {
          throw new Error(
            `Scroll root did not reach its maximum position: ${scrollRoot.scrollTop} < ${maxScrollTop}`
          );
        }

        const nav = document.querySelector<HTMLElement>(
          '[data-testid="mobile-bottom-nav"]'
        );
        const footerLastContent = document.querySelector<HTMLElement>(
          '[data-testid="footer-last-content"]'
        );
        if (!nav || !footerLastContent) {
          throw new Error("Nav or footer content is missing");
        }
        return {
          navTop: nav.getBoundingClientRect().top,
          footerLastContentBottom: footerLastContent.getBoundingClientRect().bottom,
        };
      });

      expect(endGeometry.footerLastContentBottom).toBeLessThanOrEqual(
        endGeometry.navTop + 1
      );
    }
  });

  test("switches from compact to desktop navigation at 950px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 949, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const navbar = page.locator("#site-navbar");
    const compactActions = page.getByTestId("compact-navbar-actions");
    const desktopActions = page.getByTestId("desktop-navbar-actions");

    await expect(compactActions).toBeVisible({ timeout: 30000 });
    await expect(desktopActions).toBeHidden();

    await page.setViewportSize({ width: 950, height: 844 });

    await expect(compactActions).toBeHidden();
    await expect(desktopActions).toBeVisible();
    await expect(navbar).toHaveClass(/site-navbar-safe-area/);

    const desktopClearance = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const contentSafeArea = document.querySelector<HTMLElement>(
        '[data-testid="mobile-nav-content-safe-area"]'
      );
      if (!contentSafeArea) throw new Error("Safe-area wrapper is missing");
      return {
        clearance: rootStyles.getPropertyValue("--mobile-nav-clearance").trim(),
        paddingBottom: getComputedStyle(contentSafeArea).paddingBottom,
      };
    });

    expect(desktopClearance).toEqual({
      clearance: "0px",
      paddingBottom: "48px",
    });
  });
});
