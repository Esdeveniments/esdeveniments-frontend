import "server-only";
import { headers } from "next/headers";
import { getSiteUrl } from "@config/index";
import { buildLocalizedUrls } from "@utils/i18n-seo";
import { INDEXNOW_KEY } from "@utils/constants";
import {
  isProductionHost,
  isProductionSiteUrl,
} from "@utils/production-host";
import { safeFetch } from "@utils/safe-fetch";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Tell IndexNow engines (Bing, and through it Copilot) that these event pages
 * (and `extraPaths`, e.g. festa major hubs) changed, in every locale. Production only: both the site URL and the
 * request host must be production, since a preview built without
 * NEXT_PUBLIC_SITE_URL falls back to the production URL.
 * Never throws; call it from `after()`, after the CDN purge, so the crawler
 * fetches fresh HTML. A deleted event's URLs are submitted too (they now 404).
 */
export async function submitEventsToIndexNow(
  slugs: readonly (string | null | undefined)[],
  extraPaths: readonly string[] = [],
): Promise<void> {
  const siteUrl = getSiteUrl();
  if (!isProductionSiteUrl(siteUrl) || !(await isProductionRequest())) return;

  const paths = [
    ...slugs.filter(Boolean).map((slug) => `/e/${slug}`),
    ...extraPaths,
  ];
  const urlList = [...new Set(paths)].flatMap((path) =>
    Object.values(buildLocalizedUrls(path)),
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

async function isProductionRequest(): Promise<boolean> {
  try {
    return isProductionHost((await headers()).get("host"));
  } catch {
    return false;
  }
}
