import { test, expect, type Page } from "@playwright/test";
import { gotoFirstResolvableEvent } from "./helpers/events";

/**
 * Nothing in <main> may stick out of a phone screen. `overflow-x: clip` on
 * html/body hides the overflow from `scrollWidth`, and <main> centers its child,
 * so a too-wide block is cut on both sides with no scrollbar (the sponsor banner
 * did this at 400px wide). So measure every element instead.
 */
async function findOverflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return ["<main> missing"];
    const vw = document.documentElement.clientWidth;

    // Children of a horizontal scroller (carousels) may sit off-screen.
    const insideScroller = (el: Element) => {
      for (let a = el.parentElement; a && a !== main; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== "visible") return true;
      }
      return false;
    };

    const out: string[] = [];
    for (const el of main.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || (r.left >= -1 && r.right <= vw + 1)) continue;
      if (getComputedStyle(el).position === "fixed" || insideScroller(el)) continue;
      out.push(
        `<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 60)}"> ${Math.round(r.left)}..${Math.round(r.right)} (viewport ${vw})`,
      );
    }
    return out.slice(0, 5);
  });
}

test.describe("Mobile layout fits the screen", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  for (const path of ["/", "/catalunya", "/barcelona", "/noticies"]) {
    test(`${path} has nothing wider than 320px`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load", timeout: 90000 });
      await expect(page.locator("main h1").first()).toBeAttached({ timeout: 30000 });
      expect(await findOverflowing(page)).toEqual([]);
    });
  }

  test("an event page has nothing wider than 320px", async ({ page }) => {
    const slug = await gotoFirstResolvableEvent(page);
    test.skip(!slug, "No events available");
    await page.waitForLoadState("load");
    expect(await findOverflowing(page)).toEqual([]);
  });
});
