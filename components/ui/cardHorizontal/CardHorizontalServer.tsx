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

  const firstCategory = event.categories?.[0];

  return (
    <article className="relative rounded-card overflow-hidden bg-background shadow-sm hover:shadow-md transition-all duration-normal group h-full flex flex-col">
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
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
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

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Category badge */}
        {firstCategory && (
          <div className="absolute top-2.5 left-2.5 z-[2] pointer-events-none">
            <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
              {firstCategory.name}
            </span>
          </div>
        )}

        {/* Favorite */}
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

        {/* Date overlay */}
        <div className="absolute bottom-2.5 left-2.5 z-[2] pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[11px] font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
            <CalendarIcon className="w-3 h-3" />
            {eventDate}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-3 pointer-events-none">
        {/* Title + view count */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="heading-4 line-clamp-2 flex-1 min-w-0 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex-shrink-0 pointer-events-auto">
            <ViewCounter visits={event.visits} hideText />
          </div>
        </div>

        {/* Metadata — pushed to bottom */}
        <div className="flex flex-col gap-1 mt-auto">
          <div className="flex items-center gap-1.5 body-small text-foreground/70">
            <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{timeDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5 body-small text-foreground/70">
            <LocationMarkerIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {primaryLabel}
              {secondaryLabel && `, ${secondaryLabel}`}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CardHorizontalServer;
