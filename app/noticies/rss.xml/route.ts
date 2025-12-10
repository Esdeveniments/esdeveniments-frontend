import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { NEWS_HUBS } from "@utils/constants";
import { fetchNews } from "@lib/api/news";
import { resolveLocaleFromHeaders, toLocalizedUrl } from "@utils/i18n-seo";
import { DEFAULT_LOCALE, localeToHrefLang, type AppLocale } from "types/i18n";

export async function GET() {
  const t = await getTranslations("App.NewsRss");
  const locale =
    (resolveLocaleFromHeaders(await headers()) as AppLocale) || DEFAULT_LOCALE;
  const language = localeToHrefLang[locale] ?? locale;
  const feed = new Feed({
    id: toLocalizedUrl("/noticies", locale),
    link: toLocalizedUrl("/noticies", locale),
    title: t("title"),
    description: t("description"),
    copyright: "Esdeveniments.cat",
    updated: new Date(),
    language,
    author: {
      name: "Esdeveniments.cat",
      link: siteUrl,
    },
  });

  for (const hub of NEWS_HUBS) {
    try {
      const res = await fetchNews({ page: 0, size: 10, place: hub.slug });
      const items = Array.isArray(res.content) ? res.content : [];
      for (const item of items) {
        const articleUrl = toLocalizedUrl(
          `/noticies/${hub.slug}/${item.slug}`,
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
      console.error("news rss: error fetching hub", hub.slug, e);
    }
  }

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
