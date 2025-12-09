import NextImage from "next/image";
import {
  ClockIcon,
  LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/outline";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import { buildDisplayLocation } from "@utils/location-helpers";
import Image from "@components/ui/common/image";
import ViewCounterIsland from "@components/ui/viewCounter/ViewCounterIsland";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
import CardLink from "./CardLink";
import { CardContentProps } from "types/props";
import { getTranslations } from "next-intl/server";

export default async function CardContentServer({
  event,
  isPriority = false,
  isHorizontal = false,
}: CardContentProps) {
  const tCard = await getTranslations("Components.CardContent");
  const tTime = await getTranslations("Utils.EventTime");
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };
  const { description, icon } = event.weather || {};
  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const title = truncateString(event.title || "", isHorizontal ? 30 : 75);
  // Show full location: location, city, region combined
  // Note: List API responses may not include city/region, so we check if they exist
  const cityName = event.city?.name;
  const regionName = event.region?.name;
  const fullLocation = buildDisplayLocation({
    location: event.location || "",
    cityName: cityName || "",
    regionName: regionName || "",
    hidePlaceSegments: false,
  });
  const primaryLocation = truncateString(fullLocation, 80);
  const image = event.imageUrl || "";
  const eventDate = formattedEnd
    ? tCard("dateRange", { start: formattedStart, end: formattedEnd })
    : tCard("dateSingle", { nameDay, start: formattedStart });

  return (
    <>
      <CardLink
        href={`/e/${event.slug}`}
        className="w-full pressable-card transition-card"
      >
        <div className="w-full flex flex-col justify-center bg-background overflow-hidden cursor-pointer">
          <div className="bg-background h-fit flex justify-start items-start gap-element-gap-sm pr-card-padding-sm">
            <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
              <div className="w-2 h-6 bg-gradient-to-r from-primary to-primary-dark" />
            </div>
            <h3 className="heading-4 w-full">{title}</h3>
            <div className="flex items-end gap-2">
              {icon && (
                <div className="flex items-center gap-1">
                  <NextImage
                    alt={description || "Weather icon"}
                    src={icon}
                    width={30}
                    height={30}
                    style={{ maxWidth: "100%", height: "auto" }}
                    priority={isPriority}
                  />
                </div>
              )}
              <MobileShareIsland
                title={event.title}
                slug={event.slug}
                eventDate={eventDate}
                location={primaryLocation}
              />
            </div>
          </div>
          <div className="p-card-padding-sm flex justify-center items-center">
            <div
              className="w-full relative"
              style={{
                height: isHorizontal ? "16rem" : "auto",
                viewTransitionName: `event-image-${event.id}`,
              }}
            >
              <Image
                className={`w-full flex justify-center ${isHorizontal ? "h-64 object-cover" : "object-contain"
                  }`}
                title={event.title}
                image={image}
                priority={isPriority}
                alt={event.title}
                context={isHorizontal ? "list" : "card"}
                cacheKey={event.hash || event.updatedAt}
              />
            </div>
          </div>
        </div>
      </CardLink>
      <div className="w-full flex justify-between items-center px-card-padding-sm mb-element-gap-sm">
        <DesktopShareIsland slug={event.slug} />
        <ViewCounterIsland
          visits={event.visits}
          priority={isPriority}
          hideText
          className="flex items-center justify-end"
        />
      </div>
      <div className="w-full flex flex-col px-card-padding-sm gap-element-gap">
        <div className="flex justify-start items-start">
          <CalendarIcon className="h-5 w-5" />
          <p className="body-small px-element-gap-sm font-semibold">{eventDate}</p>
        </div>
        <div className="flex justify-start items-start">
          <LocationMarkerIcon className="h-5 w-5" />
          <div className="h-full flex flex-col justify-start items-start px-element-gap-sm">
            <p className="body-small max-w-full capitalize">
              {primaryLocation}
            </p>
          </div>
        </div>
        <div className="flex justify-start items-center">
          <ClockIcon className="h-5 w-5" />
          <p className="body-small px-element-gap-sm">
            {formatEventTimeDisplayDetail(
              event.startTime,
              event.endTime,
              timeLabels
            )}
          </p>
        </div>
        {!isHorizontal && <div className="mb-element-gap" />}
      </div>
    </>
  );
}
