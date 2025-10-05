import { headers } from "next/headers";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { fetchNewsBySlug } from "@lib/api/news";
import type { NewsDetailResponseDTO } from "types/api/news";
import type { NewsEventsSectionProps } from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import { buildPageMeta } from "@components/partials/seo-meta";
import { ViewCounter, AdArticle, Card, Text } from "@components/ui/primitives";
import NewsHeroEvent from "components/ui/domain/newsHeroEvent";
import { getFormattedDate } from "@utils/date-helpers";
import { getPlaceTypeAndLabel } from "@utils/helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}): Promise<Metadata> {
  const { place, article } = await params;
  const detail: NewsDetailResponseDTO | null = await fetchNewsBySlug(article);
  const placeType = await getPlaceTypeAndLabel(place);
  if (detail) {
    const base = buildPageMeta({
      title: `${detail.title} | ${placeType.label}`,
      description: detail.description,
      canonical: `${siteUrl}/noticies/${place}/${article}`,
      image: detail.events?.[0]?.imageUrl,
    }) as unknown as Metadata;
    const augmented: Metadata = {
      ...base,
      openGraph: {
        ...(base.openGraph || {}),
        type: "article",
        ...(detail.createdAt && { publishedTime: detail.createdAt }),
        ...(detail.createdAt && { modifiedTime: detail.createdAt }),
      },
    };
    return augmented;
  }
  return buildPageMeta({
    title: `Notícia | ${placeType.label}`,
    description: `Detall de la notícia`,
    canonical: `${siteUrl}/noticies/${place}/${article}`,
  }) as unknown as Metadata;
}

export default async function Page({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}) {
  const { place, article } = await params;
  const [detail, placeType, headersList] = await Promise.all([
    fetchNewsBySlug(article),
    getPlaceTypeAndLabel(place),
    headers(),
  ]);

  if (!detail) {
    // Let Next handle 404
    const { notFound } = await import("next/navigation");
    return notFound();
  }

  const nonce = headersList.get("x-nonce") || "";
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
        .filter(Boolean),
    ),
  ).slice(0, 10);
  const locationKeywords = Array.from(
    new Set((detail.events || []).map((e) => e.location).filter(Boolean)),
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
    { name: place, url: `${siteUrl}/noticies/${place}` },
    { name: detail.title, url: `${siteUrl}/noticies/${place}/${article}` },
  ];
  const webPageSchema = generateWebPageSchema({
    title: detail.title,
    description: detail.description,
    url: `${siteUrl}/noticies/${place}/${article}`,
    breadcrumbs,
  });

  return (
    <div className="mt-component-md min-h-screen bg-whiteCorp">
      {/* Breadcrumbs */}
      <div className="border-b border-bColor bg-whiteCorp">
        <div className="mx-auto max-w-7xl px-component-md py-component-md sm:px-component-lg lg:px-component-xl">
          <nav className="text-blackCorp/70" aria-label="Breadcrumb">
            <Link href="/" className="hover:underline">
              Inici
            </Link>{" "}
            /{" "}
            <Link href="/noticies" className="hover:underline">
              Notícies
            </Link>{" "}
            /{" "}
            <Link href={`/noticies/${place}`} className="hover:underline">
              {placeType.label}
            </Link>{" "}
            /{" "}
            <Text variant="body-sm" className="font-medium text-blackCorp">
              {detail.title}
            </Text>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-component-md py-component-2xl sm:px-component-lg lg:px-component-xl">
        <div className="mb-component-lg">
          <Text
            as="h1"
            variant="h1"
            className="mb-component-lg font-bold uppercase leading-tight"
          >
            {detail.title}
          </Text>
          <div className="mb-component-lg flex flex-col items-start justify-between text-blackCorp/70 md:flex-row md:items-center">
            <div className="flex items-center gap-component-md">
              <Text
                variant="body-sm"
                className="whitespace-nowrap rounded-full bg-primary px-component-md py-component-xs font-medium uppercase text-whiteCorp"
              >
                {detail.type === "WEEKEND" ? "Cap de setmana" : "Setmana"}{" "}
                {dateRangeText}
              </Text>
            </div>
            <div className="md:mt-xs mt-component-md flex items-center gap-component-md">
              <Text variant="body-sm">{detail.readingTime} min lectura</Text>
              <ViewCounter visits={detail.visits} hideText={false} />
            </div>
          </div>
          {plainDescription && (
            <Text
              as="p"
              variant="body-lg"
              className="leading-relaxed text-blackCorp/80"
            >
              {plainDescription}
            </Text>
          )}
        </div>

        <div className="my-component-xs">
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

      <Script
        id="news-article-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="news-webpage-breadcrumbs"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
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
    <section className="mb-4xl">
      <div className="mb-component-xl">
        <Text as="h2" variant="h1" className="mb-component-sm">
          {title}
        </Text>
        <div className="h-1.5 w-20 rounded-full bg-primary"></div>
      </div>

      {showHero && heroEvent && (
        <div className="mb-component-2xl">
          <NewsHeroEvent event={heroEvent} />
        </div>
      )}

      {showNumbered ? (
        <div className="space-y-8">
          {(showHero ? otherEvents : events).map((event, index) => (
            <div key={event.id} className="flex items-start gap-component-lg">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-whiteCorp">
                <Text variant="body-sm">
                  {showHero ? index + 2 : index + 1}
                </Text>
              </div>
              <div className="flex-1">
                <Card type="news-rich" event={event} variant="horizontal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-component-xl md:grid-cols-2 lg:grid-cols-3">
          {(showHero ? otherEvents : events).map((event) => (
            <Card key={event.id} type="news-rich" event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
