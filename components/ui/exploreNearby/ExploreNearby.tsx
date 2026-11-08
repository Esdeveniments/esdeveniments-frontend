import { fetchRegionsWithCities } from "@lib/api/regions";
import {
  formatPlaceName,
  formatPlacePreposition,
  sanitize,
} from "@utils/string-helpers";
import Badge from "@components/ui/common/badge";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { ExploreNearbyProps } from "types/props";
import type { PlaceType } from "types/common";

/** Maximum place links to show (avoid visual overload + HTML bloat). */
const MAX_LINKS = 12;

/**
 * Server component that renders "Explore Nearby" links for SEO cross-linking.
 *
 * - For towns: shows parent region + sibling cities in the same region
 * - For regions: shows child cities
 * - For "catalunya": shows all regions
 *
 * All data comes dynamically from `fetchRegionsWithCities()` (cached 24h in-memory).
 * No hardcoded arrays — fully API-driven.
 */
export default async function ExploreNearby({
  place,
  placeType,
}: ExploreNearbyProps) {
  const regionsWithCities = await fetchRegionsWithCities();

  if (regionsWithCities.length === 0) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.ExploreNearby",
  });
  const linkAria = (label: string, type: PlaceType) => {
    const placeIn = formatPlacePreposition(label, type, locale, false);
    return t("linkAria", { placeIn });
  };

  // Catalunya → show all regions
  if (place === "catalunya") {
    const regionLinks = regionsWithCities
      .slice(0, MAX_LINKS)
      .map((r) => ({
        slug: r.slug ?? sanitize(r.name),
        label: formatPlaceName(r.name),
      }));

    if (regionLinks.length === 0) return null;

    return (
      <section
        className="container border-t border-border/40 py-section-y"
        aria-label={t("sectionAriaLabel")}
      >
        <h2 className="body-normal font-medium text-muted-foreground mb-element-gap-sm">
          {t("regionsTitle")}
        </h2>
        <nav aria-label={t("regionsAriaLabel")}>
          <ul className="flex flex-wrap gap-element-gap-sm">
            {regionLinks.map((r) => (
              <li key={r.slug}>
                <Badge
                  href={`/${r.slug}`}
                  ariaLabel={linkAria(r.label, "region")}
                  data-analytics-event-name="explore_nearby_click"
                  data-analytics-place-slug={r.slug}
                  data-analytics-context="explore_nearby_regions"
                >
                  {r.label}
                </Badge>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    );
  }

  // Region → show child cities
  if (placeType === "region") {
    const region = regionsWithCities.find(
      (r) => (r.slug ?? sanitize(r.name)) === place,
    );

    if (!region || region.cities.length === 0) return null;

    const seenCities = new Set<string>();
    const cityLinks = region.cities
      .reduce<{ slug: string; label: string }[]>((acc, c) => {
        if (!seenCities.has(c.value)) {
          seenCities.add(c.value);
          acc.push({ slug: c.value, label: formatPlaceName(c.label) });
        }
        return acc;
      }, [])
      .slice(0, MAX_LINKS);

    return (
      <section
        className="container border-t border-border/40 py-section-y"
        aria-label={t("sectionAriaLabel")}
      >
        <h2 className="body-normal font-medium text-muted-foreground mb-element-gap-sm">
          {t("citiesTitle", {
            placeOf: formatPlacePreposition(
              formatPlaceName(region.name),
              "region",
              locale,
              false,
              "of"
            ),
          })}
        </h2>
        <nav aria-label={t("citiesAriaLabel")}>
          <ul className="flex flex-wrap gap-element-gap-sm">
            {cityLinks.map((c) => (
              <li key={c.slug}>
                <Badge
                  href={`/${c.slug}`}
                  ariaLabel={linkAria(c.label, "town")}
                  data-analytics-event-name="explore_nearby_click"
                  data-analytics-place-slug={c.slug}
                  data-analytics-context="explore_nearby_cities"
                >
                  {c.label}
                </Badge>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    );
  }

  // Town → show parent region + sibling cities in one compact section
  if (placeType === "town") {
    let parentRegion: { slug: string; label: string; type: PlaceType } | null =
      null;
    let siblingCities: { slug: string; label: string }[] = [];

    for (const region of regionsWithCities) {
      const city = region.cities.find((c) => c.value === place);
      if (city) {
        parentRegion = {
          slug: region.slug ?? sanitize(region.name),
          label: formatPlaceName(region.name),
          type: "region",
        };
        const seenSiblings = new Set<string>();
        siblingCities = region.cities
          .filter((c) => c.value !== place)
          .reduce<{ slug: string; label: string }[]>((acc, c) => {
            if (!seenSiblings.has(c.value)) {
              seenSiblings.add(c.value);
              acc.push({ slug: c.value, label: formatPlaceName(c.label) });
            }
            return acc;
          }, [])
          .slice(0, MAX_LINKS - 1);
        break;
      }
    }

    if (!parentRegion && siblingCities.length === 0) return null;

    // Combine region + siblings into a single badge list for a cleaner UI
    const allLinks = [
      ...(parentRegion ? [parentRegion] : []),
      ...siblingCities.map((c) => ({ ...c, type: "town" as const })),
    ];
    const regionWeekend = parentRegion
      ? {
          href: `/${parentRegion.slug}/cap-de-setmana`,
          label: t("regionWeekend", {
            placeIn: formatPlacePreposition(
              parentRegion.label,
              "region",
              locale,
              false,
            ),
          }),
        }
      : null;

    return (
      <section
        className="container border-t border-border/40 py-section-y"
        aria-label={t("sectionAriaLabel")}
      >
        <h2 className="body-normal font-medium text-muted-foreground mb-element-gap-sm">
          {t("nearbyTitle")}
        </h2>
        <nav aria-label={t("nearbyAriaLabel")}>
          <ul className="flex flex-wrap gap-element-gap-sm">
            {allLinks.map((link) => (
              <li key={link.slug}>
                <Badge
                  href={`/${link.slug}`}
                  ariaLabel={linkAria(link.label, link.type)}
                  data-analytics-event-name="explore_nearby_click"
                  data-analytics-place-slug={link.slug}
                  data-analytics-context="explore_nearby_siblings"
                >
                  {link.label}
                </Badge>
              </li>
            ))}
            {regionWeekend && (
              <li>
                <Badge
                  href={regionWeekend.href}
                  data-analytics-event-name="explore_nearby_click"
                  data-analytics-place-slug={parentRegion?.slug}
                  data-analytics-context="explore_nearby_region_weekend"
                >
                  {regionWeekend.label}
                </Badge>
              </li>
            )}
          </ul>
        </nav>
      </section>
    );
  }

  return null;
}
