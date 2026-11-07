import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import type { PlaceTypeAndLabel, RouteSearchParams } from "types/common";
import NewsListPage from "@components/noticies/NewsListPage";
import { buildNewsListMetadata } from "@components/noticies/newsListMetadata";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { parseNewsPage } from "@utils/news-helpers";
import { formatPlacePreposition } from "@utils/string-helpers";

const getPlace = (place: string): Promise<PlaceTypeAndLabel> =>
  getPlaceTypeAndLabelCached(place).catch(() => ({ type: "", label: place }));

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/noticies/[place]">): Promise<Metadata> {
  const [{ place }, locale, query] = await Promise.all([
    params,
    rootLocale() as Promise<AppLocale>,
    searchParams as Promise<RouteSearchParams>,
  ]);
  const [{ type, label: placeLabel }, t] = await Promise.all([
    getPlace(place),
    getTranslations({ locale, namespace: "App.NewsPlace" }),
  ]);
  const placeIn = formatPlacePreposition(placeLabel, type, locale, false);
  const meta = await buildNewsListMetadata({
    title: t("metaTitle", { placeIn }),
    description: t("metaDescription", { placeIn }),
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
  const [{ type, label: placeLabel }, t] = await Promise.all([
    getPlace(place),
    getTranslations({ locale, namespace: "App.NewsPlace" }),
  ]);
  const placeIn = formatPlacePreposition(placeLabel, type, locale, false);
  const placeOf = formatPlacePreposition(placeLabel, type, locale, false, "of");

  return (
    <NewsListPage
      place={place}
      placeLabel={placeLabel}
      placeType={type}
      title={t("heading", { placeOf })}
      subtitle={t("metaDescription", { placeIn })}
      page={parseNewsPage(query)}
      cta={
        <PressableAnchor
          href={`/${place}`}
          className="btn-outline btn-sm shrink-0 mb-element-gap md:mb-0"
          variant="plain"
        >
          {t("seeAgenda", { placeOf })}
        </PressableAnchor>
      }
    />
  );
}
