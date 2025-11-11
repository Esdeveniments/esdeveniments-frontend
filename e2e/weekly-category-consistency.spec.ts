import { test, expect } from "@playwright/test";

function computeWeekRange(): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  const toDate = new Date(now);
  const add = (7 - now.getDay()) % 7 || 7; // ensure Sunday advances to next Sunday
  toDate.setDate(now.getDate() + add);
  const to = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(
    toDate.getDate()
  )}`;
  return { from, to };
}

test.describe("Weekly category consistency (catalunya)", () => {
  test("/catalunya/setmana/teatre shows at least one event returned by weekly+category API", async ({
    page,
  }) => {
    const { from, to } = computeWeekRange();

    // Query internal API for a weekly+category sample (without place)
    const params = new URLSearchParams({
      category: "teatre",
      from,
      to,
      size: "10",
    });
    const res = await page.request.get(`/api/events?${params}`);
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as unknown;
    const list = (() => {
      if (!data || typeof data !== "object") return [];
      const content = (data as Record<string, unknown>).content;
      return Array.isArray(content) ? content : [];
    })() as Array<Record<string, unknown>>;
    if (list.length === 0)
      test.skip(true, "No events in API for this week/category");
    const first = list.find(
      (event) => typeof (event as { title?: unknown })?.title === "string"
    );
    if (!first || typeof (first as { title?: unknown }).title !== "string") {
      throw new Error("Expected event with title in weekly API list");
    }
    const title = (first as { title: string }).title;
    const snippet = title.slice(0, Math.min(18, title.length));

    await page.goto(`/catalunya/setmana/teatre`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Expect the SSR list to contain the sampled title (or its snippet)
    await expect(
      page.getByText(snippet, { exact: false }).first()
    ).toBeVisible();
  });

  test.fixme(
    "Load more uses from/to for setmana+teatre (flaky on sparse datasets)",
    async () => {}
  );
});

test.describe("Today and Weekend category consistency (catalunya)", () => {
  const cases = [
    {
      path: "/catalunya/avui/teatre",
      range: (() => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const s = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate()
        )}`;
        return { from: s, to: s };
      })(),
    },
    {
      path: "/catalunya/cap-de-setmana/teatre",
      range: (() => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const now = new Date();
        const fri = new Date(now);
        const day = now.getDay();
        const diff = (5 - day + 7) % 7;
        fri.setDate(now.getDate() + diff);
        const sun = new Date(now);
        const sdiff = (7 - day) % 7;
        sun.setDate(now.getDate() + sdiff);
        const from = `${fri.getFullYear()}-${pad(fri.getMonth() + 1)}-${pad(
          fri.getDate()
        )}`;
        const to = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(
          sun.getDate()
        )}`;
        return { from, to };
      })(),
    },
  ] as const;

  for (const c of cases) {
    test(`${c.path} shows at least one event from API`, async ({ page }) => {
      const params = new URLSearchParams({
        category: "teatre",
        from: c.range.from,
        to: c.range.to,
        size: "10",
      });
      const res = await page.request.get(`/api/events?${params}`);
      expect(res.ok()).toBeTruthy();
      const data = (await res.json()) as unknown;
      const list = (() => {
        if (!data || typeof data !== "object") return [];
        const content = (data as Record<string, unknown>).content;
        return Array.isArray(content) ? content : [];
      })() as Array<Record<string, unknown>>;
      if (list.length === 0)
        test.skip(true, "No events in API for this date range");
      const firstWithTitle = list.find(
        (event) => typeof (event as { title?: unknown })?.title === "string"
      );
      if (
        !firstWithTitle ||
        typeof (firstWithTitle as { title?: unknown }).title !== "string"
      ) {
        test.skip(true, "No titled events in API for this date range");
      }
      const title = (firstWithTitle as { title: string }).title;
      const snippet = title.slice(0, Math.min(18, title.length));

      await page.goto(c.path, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await expect(
        page.getByText(snippet, { exact: false }).first()
      ).toBeVisible();
    });
  }
});
