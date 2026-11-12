import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import {
  buildEventLocationLabels,
  buildDisplayLocation,
  buildDirectionsUrl,
  isVagueLocation,
} from "@utils/location-helpers";
import { EventLocationProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import EventLocationClient from "./EventLocationClient";
import { useLocale, useTranslations } from "next-intl";
import { getProfileDisplayName } from "@utils/profile-name";
import { formatNameOf } from "@utils/string-helpers";
import type { AppLocale } from "types/i18n";

// Same text-link look as the byline: the page's red is kept for its main action.
const PLACE_LINK_CLASS = "hover:text-foreground-strong hover:underline";

/** Same layout in the main column (mobile) and the sidebar (desktop). */
export default function EventLocation({
  location,
  cityName,
  regionName,
  citySlug,
  regionSlug,
  profile,
  venueCoords,
  compact = false,
}: EventLocationProps) {
  const t = useTranslations("Components.EventLocation");
  const locale = useLocale() as AppLocale;
  const cityHref = citySlug ? `/${citySlug}` : null;
  const regionHref = regionSlug ? `/${regionSlug}` : null;
  const showPlaceLinks = Boolean(cityHref || regionHref);
  const { cityLabel, regionLabel } = buildEventLocationLabels({
    cityName,
    regionName,
    location,
    secondaryPreference: "region",
  });

  const placeParts = { location, cityName: cityLabel, regionName: regionLabel };
  // City and region are links below, so the address line shows only the venue.
  const fullLocation = buildDisplayLocation({
    ...placeParts,
    hidePlaceSegments: showPlaceLinks,
  });
  // "Online" or "Diversos espais" have no single place to route to or map.
  const isPreciseVenue = Boolean(venueCoords) || !isVagueLocation(location);
  const directionsUrl = isPreciseVenue
    ? buildDirectionsUrl(buildDisplayLocation(placeParts), venueCoords)
    : null;

  const profileNameOf = profile
    ? formatNameOf(getProfileDisplayName(profile), locale)
    : "";

  return (
    <section
      id={compact ? undefined : "event-location"}
      className="w-full stack min-w-0"
      aria-labelledby={compact ? "event-location-heading-aside" : "event-location-heading"}
    >
      {compact ? (
        <h2 id="event-location-heading-aside" className="heading-4">
          {t("title")}
        </h2>
      ) : (
        <SectionHeading
          headingId="event-location-heading"
          title={t("title")}
          titleClassName="heading-2"
        />
      )}
      <div className="stack">
        {(fullLocation || showPlaceLinks) && (
          <div className="flex flex-col">
            {fullLocation && (
              <p className="body-normal font-semibold text-foreground-strong break-words">
                {fullLocation}
              </p>
            )}
            {showPlaceLinks && (
              <p className="body-small text-muted-foreground">
                {cityHref && cityLabel && (
                  <PressableAnchor href={cityHref} className={PLACE_LINK_CLASS} variant="inline">
                    {cityLabel}
                  </PressableAnchor>
                )}
                {cityHref && regionHref && cityLabel && regionLabel && (
                  <span aria-hidden="true"> · </span>
                )}
                {regionHref && regionLabel && (
                  <PressableAnchor href={regionHref} className={PLACE_LINK_CLASS} variant="inline">
                    {regionLabel}
                  </PressableAnchor>
                )}
              </p>
            )}
          </div>
        )}
        {isPreciseVenue && (
          <EventLocationClient
            location={location}
            cityName={cityLabel}
            regionName={regionLabel}
            coords={venueCoords}
          >
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-neutral btn-sm"
                data-analytics-link-type="maps_directions"
                data-analytics-context="event_location"
              >
                {t("getDirections")}
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </EventLocationClient>
        )}
        {profile && (
          <PressableAnchor
            href={`/perfil/${encodeURIComponent(profile.username)}`}
            className="body-small font-semibold text-foreground-strong hover:underline"
            variant="inline"
          >
            {t("profileLink", { nameOf: profileNameOf })}
          </PressableAnchor>
        )}
      </div>
    </section>
  );
}
