import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { siteUrl } from "@config/index";
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  buildPageMeta,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import SitemapLayout from "@components/ui/sitemap/SitemapLayout";
import SitemapBreadcrumb from "@components/ui/sitemap/SitemapBreadcrumb";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import FestaMajorLinkList from "@components/ui/festaMajor/FestaMajorLinkList";
import FestaMajorTownList from "@components/ui/festaMajor/FestaMajorTownList";
import { FESTIVITY_TYPES } from "@config/festivities";
import { fetchFestaMajorCalendar } from "@lib/api/festes-majors";
import { madridTodayYmd } from "@lib/dates";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { listRegions, upcomingTowns } from "@utils/festa-major-calendar";
import { festaMajorPath } from "@utils/festa-major-paths";
import { festivityPath } from "@utils/festivity";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";

const UPCOMING_DAYS = 14;
const PATH = `/${FESTES_MAJORS_SEGMENT}`;

/** fetchFestaMajorCalendar awaits connection(), so the year is safe to read. */
async function loadCalendar() {
  const calendar = await fetchFestaMajorCalendar();
  const today = madridTodayYmd();
  return { calendar, today, year: Number(today.slice(0, 4)) };
}

export async function generateMetadata() {
  const locale = (await rootLocale()) as AppLocale;
  const [t, { calendar, year }] = await Promise.all([
    getTranslations({ locale, namespace: "Pages.FestesMajors" }),
    loadCalendar(),
  ]);
  return buildPageMeta({
    title: t("metaTitle", { year }),
    description: t("metaDescription", { year }),
    canonical: `${siteUrl}${PATH}`,
    locale,
    robotsOverride:
      calendar && calendar.towns.length === 0 ? "noindex, follow" : undefined,
  });
}

export default async function Page() {
  const locale = (await rootLocale()) as AppLocale;
  const [t, tHub, tFestivity, { calendar, today, year }] = await Promise.all([
    getTranslations({ locale, namespace: "Pages.FestesMajors" }),
    getTranslations({ locale, namespace: "Pages.FestaMajor" }),
    getTranslations({ locale, namespace: "Pages.Festivity" }),
    loadCalendar(),
  ]);
  const title = t("title", { year });
  const towns = calendar?.towns ?? [];
  const upcoming = calendar
    ? upcomingTowns(calendar, today, UPCOMING_DAYS)
    : [];
  const regions = calendar ? listRegions(calendar) : [];
  const breadcrumbs = [
    { name: tHub("breadcrumbHome"), url: toLocalizedUrl("/", locale) },
    { name: tHub("breadcrumbAll"), url: toLocalizedUrl(PATH, locale) },
  ];
  const collection = generateCollectionPageSchema({
    title,
    description: t("metaDescription", { year }),
    url: toLocalizedUrl(PATH, locale),
    breadcrumbs,
    locale,
    numberOfItems: towns.length || undefined,
  });

  return (
    <>
      <JsonLdServer id="festes-majors-collection" data={collection} />
      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />
        <header className="stack gap-2 text-center">
          <h1 className="heading-2">{title}</h1>
          <p className="body-large text-foreground/80 max-w-2xl mx-auto">
            {t("lead")}
          </p>
          {towns.length > 0 && (
            <p className="body-small text-muted-foreground">
              {t("intro", { count: towns.length, year })}
            </p>
          )}
        </header>

        {!calendar && (
          <p className="body-normal text-center">{t("unavailable")}</p>
        )}
        {calendar && towns.length === 0 && (
          <p className="body-normal text-center">{t("empty")}</p>
        )}

        <SponsorBannerSlot place="catalunya" />

        {upcoming.length > 0 && (
          <section className="stack gap-4 w-full">
            <h2 className="heading-2">{t("nowTitle")}</h2>
            <FestaMajorTownList
              towns={upcoming}
              locale={locale}
              headingLevel="h3"
            />
          </section>
        )}

        {towns.length > 0 && (
          <FestaMajorTownList towns={towns} locale={locale} headingLevel="h2" />
        )}

        <FestaMajorLinkList
          title={t("regionsTitle")}
          links={regions.map((region) => ({
            href: festaMajorPath(region.slug),
            label: region.name,
          }))}
        />
        <FestaMajorLinkList
          title={t("nadalTitle")}
          links={FESTIVITY_TYPES.map((type) => ({
            href: festivityPath(type.slug),
            label: tFestivity(`types.${type.messageKey}.name`),
          }))}
        />
      </SitemapLayout>
    </>
  );
}
