import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { gotoFirstResolvableEvent } from "./helpers/events";

// Headings must not skip levels (h1 > h3) and each page has one h1. Card
// titles are h2 right under a page h1 and h3 under a section h2
// (`headingLevel`), and in-page titles under the layout's h1 (empty states,
// auth gates) are h2. This catches a component that hardcodes the wrong level.
const RULES = ["heading-order", "page-has-heading-one"];

async function waitForStream(page: Page) {
  await page.waitForLoadState("load");
  // Streamed boundaries start as <template id="B:n">; none left means done.
  await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'));
}

async function expectHeadingOrder(page: Page) {
  await waitForStream(page);
  const { violations } = await new AxeBuilder({ page }).withRules(RULES).analyze();
  const report = violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary}`),
  );
  expect(report, report.join("\n")).toEqual([]);
}

for (const path of ["/", "/barcelona", "/noticies", "/preferits"]) {
  test(`${path} has ordered headings`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expectHeadingOrder(page);
  });
}

test("event page has ordered headings", async ({ page }) => {
  const slug = await gotoFirstResolvableEvent(page);
  test.skip(slug === null, "No resolvable event returned from API");
  await expectHeadingOrder(page);
});
