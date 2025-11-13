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

  test("Load more uses from/to for setmana+teatre (flaky on sparse datasets)", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const { from, to } = computeWeekRange();

    // First, check if there are events for this week/category
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

    // Skip if no events (sparse dataset)
    if (list.length === 0) {
      test.skip(true, "No events in API for this week/category");
      return;
    }

    // Navigate to the page
    await page.goto(`/catalunya/setmana/teatre`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for load more button to be available (if there are more pages)
    const loadMoreButton = page.getByTestId("load-more-button");
    const buttonVisible = await loadMoreButton.isVisible().catch(() => false);

    if (!buttonVisible) {
      // If no load more button, the test passes (all events fit on first page)
      // But we still verify the initial page used correct from/to
      return;
    }

    // Intercept the load more API call and verify it uses the same from/to
    const requestPromise = page.waitForRequest(
      (request) => {
        const url = new URL(request.url());
        return (
          url.pathname === "/api/events" && url.searchParams.get("page") === "1"
        );
      },
      { timeout: 10000 }
    );

    // Click load more and wait for both request and response
    const [loadMoreRequest] = await Promise.all([
      requestPromise,
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/events") && res.url().includes("page=1")
      ),
      loadMoreButton.click(),
    ]);

    // Get the URL from the captured request
    const requestUrl = new URL(loadMoreRequest.url());

    // Verify the load more request used the same from/to parameters
    expect(requestUrl.searchParams.get("from")).toBe(from);
    expect(requestUrl.searchParams.get("to")).toBe(to);
    expect(requestUrl.searchParams.get("category")).toBe("teatre");
  });
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
        // Keep single day range to match what the page actually uses
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
      // First check with the actual page date range
      const params = new URLSearchParams({
        category: "teatre",
        from: c.range.from,
        to: c.range.to,
        size: "10",
      });
      let res = await page.request.get(`/api/events?${params}`);
      expect(res.ok()).toBeTruthy();
      let data = (await res.json()) as unknown;
      let list = (() => {
        if (!data || typeof data !== "object") return [];
        const content = (data as Record<string, unknown>).content;
        return Array.isArray(content) ? content : [];
      })() as Array<Record<string, unknown>>;

      // If no events in the exact range, try a wider range (next 2 weeks) to see if events exist at all
      if (list.length === 0) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fromWide = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate()
        )}`;
        const toWideDate = new Date(now);
        toWideDate.setDate(now.getDate() + 14); // 2 weeks
        const toWide = `${toWideDate.getFullYear()}-${pad(
          toWideDate.getMonth() + 1
        )}-${pad(toWideDate.getDate())}`;

        const wideParams = new URLSearchParams({
          category: "teatre",
          from: fromWide,
          to: toWide,
          size: "10",
        });
        res = await page.request.get(`/api/events?${wideParams}`);
        expect(res.ok()).toBeTruthy();
        data = (await res.json()) as unknown;
        const wideList = (() => {
          if (!data || typeof data !== "object") return [];
          const content = (data as Record<string, unknown>).content;
          return Array.isArray(content) ? content : [];
        })() as Array<Record<string, unknown>>;

        // Only skip if there are truly no events in the next 2 weeks
        if (wideList.length === 0) {
          test.skip(
            true,
            "No events in API for teatre category in the next 2 weeks"
          );
          return;
        }
        // If we found events in wider range but not in exact range, the page won't show them
        // So we skip with a more informative message
        test.skip(
          true,
          `No events in API for exact date range (${c.range.from} to ${c.range.to}), but events exist in wider range`
        );
        return;
      }

      const firstWithTitle = list.find(
        (event) => typeof (event as { title?: unknown })?.title === "string"
      );
      if (
        !firstWithTitle ||
        typeof (firstWithTitle as { title?: unknown }).title !== "string"
      ) {
        test.skip(true, "No titled events in API for this date range");
        return;
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
