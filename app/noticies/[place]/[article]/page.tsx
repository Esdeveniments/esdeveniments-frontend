// No headers/nonce needed with relaxed CSP
import { Suspense } from "react";
import type { Metadata } from "next";
import { getNewsBySlug } from "@lib/api/news";
import type { NewsDetailResponseDTO } from "types/api/news";
import { getTranslations } from "next-intl/server";
import { siteUrl } from "@config/index";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import NewsArticleDetail from "@components/noticies/NewsArticleDetail";
import NewsArticleSkeleton from "@components/noticies/NewsArticleSkeleton";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { permanentRedirect } from "next/navigation";

const reportNewsDetailError = (
  source: "generateMetadata" | "Page",
  error: unknown,
  context: { place: string; article: string }
) => {
  console.error(`${source}: Error fetching news detail`, error);
  captureException(error, {
    tags: {
      source,
      feature: "news-article",
      route: "noticies/[place]/[article]",
    },
    extra: {
      place: context.place,
      article: context.article,
    },
  });
};

const getCanonicalPlaceSlugFromDetail = (
  detail: NewsDetailResponseDTO | null,
  fallbackPlace: string
) => {
  const candidate = detail?.city?.slug || detail?.region?.slug;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : fallbackPlace;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}): Promise<Metadata> {
  const { place, article } = await params;
  let detail: NewsDetailResponseDTO | null = null;
  try {
    detail = await getNewsBySlug(article);
  } catch (error) {
    reportNewsDetailError("generateMetadata", error, { place, article });
  }
  const canonicalPlace = getCanonicalPlaceSlugFromDetail(detail, place);
  const placeType = await getPlaceTypeAndLabelCached(place);
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "App.NewsArticleFallback",
  });
  if (detail) {
    const base = buildPageMeta({
      title: `${detail.title} | ${placeType.label}`,
      description: detail.description,
      canonical: `${siteUrl}/noticies/${canonicalPlace}/${article}`,
      image: detail.events?.[0]?.imageUrl,
      locale,
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
    title: t("title", { place: placeType.label }),
    description: t("description"),
    canonical: `${siteUrl}/noticies/${canonicalPlace}/${article}`,
    locale,
  }) as unknown as Metadata;
}

export default async function Page({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}) {
  const { place, article } = await params;

  const locale = await getLocaleSafely();
  let detail: NewsDetailResponseDTO | null = null;
  try {
    detail = await getNewsBySlug(article);
  } catch (error) {
    reportNewsDetailError("Page", error, { place, article });
  }

  if (detail) {
    const canonicalPlace = getCanonicalPlaceSlugFromDetail(detail, place);
    if (canonicalPlace !== place) {
      permanentRedirect(
        withLocalePath(`/noticies/${canonicalPlace}/${article}`, locale)
      );
    }
  }

  // Wrap already-fetched data as a promise for the component API
  const detailPromise = Promise.resolve(detail);
  const placeTypePromise = getPlaceTypeAndLabelCached(place);

  return (
    <Suspense fallback={<NewsArticleSkeleton />}>
      <NewsArticleDetail
        detailPromise={detailPromise}
        placeTypePromise={placeTypePromise}
        place={place}
        article={article}
      />
    </Suspense>
  );
}
