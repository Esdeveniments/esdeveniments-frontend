import { LocationMarkerIcon as LocationIcon } from "@heroicons/react/outline";
import {
  buildDisplayLocation,
  buildEventLocationLabels,
} from "@utils/location-helpers";
import { EventLocationProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import EventLocationClient from "./EventLocationClient";

export default function EventLocation({
  location,
  cityName,
  regionName,
  citySlug,
  regionSlug,
}: EventLocationProps) {
  const cityHref = citySlug ? `/${citySlug}` : null;
  const regionHref = regionSlug ? `/${regionSlug}` : null;
  const showPlaceLinks = Boolean(cityHref || regionHref);
  const {
    cityLabel,
    regionLabel,
    primaryLabel,
    secondaryLabel,
  } = buildEventLocationLabels({
    cityName,
    regionName,
    location,
    secondaryPreference: "region",
  });
  const displayLocation = buildDisplayLocation({
    location,
    cityName: cityLabel,
    regionName: regionLabel,
    hidePlaceSegments: showPlaceLinks,
  });

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap pr-section-x min-w-0">
        <SectionHeading
          Icon={LocationIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title="Ubicació"
          titleClassName="heading-2"
        />
        <div className="w-full flex flex-col justify-center items-center gap-element-gap px-section-x">
          <div className="w-full flex flex-col justify-center items-start gap-element-gap">
            {primaryLabel && (
              <div className="w-full flex flex-col justify-start items-start gap-0.5">
                <p className="heading-4 text-foreground-strong">
                  {primaryLabel}
                </p>
                {secondaryLabel && (
                  <p className="body-normal text-foreground/70">
                    {secondaryLabel}
                  </p>
                )}
              </div>
            )}
            <div className="w-full flex flex-col justify-start items-start gap-1">
              <p className="body-normal text-foreground-strong">
                {displayLocation}
              </p>
              {showPlaceLinks && (
                <div className="flex flex-wrap items-center gap-element-gap-sm pt-1">
                  {cityHref && (
                    <PressableAnchor
                      href={cityHref}
                      className="body-small font-semibold text-primary hover:text-primary-dark inline-flex items-center"
                      variant="inline"
                    >
                      {cityLabel}
                    </PressableAnchor>
                  )}
                  {cityHref && regionHref && (
                    <span className="text-foreground/40">|</span>
                  )}
                  {regionHref && (
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
