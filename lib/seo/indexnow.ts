import "server-only";
import { getSiteUrl } from "@config/index";
import { buildLocalizedUrls } from "@utils/i18n-seo";
import { INDEXNOW_KEY } from "@utils/constants";
import { isProductionSiteUrl } from "@utils/production-host";
import { safeFetch } from "@utils/safe-fetch";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Tell IndexNow engines (Bing, and through it Copilot) that these event pages
 * changed, in every locale. Production only, so staging never submits URLs.
 * Never throws; call it from `after()`, after the CDN purge, so the crawler
 * fetches fresh HTML. A deleted event's URLs are submitted too (they now 404).
 */
export async function submitEventsToIndexNow(
  slugs: readonly (string | null | undefined)[],
): Promise<void> {
  const siteUrl = getSiteUrl();
  if (!isProductionSiteUrl(siteUrl)) return;

  const urlList = [...new Set(slugs.filter(Boolean))].flatMap((slug) =>
    Object.values(buildLocalizedUrls(`/e/${slug}`)),
  );
  if (urlList.length === 0) return;

  await safeFetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key: INDEXNOW_KEY,
      urlList,
    }),
    expectJson: false,
    context: { tags: { section: "indexnow" } },
  });
}
