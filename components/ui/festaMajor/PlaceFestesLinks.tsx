import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import Badge from "@components/ui/common/badge";
import { fetchFestaMajorPage } from "@lib/api/festes-majors";
import { fetchSeasonalFestivities } from "@lib/api/festivities";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { festaMajorPath } from "@utils/festa-major-paths";
import { seasonalFestivityLinks } from "@utils/festivity";
import { getLocaleSafely } from "@utils/i18n-seo";
import { formatPlacePhrases } from "@utils/string-helpers";
import type { PlaceFestesLinksProps } from "types/props";

/**
 * On a listing page: the place's festa major hub (only when it is indexable),
 * the festes majors calendar and the festivity pages in season (Nadal from
 * November to Reis, Carnaval from mid-January), when indexable.
 */
export default async function PlaceFestesLinks({
  place,
  placeType,
  placeLabel,
}: PlaceFestesLinksProps) {
  await connection();
  const hasHub = place !== "catalunya" && placeType !== "";
  // The calendar and seasonal links don't depend on the hub: keep them if it fails.
  const [locale, hub, seasonal] = await Promise.all([
    getLocaleSafely(),
    hasHub ? fetchFestaMajorPage(place).catch(() => null) : null,
    fetchSeasonalFestivities().catch(() => []),
  ]);
  const [t, tHub, tFestivity] = await Promise.all([
    getTranslations({ locale, namespace: "Components.PlaceFestesLinks" }),
    getTranslations({ locale, namespace: "Pages.FestaMajor" }),
    getTranslations({ locale, namespace: "Pages.Festivity" }),
  ]);
  const { placeOf } = formatPlacePhrases(placeLabel, placeType, locale);

  const links = [
    ...(hub?.indexable
      ? [
          {
            href: festaMajorPath(place),
            label: t(placeType === "region" ? "region" : "town", { placeOf }),
            event: "festa_major_hub_click",
          },
        ]
      : []),
    {
      href: `/${FESTES_MAJORS_SEGMENT}`,
      label: tHub("allFestes"),
      event: "festa_major_hub_click",
    },
    ...seasonalFestivityLinks(seasonal, (type) =>
      tFestivity(`types.${type.messageKey}.name`),
    ).map((link) => ({ ...link, event: "festivity_hub_click" })),
  ];

  return (
    <section
      className="container border-t border-border/40 py-section-y"
      aria-label={t("title")}
    >
      <h2 className="body-normal font-medium text-muted-foreground mb-element-gap-sm">
        {t("title")}
      </h2>
      <ul className="flex flex-wrap gap-element-gap-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Badge
              href={link.href}
              data-analytics-event-name={link.event}
              data-analytics-context="place_page"
            >
              {link.label}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
