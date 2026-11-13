import { locale as rootLocale } from "next/root-params";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  generateCollectionPageSchema,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import EventCardList from "@components/ui/card/EventCardList";
import CardImagePreload from "@components/ui/common/image/CardImagePreload";
import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapBreadcrumb from "@components/ui/sitemap/SitemapBreadcrumb";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import FestaMajorLinkList from "@components/ui/festaMajor/FestaMajorLinkList";
import FestivityActList from "@components/ui/festivity/FestivityActList";
import { fetchFestivityPage } from "@lib/api/festivities";
import { getFestivityCopy } from "@lib/seo/festivity";
import { FESTIVITY_TYPES } from "@config/festivities";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { hasCardImage } from "@utils/event-helpers";
import { festivityPath, getFestivityType } from "@utils/festivity";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import type { FestivityPageViewProps } from "types/props";

/** The body of every festivity page (/fires-de-nadal, /carnaval, …). */
export default async function FestivityPageView({
  slug,
}: FestivityPageViewProps) {
  const locale = (await rootLocale()) as AppLocale;
  const data = await fetchFestivityPage(slug);
  const { t, tHub, path, title, lead, metaDescription, breadcrumbs } =
    await getFestivityCopy(data, locale);
  const { upcoming, past, pending, towns } = data;
  // Selects the season's wording ("el Nadal passat", "el Carnaval passat").
  const season = { type: getFestivityType(slug).messageKey };
  const pageUrl = toLocalizedUrl(path, locale);
  const collection = generateCollectionPageSchema({
    title,
    description: metaDescription,
    url: pageUrl,
    breadcrumbs,
    locale,
    numberOfItems: upcoming.length || undefined,
  });
  const itemList = generateItemListStructuredData(
    upcoming,
    title,
    metaDescription,
    locale,
    pageUrl,
  );
  const priorityIndex = upcoming.findIndex(hasCardImage);
  const isEmpty = upcoming.length + past.length + pending.length === 0;

  return (
    <>
      <CardImagePreload events={upcoming} />
      <JsonLdServer id="festivity-collection" data={collection} />
      {itemList && <JsonLdServer id="festivity-itemlist" data={itemList} />}
      <SitemapLayout testId="festivity-page">
        <SitemapBreadcrumb items={breadcrumbs} />
        <header className="stack gap-2 text-center">
          <h1 className="heading-2">{title}</h1>
          <p className="body-large text-foreground/80 max-w-2xl mx-auto">
            {lead}
          </p>
          {towns > 0 && (
            <p className="body-small text-muted-foreground">
              {t("intro", { count: towns })}
            </p>
          )}
        </header>

        {!data.available && (
          <p className="body-normal text-center">{t("unavailable")}</p>
        )}
        {data.available && isEmpty && (
          <p className="body-normal text-center">{t("empty", season)}</p>
        )}

        <SponsorBannerSlot place="catalunya" />

        {data.available && !isEmpty && (
          <section className="stack gap-4 w-full">
            <h2 className="heading-2">{t("upcomingTitle")}</h2>
            {upcoming.length > 0 ? (
              <EventCardList
                events={upcoming}
                priorityIndex={priorityIndex}
                headingLevel="h3"
              />
            ) : (
              <p className="body-normal text-foreground/80">
                {t("noUpcoming", season)}
              </p>
            )}
          </section>
        )}

        <FestivityActList
          title={t("pendingTitle")}
          intro={t("pendingIntro", season)}
          items={pending}
          locale={locale}
        />
        <FestivityActList
          title={t("pastTitle")}
          items={past}
          locale={locale}
          muted
        />

        <FestaMajorLinkList
          title={t("moreTitle")}
          links={[
            ...FESTIVITY_TYPES.filter((type) => type.slug !== slug).map(
              (type) => ({
                href: festivityPath(type.slug),
                label: t(`types.${type.messageKey}.name`),
              }),
            ),
            { href: `/${FESTES_MAJORS_SEGMENT}`, label: tHub("allFestes") },
            { href: "/catalunya", label: t("catalunyaAgenda") },
          ]}
        />
      </SitemapLayout>
    </>
  );
}
