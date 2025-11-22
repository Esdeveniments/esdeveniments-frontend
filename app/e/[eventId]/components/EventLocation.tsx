import { LocationMarkerIcon as LocationIcon } from "@heroicons/react/outline";
import { buildDisplayLocation } from "@utils/location-helpers";
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
  const displayLocation = buildDisplayLocation({
    location,
    cityName,
    regionName,
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
                      {cityName}
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
                      {regionName}
                    </PressableAnchor>
                  )}
                </div>
              )}
            </div>
            <EventLocationClient
              location={location}
              cityName={cityName}
              regionName={regionName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
