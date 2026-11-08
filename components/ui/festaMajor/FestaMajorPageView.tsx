import JsonLdServer from "@components/partials/JsonLdServer";
import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapBreadcrumb from "@components/ui/sitemap/SitemapBreadcrumb";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import Image from "@components/ui/common/image";
import ImagePreload from "@components/ui/common/image/ImagePreload";
import FestaMajorFestaList from "@components/ui/festaMajor/FestaMajorFestaList";
import FestaMajorLinkList from "@components/ui/festaMajor/FestaMajorLinkList";
import FestaMajorProgramme from "@components/ui/festaMajor/FestaMajorProgramme";
import FestaMajorTownList from "@components/ui/festaMajor/FestaMajorTownList";
import FestaMajorPreviousYear from "@components/ui/festaMajor/FestaMajorPreviousYear";
import {
  buildFestaMajorSchemas,
  getFestaMajorCopy,
} from "@lib/seo/festa-major";
import { formatShortDateRange } from "@utils/date-helpers";
import { formatPlacePhrases } from "@utils/string-helpers";
import { mainEdition } from "@utils/festa-major";
import { festaMajorPath } from "@utils/festa-major-paths";
import {
  FESTA_MAJOR_PROGRAMME_ID,
  FESTES_MAJORS_SEGMENT,
} from "@utils/constants";
import type { FestaMajorPageViewProps } from "types/props";

/** The body of /festa-major/<place> (town or region). */
export default async function FestaMajorPageView({
  data,
  locale,
}: FestaMajorPageViewProps) {
  const { t, title, metaDescription, breadcrumbs, placeOf } =
    await getFestaMajorCopy(data, locale);
  const { place, currentYear, today, region, town: shown } = data;
  const ownFestaLabel = t("ownFesta", { placeOf });
  const { collection, itemList } = buildFestaMajorSchemas({
    data,
    locale,
    title,
    description: metaDescription,
    breadcrumbs,
  });

  // The hub gives its main festa's dates.
  const main = shown ? mainEdition(shown.editions) : null;
  const dates = main ? formatShortDateRange(main.start, main.end, locale) : "";
  // The first act with an image (often the festa's poster) is the page's LCP.
  const cover = [...(main?.acts ?? []), ...(shown?.announced ?? [])].find(
    (act) => act.imageUrl,
  );
  const regionPhrases = place.regionLabel
    ? formatPlacePhrases(place.regionLabel, "region", locale)
    : null;

  const links = [
    { href: `/${place.slug}`, label: t("townAgenda", { placeOf }) },
    ...(place.regionSlug && regionPhrases
      ? [
          {
            href: festaMajorPath(place.regionSlug),
            label: t("regionHub", regionPhrases),
          },
        ]
      : []),
    { href: `/${FESTES_MAJORS_SEGMENT}`, label: t("allFestes") },
  ];

  return (
    <>
      <JsonLdServer id="festa-major-collection" data={collection} />
      {itemList && <JsonLdServer id="festa-major-itemlist" data={itemList} />}
      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />
        <header className="stack gap-2 text-center">
          <h1 className="heading-2">{title}</h1>
          {region && (
            <p className="body-normal text-foreground/80">
              {region.towns.length > 0
                ? t("regionIntro", { count: region.towns.length })
                : t("regionEmpty", { placeOf })}
            </p>
          )}
          {shown && shown.acts.length > 0 && (
            <p className="body-normal text-foreground/80">
              {t("intro", { count: shown.acts.length })}
              {dates && ` ${t("introDates", { dates })}`}
            </p>
          )}
          {shown && !shown.isCurrentYear && (
            <p className="body-small text-muted-foreground">
              {t("previousYearNotice", { currentYear, year: shown.year })}
            </p>
          )}
        </header>

        {cover?.imageUrl && (
          <>
            <ImagePreload image={cover.imageUrl} context="featured" />
            <div className="relative w-full max-w-2xl mx-auto aspect-[3/2] overflow-hidden rounded-card bg-muted">
              <Image
                image={cover.imageUrl}
                title={cover.title}
                priority
                context="featured"
                className="w-full h-full"
              />
            </div>
          </>
        )}

        {!data.available && (
          <p className="body-normal text-center">{t("unavailable")}</p>
        )}
        {shown && shown.acts.length === 0 && (
          <p className="body-normal text-center">{t("empty", { placeOf })}</p>
        )}

        {shown && shown.announced.length > 0 && (
          <FestaMajorProgramme
            title={t("announcedTitle", { year: currentYear })}
            editions={[
              {
                key: "",
                label: null,
                start: shown.announced[0].startDate,
                end: shown.announced[shown.announced.length - 1].startDate,
                acts: shown.announced,
              },
            ]}
            locale={locale}
            today={today}
            ownFestaLabel={ownFestaLabel}
          />
        )}

        {place.type === "town" && (
          <SponsorBannerSlot
            place={place.slug}
            fallbackPlaces={[
              ...(place.regionSlug ? [place.regionSlug] : []),
              "catalunya",
            ]}
          />
        )}

        {region && region.towns.length > 0 && (
          <FestaMajorTownList
            towns={region.towns}
            locale={locale}
            headingLevel="h2"
          />
        )}

        <FestaMajorFestaList
          festes={data.festes}
          townSlug={place.slug}
          currentYear={currentYear}
          locale={locale}
          title={t("festesTitle", { placeOf })}
          ownFestaLabel={ownFestaLabel}
        />

        {shown && shown.editions.length > 0 && (
          <FestaMajorProgramme
            id={FESTA_MAJOR_PROGRAMME_ID}
            title={t("programmeTitle")}
            editions={shown.editions}
            locale={locale}
            today={shown.isCurrentYear ? today : ""}
            ownFestaLabel={ownFestaLabel}
          />
        )}

        {shown && shown.previousEditions.length > 0 && (
          <FestaMajorPreviousYear
            title={t("previousTitle", { year: currentYear - 1 })}
            linkLabel={t("previousLink")}
            editions={shown.previousEditions}
            townSlug={place.slug}
            year={currentYear - 1}
            locale={locale}
            ownFestaLabel={ownFestaLabel}
          />
        )}

        <FestaMajorLinkList title={t("moreTitle")} links={links} />
      </SitemapLayout>
    </>
  );
}
