import ImageServer from "@components/ui/common/image/ImageServer";
import ViewCounter from "@components/ui/viewCounter";
import { truncateString, getFormattedDate } from "@utils/helpers";
import {
  formatEventTimeDisplay,
  formatEventTimeDisplayDetail,
} from "@utils/date-helpers";
import type { CardHorizontalServerProps } from "types/common";
import CardLink from "@components/ui/common/cardContent/CardLink";

const CardHorizontalServer: React.FC<CardHorizontalServerProps> = ({
  event,
  isPriority = false,
  useDetailTimeFormat = false,
}) => {
  const title = truncateString(event.title || "", 60);
  // const description = truncateString(event.description || "", 60);

  // Format the date
  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <CardLink
      href={`/e/${event.slug}`}
      className="block group relative h-full pressable-card transition-card"
    >
      <article className="w-full h-full bg-background overflow-hidden cursor-pointer rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200 relative z-10 flex flex-col">
        {/* Image */}
        <div className="w-full h-48 overflow-hidden">
          <ImageServer
            className="w-full h-full"
            title={event.title}
            alt={event.title}
            image={event.imageUrl}
            priority={isPriority}
            location={event.city?.name}
            region={event.region?.name}
            date={eventDate}
            context="list"
          />
        </div>

        {/* Content */}
        <div className="py-2 flex-1 flex flex-col justify-between">
          {/* Title and ViewCounter */}
          <div>
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary-dark flex-shrink-0"></div>
                <h3 className="heading-4 text-foreground-strong line-clamp-2 flex-1 group-hover:underline transition-all duration-200">
                  {title}
                </h3>
              </div>
              <div className="flex-shrink-0">
                <ViewCounter visits={event.visits} hideText />
              </div>
            </div>
          </div>

          {/* Date and Location - Bottom Section */}
          <div>
            {/* Date */}
            <div className="flex items-center body-small text-foreground mb-2">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{eventDate}</span>
            </div>

            {/* Time */}
            <div className="flex items-center body-small text-foreground mb-2">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {useDetailTimeFormat
                  ? formatEventTimeDisplayDetail(event.startTime, event.endTime)
                  : formatEventTimeDisplay(event.startTime, event.endTime)}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center body-small text-foreground">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          {/* Description */}
          {/* {description && (
            <p className="text-sm text-foreground line-clamp-3">{description}</p>
          )} */}

          {/* Categories */}
          {/* {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {event.categories.slice(0, 3).map((category) => (
                <span
                  key={category.id}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )} */}
        </div>
      </article>
    </CardLink>
  );
};

export default CardHorizontalServer;
