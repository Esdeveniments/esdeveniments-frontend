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
  maxEventsPerDay: string | undefined = undefined
  // untilProp: number = 7
): Promise<RssEvent[]> => {
  const { label: regionLabel } = await getPlaceTypeAndLabel(region);
  const { label: townLabel } = await getPlaceTypeAndLabel(town);

  try {
    // Removed date filtering - new API doesn't support it

    const response = await fetchEvents({
      page: 0,
      size: 1000,
      zone: town || regionLabel,
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

  const feed = new Feed({
    id: siteUrl,
    link: siteUrl,
    title: `Rss ${SITE_NAME} - ${townLabel || regionLabel || "Catalunya"}`,
    description: `Rss ${SITE_NAME} de ${
      townLabel || regionLabel || "Catalunya"
    }`,
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
  const maxEventsPerDay = searchParams.get("maxEventsPerDay") || undefined;
  const untilParam = searchParams.get("until");
  const until = untilParam ? Number(untilParam) : 7;
  console.log(until);

  const articles = await getAllArticles(region, town, maxEventsPerDay);
  const feed = await buildFeed(articles, region, town);

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
    status: 200,
  });
}
