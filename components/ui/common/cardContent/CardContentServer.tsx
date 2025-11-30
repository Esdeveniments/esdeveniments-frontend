import NextImage from "next/image";
import {
  ClockIcon,
  LocationMarkerIcon,
  CalendarIcon,
} from "@heroicons/react/outline";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { formatEventTimeDisplayDetail } from "@utils/date-helpers";
import ImageServer from "@components/ui/common/image/ImageServer";
import CardLink from "./CardLink";
import { CardContentProps } from "types/props";

function CardContentServer({
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
      <CardLink href={`/e/${event.slug}`} className="w-full">
        <div className="w-full flex flex-col justify-center bg-background overflow-hidden cursor-pointer">
          {/* Title and Weather Icon */}
          <div className="bg-background h-fit flex justify-start items-start gap-2 pr-4">
            <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
              <div className="w-2 h-6 bg-gradient-to-r from-primary to-primary-dark"></div>
            </div>
            <h3 className="w-full uppercase">{title}</h3>
            <div className="flex items-end gap-2">
              {icon && (
                <div className="flex items-center gap-1">
                  <NextImage
                    alt={description || "Weather icon"}
                    src={icon}
                    width="30"
                    height="30"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                    priority={isPriority}
                  />
                </div>
              )}
            </div>
          </div>
          {/* ImageEvent */}
          <div className="p-2 flex justify-center items-center">
            <div
              className="w-full relative"
              style={{ height: isHorizontal ? "16rem" : "auto" }}
            >
              <ImageServer
                className={`w-full flex justify-center ${
                  isHorizontal ? "h-64 object-cover" : "object-contain"
                }`}
                title={event.title}
                image={image}
                priority={isPriority}
                alt={event.title}
                location={event.city?.name || event.location}
                region={event.region?.name || event.city?.name}
                date={eventDate}
              />
            </div>
          </div>
        </div>
      </CardLink>
      <div className="w-full flex flex-col px-4 gap-3">
        <div className="flex justify-start items-start">
          <CalendarIcon className="h-5 w-5" />
          <p className="px-2 font-semibold">{eventDate}</p>
        </div>
        {/* Location */}
        <div className="flex justify-start items-start">
          <LocationMarkerIcon className="h-5 w-5" />
          <div className="h-full flex flex-col justify-start items-start px-2">
            <span className="max-w-full">{location}</span>
          </div>
        </div>
        {/* Date time */}
        <div className="flex justify-start items-center">
          <ClockIcon className="h-5 w-5" />
          <p className="px-2">
            {formatEventTimeDisplayDetail(event.startTime, event.endTime)}
          </p>
        </div>
        {!isHorizontal && <div className="mb-8" />}
      </div>
    </>
  );
}

export default CardContentServer;
