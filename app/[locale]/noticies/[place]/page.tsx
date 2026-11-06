import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import type { RouteSearchParams } from "types/common";
import NewsListPage from "@components/noticies/NewsListPage";
import { buildNewsListMetadata } from "@components/noticies/newsListMetadata";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { parseNewsPage } from "@utils/news-helpers";

const getPlaceLabel = (place: string) =>
  getPlaceTypeAndLabelCached(place)
    .then((value) => value.label)
    .catch(() => place);

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/noticies/[place]">): Promise<Metadata> {
  const [{ place }, locale, query] = await Promise.all([
    params,
    rootLocale() as Promise<AppLocale>,
    searchParams as Promise<RouteSearchParams>,
  ]);
  const [placeLabel, t] = await Promise.all([
    getPlaceLabel(place),
    getTranslations({ locale, namespace: "App.NewsPlace" }),
  ]);
  const meta = await buildNewsListMetadata({
    title: t("metaTitle", { place: placeLabel }),
    description: t("metaDescription", { place: placeLabel }),
    place,
    page: parseNewsPage(query),
    locale,
  });
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      types: {
        ...meta.alternates?.types,
        "application/rss+xml": [
          {
            url: `/noticies/${place}/rss.xml`,
            title: t("rssTitle", { place: placeLabel }),
          },
        ],
      },
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/[locale]/noticies/[place]">) {
  const [{ place }, locale, query] = await Promise.all([
    params,
    rootLocale() as Promise<AppLocale>,
    searchParams as Promise<RouteSearchParams>,
  ]);
  const [placeLabel, t] = await Promise.all([
    getPlaceLabel(place),
    getTranslations({ locale, namespace: "App.NewsPlace" }),
  ]);

  return (
    <NewsListPage
      place={place}
      placeLabel={placeLabel}
      title={t("heading", { place: placeLabel })}
      subtitle={t("metaDescription", { place: placeLabel })}
      page={parseNewsPage(query)}
      cta={
        <PressableAnchor
          href={`/${place}`}
          className="btn-outline btn-sm shrink-0 mb-element-gap md:mb-0"
          variant="plain"
        >
          {t("seeAgenda", { place: placeLabel })}
        </PressableAnchor>
      }
    />
  );
}
