import { MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
const LocationIcon = LocationMarkerIcon;
import {
  buildEventLocationLabels,
  buildDisplayLocation,
} from "@utils/location-helpers";
import { EventLocationProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import EventLocationClient from "./EventLocationClient";
import { useTranslations } from "next-intl";

export default function EventLocation({
  location,
  cityName,
  regionName,
  citySlug,
  regionSlug,
  compact = false,
}: EventLocationProps) {
  const t = useTranslations("Components.EventLocation");
  const cityHref = citySlug ? `/${citySlug}` : null;
  const regionHref = regionSlug ? `/${regionSlug}` : null;
  const showPlaceLinks = Boolean(cityHref || regionHref);
  const {
    cityLabel,
    regionLabel,
  } = buildEventLocationLabels({
    cityName,
    regionName,
    location,
    secondaryPreference: "region",
  });

  // Build full location string: location, city, region
  const fullLocation = buildDisplayLocation({
    location,
    cityName: cityLabel,
    regionName: regionLabel,
    hidePlaceSegments: showPlaceLinks, // Hide city/region from the string if we show them as links below
  });

  if (compact) {
    return (
      <div className="w-full flex flex-col gap-2">
        {fullLocation && (
          <div className="flex items-start gap-2">
            <LocationIcon className="h-4 w-4 text-foreground-strong flex-shrink-0 mt-0.5" />
            <p className="body-normal text-foreground">{fullLocation}</p>
          </div>
        )}
        {/* Inline map for sidebar */}
        <EventLocationClient
          location={location}
          cityName={cityLabel}
          regionName={regionLabel}
          compact
        />
        {/* Clickable city and region links */}
        {showPlaceLinks && (
          <div className="flex flex-wrap items-center gap-element-gap-sm">
            {cityHref && cityLabel && (
              <PressableAnchor
                href={cityHref}
                className="body-small font-semibold text-primary hover:text-primary-dark inline-flex items-center"
                variant="inline"
              >
                {cityLabel}
              </PressableAnchor>
            )}
            {cityHref && regionHref && cityLabel && regionLabel && (
              <span className="text-foreground/40">|</span>
            )}
            {regionHref && regionLabel && (
              <PressableAnchor
                href={regionHref}
                className="body-small font-semibold text-primary hover:text-primary-dark inline-flex items-center"
                variant="inline"
              >
                {regionLabel}
              </PressableAnchor>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap pr-section-x min-w-0">
        <SectionHeading
          Icon={LocationIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("title")}
          titleClassName="heading-2"
        />
        <div className="w-full flex flex-col justify-center items-center gap-element-gap px-section-x">
          <div className="w-full flex flex-col justify-center items-start gap-element-gap">
            {/* Show full location: location, city, region */}
            {fullLocation && (
              <div className="w-full flex flex-col justify-start items-start gap-0.5">
                <p className="body-normal text-foreground">
                  {fullLocation}
                </p>
              </div>
            )}
            {/* Clickable city and region links */}
            {showPlaceLinks && (
              <div className="flex flex-wrap items-center gap-element-gap-sm">
                {cityHref && cityLabel && (
                  <PressableAnchor
                    href={cityHref}
                    className="body-small font-semibold text-primary hover:text-primary-dark inline-flex items-center"
                    variant="inline"
                  >
                    {cityLabel}
                  </PressableAnchor>
                )}
                {cityHref && regionHref && cityLabel && regionLabel && (
                  <span className="text-foreground/40">|</span>
                )}
                {regionHref && regionLabel && (
                  <PressableAnchor
                    href={regionHref}
                    className="body-small font-semibold text-primary hover:text-primary-dark inline-flex items-center"
                    variant="inline"
                  >
                    {regionLabel}
                  </PressableAnchor>
                )}
              </div>
            )}
            <EventLocationClient
              location={location}
              cityName={cityLabel}
              regionName={regionLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
