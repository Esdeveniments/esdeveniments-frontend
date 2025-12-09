import { NextRequest } from "next/server";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { fetchEvents } from "@lib/api/events";
import { getPlaceTypeAndLabel, getFormattedDate } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import { escapeXml } from "@utils/xml-escape";
import type { RssEvent } from "types/common";
import { EventSummaryResponseDTO } from "types/api/event";
import { getTranslations } from "next-intl/server";

const SITE_NAME = "Esdeveniments.cat";

const getAllArticles = async (
  region: string,
  town: string,
  maxEventsPerDay: string | undefined = undefined,
  untilProp: number = 7
): Promise<RssEvent[]> => {
  const { label: regionLabel } = await getPlaceTypeAndLabel(region);
  const { label: townLabel } = await getPlaceTypeAndLabel(town);

  try {
    const now = new Date();
    const from = new Date();
    const until = new Date();
    const untilDays = Number(untilProp);
    if (!isNaN(untilDays) && untilDays > 0) {
      until.setDate(now.getDate() + untilDays);
    } else {
      until.setDate(now.getDate() + 7); // Default to 7 days if invalid
    }

    const response = await fetchEvents({
      page: 0,
      size: 1000,
      place: town || regionLabel,
      from: from.toISOString().split("T")[0],
      to: until.toISOString().split("T")[0],
    });

    const events: EventSummaryResponseDTO[] = response.content;

    const mappedEvents = events.map((event) => {
      const { formattedStart, nameDay } = getFormattedDate(
        event.startDate,
        event.endDate
      );
      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        nameDay,
        formattedStart,
        location: event.location || "",
        town: event.city?.name || "",
        region: event.region?.name || "",
        startDate: event.startDate,
        imageUrl: event.imageUrl || "",
      };
    });

    const limitedEvents = maxEventsPerDay
      ? mappedEvents.slice(0, Number(maxEventsPerDay))
      : mappedEvents;

    return limitedEvents;
  } catch (error) {
    console.error(error);
    captureException(
      `Error getting all articles to generate the RSS feed for ${
        townLabel || regionLabel || "Catalunya"
      }: ${error}`
    );
    return [];
  }
};

const buildFeed = async (
  items: RssEvent[],
  region: string,
  town: string
): Promise<Feed> => {
  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;
  const { label: regionLabel } = await getPlaceTypeAndLabel(region);
  const { label: townLabel } = await getPlaceTypeAndLabel(town);
  const t = await getTranslations("Utils.Rss");
  const placeLabel = townLabel || regionLabel || "Catalunya";
  const feedTitle = t("feedTitle", { site: SITE_NAME, place: placeLabel });
  const feedDescription = t("feedDescription", {
    site: SITE_NAME,
    place: placeLabel,
  });

  // Escape labels for XML safety
  // The feed library handles escaping for channel title/description and uses CDATA for item fields.
  // We only need to escape attributes that are not handled by the library (like enclosure url).

  const feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: feedTitle,
    description: feedDescription,
    copyright: SITE_NAME,
    updated: new Date(),
    author: {
      name: SITE_NAME,
      link: siteUrl,
    },
  });

  const removedDuplicatedItems = items.filter(
    (v, i, a) =>
      a.findIndex((v2) => v2.id.split("_")[0] === v.id.split("_")[0]) === i
  );

  removedDuplicatedItems.forEach((item) => {
    // The feed library wraps title, description, content in CDATA, so we should NOT escape them.
    // However, it does NOT escape the enclosure URL (image), so we MUST escape it.
    
    const description = t("itemDescription", {
      title: item.title,
      nameDay: item.nameDay,
      formattedStart: item.formattedStart,
      location: item.location,
      town: item.town,
      region: item.region,
    });

    feed.addItem({
      id: item.id,
      title: item.title,
      link: `${siteUrl}/e/${item.slug}`,
      description,
      content: item.location,
      date: new Date(item.startDate),
      image: escapeXml(item.imageUrl || defaultImage),
    });
  });

  return feed;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const region = searchParams.get("region") || "";
  const town = searchParams.get("town") || "";
  const maxEventsPerDay = searchParams.get("maxEventsPerDay") || undefined;
  const untilParam = searchParams.get("until");
  const until = untilParam ? Number(untilParam) : 7;

  const articles = await getAllArticles(region, town, maxEventsPerDay, until);
  const feed = await buildFeed(articles, region, town);

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
