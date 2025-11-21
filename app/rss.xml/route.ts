import { NextRequest } from "next/server";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { fetchEvents } from "@lib/api/events";
import { getPlaceTypeAndLabel, getFormattedDate } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import type { RssEvent } from "types/common";
import { EventSummaryResponseDTO } from "types/api/event";

const SITE_NAME = "Esdeveniments.cat";

const getAllArticles = async (
  region: string,
  town: string,
  category: string,
  byDate: string,
  maxEventsPerDay: string | undefined = undefined,
  untilProp: number = 7
): Promise<RssEvent[]> => {
  const { label: regionLabel } = await getPlaceTypeAndLabel(region);
  const { label: townLabel } = await getPlaceTypeAndLabel(town);

  try {
    // Calculate fallback dates (used if byDate is not provided)
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
      category,
      byDate,
      // Only pass absolute dates if byDate is missing to avoid conflicts
      from: byDate ? undefined : from.toISOString().split("T")[0],
      to: byDate ? undefined : until.toISOString().split("T")[0],
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
  town: string,
  category: string,
  byDate: string
): Promise<Feed> => {
  const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;
  const { label: regionLabel } = await getPlaceTypeAndLabel(region);
  const { label: townLabel } = await getPlaceTypeAndLabel(town);

  // Build a descriptive title like: "Esdeveniments - Barcelona - Avui - Teatre"
  const parts = [
    SITE_NAME,
    townLabel || regionLabel || "Catalunya",
    byDate ? byDate.charAt(0).toUpperCase() + byDate.slice(1) : null,
    category ? category.charAt(0).toUpperCase() + category.slice(1) : null,
  ].filter(Boolean);

  const title = `Rss ${parts.join(" - ")}`;

  const feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: title,
    description: `Subscripció a: ${title}`,
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
    const description = `${item.title}\n\n🗓️ ${item.nameDay} ${item.formattedStart}\n\n🏡 ${item.location}, ${item.town}, ${item.region} \n\nℹ️ Més informació disponible a la nostra pàgina web!`;

    feed.addItem({
      id: item.id,
      title: item.title,
      link: `${siteUrl}/e/${item.slug}`,
      description,
      content: item.location,
      date: new Date(item.startDate),
      image: item.imageUrl || defaultImage,
    });
  });

  return feed;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const region = searchParams.get("region") || "";
  const town = searchParams.get("town") || "";
  const category = searchParams.get("category") || "";
  const byDate = searchParams.get("byDate") || "";
  const maxEventsPerDay = searchParams.get("maxEventsPerDay") || undefined;
  const untilParam = searchParams.get("until");
  const until = untilParam ? Number(untilParam) : 7;

  const articles = await getAllArticles(
    region,
    town,
    category,
    byDate,
    maxEventsPerDay,
    until
  );
  const feed = await buildFeed(articles, region, town, category, byDate);

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      // Enable caching at the edge/CDN
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
    status: 200,
  });
}
