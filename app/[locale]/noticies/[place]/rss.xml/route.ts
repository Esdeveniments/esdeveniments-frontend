import { getTranslations } from "next-intl/server";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { fetchNews } from "@lib/api/news";
import { getPlaceTypeAndLabelCached } from "@utils/location-helpers";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import { formatPlacePreposition } from "@utils/string-helpers";
import { localeToHrefLang } from "types/i18n";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/[locale]/noticies/[place]/rss.xml">
) {
  const { place } = await params;
  const locale = await getLocaleSafely();
  const [t, { type, label }] = await Promise.all([
    getTranslations({ locale, namespace: "App.NewsPlaceRss" }),
    getPlaceTypeAndLabelCached(place).catch(() => ({ type: "" as const, label: place })),
  ]);
  const language = localeToHrefLang[locale] ?? locale;
  const feed = new Feed({
    id: toLocalizedUrl(`/noticies/${place}`, locale),
    link: toLocalizedUrl(`/noticies/${place}`, locale),
    title: t("title", { place: label }),
    description: t("description", {
      placeOf: formatPlacePreposition(label, type, locale, false, "of"),
    }),
    copyright: "Esdeveniments.cat",
    updated: new Date(),
    language,
    author: {
      name: "Esdeveniments.cat",
      link: siteUrl,
    },
  });

  try {
    const res = await fetchNews({ page: 0, size: 20, place });
    const items = Array.isArray(res.content) ? res.content : [];
    for (const item of items) {
      // A region's feed lists its cities' articles: link each under its own
      // city/region, the canonical URL, not under the feed's place.
      const itemPlace = resolveNewsItemPlace(item, place, place).slug;
      const articleUrl = toLocalizedUrl(
        `/noticies/${itemPlace}/${item.slug}`,
        locale
      );
      feed.addItem({
        id: item.id,
        title: item.title,
        link: articleUrl,
        description: item.description,
        content: item.description,
        date: new Date(item.startDate),
        image: item.imageUrl,
      });
    }
  } catch (e) {
    console.error("news place rss: error fetching", place, e);
  }

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
