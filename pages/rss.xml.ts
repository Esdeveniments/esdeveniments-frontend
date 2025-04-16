import { FC } from "react";
import { siteUrl } from "@config/index";
import { Feed } from "feed";
import { fetchEventsFromBackend } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { getFormattedDate } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import type { GetServerSideProps } from "next";
import { EventSummaryResponseDTO } from "types/api/event";

const SITE_NAME = "Esdeveniments.cat";

interface QueryParams {
  region?: string;
  town?: string;
  maxEventsPerDay?: string;
  until?: number;
}

interface RssEvent {
  id: string;
  title: string;
  slug: string;
  nameDay: string;
  formattedStart: string;
  location: string;
  town: string;
  region: string;
  startDate: string;
  imageUploaded?: string;
  eventImage?: string;
}

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
    const until = new Date(now.setDate(now.getDate() + Number(untilProp)));

    const q = town ? `${townLabel} ${regionLabel}` : regionLabel;

    const events: EventSummaryResponseDTO[] = await fetchEventsFromBackend({
      from,
      until,
      q,
      filterByDate: true,
      maxResults: 1000,
    });

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
        imageUploaded: event.imageUrl || "",
        eventImage: event.imageUrl || "",
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
      image: item.imageUploaded || item.eventImage || defaultImage,
    });
  });

  return feed;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  if (context && context.res) {
    const { res, query } = context;
    const {
      region = "",
      town = "",
      maxEventsPerDay,
      until,
    } = query as QueryParams;

    const articles = await getAllArticles(region, town, maxEventsPerDay, until);

    const feed = await buildFeed(articles, region, town);
    res.setHeader("content-type", "text/xml");
    res.write(feed.rss2()); // NOTE: You can also use feed.atom1() or feed.json1() for other feed formats
    res.end();
  }

  return {
    props: {},
  };
};

const RssPage: FC = () => null;

export default RssPage;
