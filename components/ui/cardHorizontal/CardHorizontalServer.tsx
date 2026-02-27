import Image from "@components/ui/common/image";
import ViewCounter from "@components/ui/viewCounter";
import { truncateString, getFormattedDate } from "@utils/helpers";
import { buildEventPlaceLabels } from "@utils/location-helpers";
import {
  formatEventTimeDisplay,
  formatEventTimeDisplayDetail,
} from "@utils/date-helpers";
import { getTranslations } from "next-intl/server";
import type { CardHorizontalServerProps } from "types/common";
import CardLink from "@components/ui/common/cardContent/CardLink";
import { getLocaleSafely } from "@utils/i18n-seo";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon as LocationMarkerIcon,
} from "@heroicons/react/24/outline";

const CardHorizontalServer = async ({
  event,
  isPriority = false,
  useDetailTimeFormat = false,
  initialIsFavorite,
}: CardHorizontalServerProps) => {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const timeLabels = {
    consult: tTime("consult"),
    startsAt: tTime("startsAt", { time: "{time}" }),
    range: tTime("range", { start: "{start}", end: "{end}" }),
    simpleRange: tTime("simpleRange", { start: "{start}", end: "{end}" }),
  };
  const title = truncateString(event.title || "", 60);

  const { primaryLabel, secondaryLabel } = buildEventPlaceLabels({
    cityName: event.city?.name,
    regionName: event.region?.name,
    location: event.location,
  });

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate,
    locale
  );
  const eventDate = formattedEnd
    ? tCard("dateRange", { start: formattedStart, end: formattedEnd })
    : tCard("dateSingle", { nameDay, start: formattedStart });

  const timeDisplay = useDetailTimeFormat
    ? formatEventTimeDisplayDetail(event.startTime, event.endTime, timeLabels)
    : formatEventTimeDisplay(event.startTime, event.endTime, timeLabels);

  const isFavorite = Boolean(event.slug && initialIsFavorite);
  const shouldShowFavoriteButton = Boolean(event.slug);
  const favoriteLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  return (
    <article className="relative card-bordered overflow-hidden group h-full flex flex-col">
      <CardLink
        href={`/e/${event.slug}`}
        className="absolute inset-0 z-[1]"
        aria-label={title}
        data-analytics-event-name="select_event"
        data-analytics-event-id={event.id ? String(event.id) : ""}
        data-analytics-event-slug={event.slug || ""}
      >
        <span className="sr-only">{title}</span>
      </CardLink>

      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        {shouldShowFavoriteButton && (
          <FavoriteButtonOverlay
            eventSlug={event.slug}
            eventId={event.id ? String(event.id) : undefined}
            eventTitle={event.title}
            initialIsFavorite={isFavorite}
            labels={favoriteLabels}
            wrapperClassName="pointer-events-auto z-[2]"
          />
        )}
        <Image
          className="w-full h-full object-cover"
          title={event.title}
          alt={event.title}
          image={event.imageUrl}
          priority={isPriority}
          location={event.city?.name}
          region={event.region?.name}
          date={eventDate}
          context="list"
          cacheKey={event.hash || event.updatedAt}
        />
      </div>

      {/* Content */}
      <div className="p-card-padding-sm flex-1 flex flex-col pointer-events-none">
        {/* Title with red accent */}
        <div className="flex items-start gap-2 mb-element-gap-sm">
          <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary-dark flex-shrink-0 mt-0.5 rounded-full" />
          <h3 className="heading-4 line-clamp-2 flex-1 min-w-0 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex-shrink-0 pointer-events-auto">
            <ViewCounter visits={event.visits} hideText />
          </div>
        </div>

        {/* Metadata — consolidated, pushed to bottom */}
        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center gap-2 body-small text-foreground">
            <CalendarIcon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
            <span className="truncate">{eventDate}</span>
          </div>
          <div className="flex items-center gap-2 body-small text-foreground">
            <ClockIcon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
            <span className="truncate">{timeDisplay}</span>
          </div>
          <div className="flex items-center gap-2 body-small text-foreground">
            <LocationMarkerIcon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate">{primaryLabel}</span>
              {secondaryLabel && (
                <span className="truncate text-muted-foreground">
                  {secondaryLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CardHorizontalServer;
