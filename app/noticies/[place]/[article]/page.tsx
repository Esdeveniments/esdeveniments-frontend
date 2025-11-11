// No headers/nonce needed with relaxed CSP
import type { Metadata } from "next";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { getNewsBySlug } from "@lib/api/news";
import type { NewsDetailResponseDTO } from "types/api/news";
import type { NewsEventsSectionProps } from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import { buildPageMeta } from "@components/partials/seo-meta";
import ViewCounter from "@components/ui/viewCounter";
import AdArticle from "@components/ui/adArticle";
import NewsHeroEvent from "@components/ui/newsHeroEvent";
import NewsRichCard from "@components/ui/newsRichCard";
import { getFormattedDate } from "@utils/date-helpers";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}): Promise<Metadata> {
  const { place, article } = await params;
  const detail: NewsDetailResponseDTO | null = await getNewsBySlug(article);
  const placeType = await getPlaceTypeAndLabelCached(place);
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
  const [detail, placeType] = await Promise.all([
    getNewsBySlug(article),
    getPlaceTypeAndLabelCached(place),
  ]);

  if (!detail) {
    // Let Next handle 404
    const { notFound } = await import("next/navigation");
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
    <div className="min-h-screen bg-background mt-4">
      {/* Breadcrumbs */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav
            className="text-sm text-foreground-strong/70"
            aria-label="Breadcrumb"
          >
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

      <script
        id="news-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        id="news-webpage-breadcrumbs"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema).replace(/</g, "\\u003c"),
        }}
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
