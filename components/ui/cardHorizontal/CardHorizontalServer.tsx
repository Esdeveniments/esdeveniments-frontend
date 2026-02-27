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
import { MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";

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
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
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

        {/* Category badge */}
        {firstCategory && (
          <div className="absolute top-2 left-2 z-[2] pointer-events-none">
            <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
              {firstCategory.name}
            </span>
          </div>
        )}

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
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 pointer-events-none">
        {/* Date — muted */}
        <p className="text-xs text-muted-foreground mb-1 truncate">
          {eventDate}
          {timeDisplay && <> · {timeDisplay}</>}
        </p>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground-strong mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Location + views */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-foreground/60 min-w-0">
            <LocationMarkerIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {primaryLabel}
              {secondaryLabel && `, ${secondaryLabel}`}
            </span>
          </div>
          {event.visits > 0 && (
            <div className="flex-shrink-0 pointer-events-auto">
              <ViewCounter visits={event.visits} hideText />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default CardHorizontalServer;
