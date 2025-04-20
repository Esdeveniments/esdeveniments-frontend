import { GetServerSideProps } from "next";
import { getServerSideSitemapLegacy, ISitemapField } from "next-sitemap";
import { sanitize } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { Event } from "@store";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 4);
  const until = new Date(now.getFullYear(), now.getMonth() + 4);

  const events = await fetchEvents({
    page: 0,
    from: from.toISOString(),
    until: until.toISOString(),
    normalizeRss: true,
    maxResults: 2500,
    filterByDate: false,
  });

  if (!Array.isArray(events)) {
    console.error("Error: events is not an array", events);
    return {
      props: {},
    };
  }

  const normalizedEvents = JSON.parse(JSON.stringify(events)) as Event[];

  const fields: ISitemapField[] = normalizedEvents
    ?.filter((event) => !event.isAd)
    .map((data) => {
      const field: ISitemapField & { "image:image"?: string } = {
        loc: `${siteUrl}/e/${data.slug}`,
        lastmod: new Date().toISOString(),
        changefreq: "daily",
        priority: 0.7,
      };

      const defaultImage = `${siteUrl}/static/images/logo-seo-meta.webp`;
      const image = data.imageUploaded || data.eventImage || defaultImage;

      if (image) {
        field["image:image"] = `
          <image:loc>${image}</image:loc>
          <image:title>${sanitize(data.title)}</image:title>
        `;
      }

      return field;
    });

  return getServerSideSitemapLegacy(ctx, fields);
};

// Default export to prevent next.js errors
export default function Sitemap() {
  return null;
}
