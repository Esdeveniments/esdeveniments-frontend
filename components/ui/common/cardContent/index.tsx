import { PendingLink } from "@components/ui/navigation/PendingLink";
import NextImage from "next/image";
import {
  ClockIcon,
  LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/outline";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { formatEventTimeDisplay } from "@utils/date-helpers";
import Image from "@components/ui/common/image";
import ViewCounterIsland from "@components/ui/viewCounter/ViewCounterIsland";
import MobileShareIsland from "./MobileShareIsland";
import DesktopShareIsland from "./DesktopShareIsland";
import { CardContentProps } from "types/props";

export default function CardContentServer({
  event,
  isPriority = false,
  isHorizontal = false,
}: CardContentProps) {
  const { description, icon } = event.weather || {};
  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const title = truncateString(event.title || "", isHorizontal ? 30 : 75);
  const location = truncateString(event.location || "", 45);
  const image = event.imageUrl || "";
  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <>
      <PendingLink
        href={`/e/${event.slug}`}
        className="w-full"
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
                location={location}
              />
            </div>
          </div>
          <div className="p-card-padding-sm flex justify-center items-center">
            <div
              className="w-full relative"
              style={{ height: isHorizontal ? "16rem" : "auto" }}
            >
              <Image
                className={`w-full flex justify-center ${
                  isHorizontal ? "h-64 object-cover" : "object-contain"
                }`}
                title={event.title}
                image={image}
                priority={isPriority}
                alt={event.title}
                context={isHorizontal ? "list" : "card"}
              />
            </div>
          </div>
        </div>
      </PendingLink>
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
            <span className="body-small max-w-full capitalize">{location}</span>
          </div>
        </div>
        <div className="flex justify-start items-center">
          <ClockIcon className="h-5 w-5" />
          <p className="body-small px-element-gap-sm">
            {formatEventTimeDisplay(event.startTime, event.endTime)}
          </p>
        </div>
        {!isHorizontal && <div className="mb-element-gap" />}
      </div>
    </>
  );
}
