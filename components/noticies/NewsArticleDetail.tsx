import DOMPurify from "isomorphic-dompurify";
import type {
  NewsEventsSectionProps,
  NewsArticleDetailProps,
} from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import ViewCounter from "@components/ui/viewCounter";
import AdArticle from "@components/ui/adArticle";
import NewsHeroEvent from "@components/ui/newsHeroEvent";
import NewsRichCard from "@components/ui/newsRichCard";
import { getFormattedDate } from "@utils/date-helpers";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { notFound } from "next/navigation";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";

export default async function NewsArticleDetail({
  detailPromise,
  placeTypePromise,
  place,
  article,
}: NewsArticleDetailProps) {
  const [detailResult, placeTypeResult] = await Promise.allSettled([
    detailPromise,
    placeTypePromise,
  ]);

  const detail =
    detailResult.status === "fulfilled" ? detailResult.value : null;
  if (detailResult.status === "rejected") {
    console.error(
      "NewsArticleDetail: Error fetching article detail",
      detailResult.reason
    );
    captureException(detailResult.reason);
  }

  let placeType =
    placeTypeResult.status === "fulfilled" ? placeTypeResult.value : null;
  if (placeTypeResult.status === "rejected") {
    console.error(
      "NewsArticleDetail: Error fetching place label",
      placeTypeResult.reason
    );
    captureException(placeTypeResult.reason);
  }

  if (!placeType) {
    try {
      placeType = await getPlaceTypeAndLabelCached(place);
    } catch (error) {
      console.error(
        "NewsArticleDetail: Unable to resolve place label fallback",
        error
      );
      captureException(error);
      placeType = { label: place };
    }
  }

  if (!detail) {
    return notFound();
  }

  const plainDescription = DOMPurify.sanitize(detail.description || "", {
    ALLOWED_TAGS: [],
  });
  const dateRangeText = (() => {
    const f = getFormattedDate(detail.startDate, detail.endDate);
    return f.formattedEnd
      ? `${f.formattedStart} – ${f.formattedEnd}`
      : f.formattedStart;
  })();

  // Build keywords from available data (categories and locations)
  const categoryKeywords = Array.from(
    new Set(
      (detail.events || [])
        .flatMap((e) => e.categories?.map((c) => c.name) || [])
        .filter(Boolean)
    )
  ).slice(0, 10);
  const locationKeywords = Array.from(
    new Set((detail.events || []).map((e) => e.location).filter(Boolean))
  ).slice(0, 5);
  const keywords = [
    ...categoryKeywords,
    ...locationKeywords,
    placeType.label,
  ].filter(Boolean);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: detail.title,
    description: detail.description,
    datePublished: detail.createdAt,
    dateModified: detail.createdAt,
    image: detail.events?.[0]?.imageUrl,
    inLanguage: "ca",
    isAccessibleForFree: true,
    articleSection: detail.type,
    ...(keywords.length > 0 ? { keywords } : {}),
    publisher: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    author: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    url: `${siteUrl}/noticies/${place}/${article}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/noticies/${place}/${article}`,
    },
  };

  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Notícies", url: `${siteUrl}/noticies` },
    { name: placeType.label, url: `${siteUrl}/noticies/${place}` },
    { name: detail.title, url: `${siteUrl}/noticies/${place}/${article}` },
  ];
  const webPageSchema = generateWebPageSchema({
    title: detail.title,
    description: detail.description,
    url: `${siteUrl}/noticies/${place}/${article}`,
    breadcrumbs,
  });

  return (
    <div className="min-h-screen bg-background mt-4">
      {/* Breadcrumbs */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav
            className="text-sm text-foreground-strong/70"
            aria-label="Breadcrumb"
          >
            <PressableAnchor
              href="/"
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              Inici
            </PressableAnchor>{" "}
            /{" "}
            <PressableAnchor
              href="/noticies"
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              Notícies
            </PressableAnchor>{" "}
            /{" "}
            <PressableAnchor
              href={`/noticies/${place}`}
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              {placeType.label}
            </PressableAnchor>{" "}
            /{" "}
            <span className="text-foreground-strong font-medium">
              {detail.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="heading-1 mb-6">{detail.title}</h1>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 text-sm text-foreground-strong/70">
            <div className="flex items-center gap-4">
              <span className="bg-primary text-background px-4 py-2 rounded-full font-medium uppercase whitespace-nowrap">
                {detail.type === "WEEKEND" ? "Cap de setmana" : "Setmana"}{" "}
                {dateRangeText}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span>{detail.readingTime} min lectura</span>
              <ViewCounter visits={detail.visits} hideText={false} />
            </div>
          </div>
          {plainDescription && (
            <p className="body-large text-foreground-strong/80">
              {plainDescription}
            </p>
          )}
        </div>

        <div className="my-2">
          <AdArticle slot="news_in_article" isDisplay={false} />
        </div>

        {detail.events && detail.events.length > 0 && (
          <EventsSection
            title="ELS IMPRESCINDIBLES"
            events={detail.events.slice(0, Math.min(detail.events.length, 3))}
            showHero={true}
            showNumbered={true}
          />
        )}

        {detail.events && detail.events.length > 3 && (
          <EventsSection
            title="MÉS PROPOSTES"
            events={detail.events.slice(3)}
          />
        )}
      </div>

      <JsonLdServer id="news-article-schema" data={articleSchema} />
      <JsonLdServer id="news-webpage-breadcrumbs" data={webPageSchema} />
    </div>
  );
}

function EventsSection({
  title,
  events,
  showHero = false,
  showNumbered = false,
}: NewsEventsSectionProps) {
  const [heroEvent, ...otherEvents] = events;

  return (
    <section className="mb-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground-strong mb-3 md:text-4xl">
          {title}
        </h2>
        <div className="w-20 h-1.5 bg-primary rounded-full"></div>
      </div>

      {showHero && heroEvent && (
        <div className="mb-12">
          <NewsHeroEvent event={heroEvent} />
        </div>
      )}

      {showNumbered ? (
        <div className="space-y-8">
          {(showHero ? otherEvents : events).map((event, index) => (
            <div key={event.id} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                {showHero ? index + 2 : index + 1}
              </div>
              <div className="flex-1">
                <NewsRichCard event={event} variant="horizontal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {(showHero ? otherEvents : events).map((event) => (
            <NewsRichCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
