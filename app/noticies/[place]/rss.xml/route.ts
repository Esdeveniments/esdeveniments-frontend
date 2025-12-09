import { getTranslations } from "next-intl/server";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { fetchNews } from "@lib/api/news";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ place: string }> }
) {
  const { place } = await params;
  const t = await getTranslations("App.NewsPlaceRss");
  const feed = new Feed({
    id: `${siteUrl}/noticies/${place}`,
    link: `${siteUrl}/noticies/${place}`,
    title: t("title", { place }),
    description: t("description", { place }),
    copyright: "Esdeveniments.cat",
    updated: new Date(),
    author: {
      name: "Esdeveniments.cat",
      link: siteUrl,
    },
  });

  try {
    const res = await fetchNews({ page: 0, size: 20, place });
    const items = Array.isArray(res.content) ? res.content : [];
    for (const item of items) {
      const articleUrl = `${siteUrl}/noticies/${place}/${item.slug}`;
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
