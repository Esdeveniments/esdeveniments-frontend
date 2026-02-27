import Image from "@components/ui/common/image";
import ViewCounter from "@components/ui/viewCounter";
import { getTranslations } from "next-intl/server";
import type { CardHorizontalServerProps } from "types/common";
import CardLink from "@components/ui/common/cardContent/CardLink";
import { getLocaleSafely } from "@utils/i18n-seo";
import FavoriteButtonOverlay from "@components/ui/common/favoriteButton/FavoriteButtonOverlay";
import CategoryBadge from "@components/ui/common/cardContent/CategoryBadge";
import { MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import { prepareCardContentData } from "@components/ui/common/cardContent/prepareCardContentData";

const CardHorizontalServer = async ({
  event,
  isPriority = false,
  initialIsFavorite,
}: CardHorizontalServerProps) => {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const tCategories = await getTranslations({ locale, namespace: "Config.Categories" });

  const {
    title,
    primaryLocation,
    cardDate,
    timeDisplay,
    favoriteLabels,
    shouldShowFavoriteButton,
    categoryLabel,
  } = prepareCardContentData({
    event,
    variant: "carousel",
    locale,
    tCard,
    tTime,
    tCategories,
  });

  const isFavorite = Boolean(event.slug && initialIsFavorite);

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

      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <Image
          className="w-full h-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          title={event.title}
          alt={event.title}
          image={event.imageUrl}
          priority={isPriority}
          location={event.city?.name}
          region={event.region?.name}
          date={cardDate}
          context="list"
          cacheKey={event.hash || event.updatedAt}
        />

        <CategoryBadge label={categoryLabel} size="sm" />

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

      <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 pointer-events-none">
        <p className="text-xs text-muted-foreground mb-1 truncate">
          {cardDate}
          {timeDisplay && <> · {timeDisplay}</>}
        </p>

        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground-strong mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-foreground/60 min-w-0">
            <LocationMarkerIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{primaryLocation}</span>
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
