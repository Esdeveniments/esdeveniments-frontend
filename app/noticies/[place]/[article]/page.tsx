// No headers/nonce needed with relaxed CSP
import { Suspense } from "react";
import type { Metadata } from "next";
import { getNewsBySlug } from "@lib/api/news";
import type { NewsDetailResponseDTO } from "types/api/news";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { siteUrl } from "@config/index";
import { buildPageMeta } from "@components/partials/seo-meta";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import NewsArticleDetail from "@components/noticies/NewsArticleDetail";
import NewsArticleSkeleton from "@components/noticies/NewsArticleSkeleton";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}): Promise<Metadata> {
  const { place, article } = await params;
  const t = await getTranslations("App.NewsArticleFallback");
  let detail: NewsDetailResponseDTO | null = null;
  try {
    detail = await getNewsBySlug(article);
  } catch (error) {
    console.error("generateMetadata: Error fetching news detail", error);
    captureException(error);
  }
  const placeType = await getPlaceTypeAndLabelCached(place);
  const locale = resolveLocaleFromHeaders(await headers());
  if (detail) {
    const base = buildPageMeta({
      title: `${detail.title} | ${placeType.label}`,
      description: detail.description,
      canonical: `${siteUrl}/noticies/${place}/${article}`,
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
    canonical: `${siteUrl}/noticies/${place}/${article}`,
    locale,
  }) as unknown as Metadata;
}

export default async function Page({
  params,
}: {
  params: Promise<{ place: string; article: string }>;
}) {
  const { place, article } = await params;
  
  // Start fetches immediately
  const detailPromise = getNewsBySlug(article);
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
