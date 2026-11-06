import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import type { RouteSearchParams } from "types/common";
import NewsListPage from "@components/noticies/NewsListPage";
import { buildNewsListMetadata } from "@components/noticies/newsListMetadata";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { parseNewsPage } from "@utils/news-helpers";

export async function generateMetadata({
  searchParams,
}: PageProps<"/[locale]/noticies">): Promise<Metadata> {
  const [locale, query] = await Promise.all([
    rootLocale() as Promise<AppLocale>,
    searchParams as Promise<RouteSearchParams>,
  ]);
  const t = await getTranslations({ locale, namespace: "App.News" });
  return buildNewsListMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    page: parseNewsPage(query),
    locale,
  });
}

export default async function Page({
  searchParams,
}: PageProps<"/[locale]/noticies">) {
  const [locale, query, catalunya] = await Promise.all([
    rootLocale() as Promise<AppLocale>,
    searchParams as Promise<RouteSearchParams>,
    getPlaceTypeAndLabelCached("catalunya"),
  ]);
  const t = await getTranslations({ locale, namespace: "App.News" });

  return (
    <NewsListPage
      placeLabel={catalunya.label}
      title={t("heading")}
      subtitle={t("intro")}
      page={parseNewsPage(query)}
    />
  );
}
